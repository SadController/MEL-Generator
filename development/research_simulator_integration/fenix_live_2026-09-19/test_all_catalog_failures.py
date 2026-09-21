"""Sequential Fenix Manual Failures API activation/readback/restoration test."""
import argparse
import datetime as dt
import importlib.util
import json
from pathlib import Path
import time
import urllib.request


ROOT = Path(__file__).resolve().parents[3]
CATALOG_FILE = ROOT / "production" / "data" / "catalog.json"
MAPPING_FILE = Path(__file__).with_name("catalog-fenix-mapping.json")
SIM_PROBE = Path(__file__).parents[1] / "synaptic_a220" / "probe.py"
SAFE_FIELDS = [
    ("TITLE", "", True),
    ("SIM ON GROUND", "bool", False),
    ("GROUND VELOCITY", "knots", False),
    ("GENERAL ENG COMBUSTION:1", "bool", False),
    ("GENERAL ENG COMBUSTION:2", "bool", False),
    ("BRAKE PARKING POSITION", "bool", False),
]


def load_simconnect():
    spec = importlib.util.spec_from_file_location("mel_sim_probe", SIM_PROBE)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.SimConnect


def request_json(url, method="GET", body=None):
    data = None if body is None else json.dumps(body).encode("utf-8")
    request = urllib.request.Request(
        url, data=data, method=method,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))


def flatten(payload):
    result = {}
    for ata in payload["atas"]:
        for group in ata["groups"]:
            for failure in group["failures"]:
                item = dict(failure)
                item["ata"] = ata["id"]
                item["group"] = group["groupName"]
                result[item["id"]] = item
    return result


def stable_state(item):
    return {"failed": bool(item["failed"]), "failureCondition": item.get("failureCondition")}


def save(path, report):
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(report, indent=2), encoding="utf-8")
    temp.replace(path)


def check_safe(sim, expected_title):
    state = sim.read(SAFE_FIELDS)
    if state["TITLE"] != expected_title or not expected_title.startswith("Fenix"):
        raise RuntimeError(f"Loaded aircraft changed: {state['TITLE']!r}")
    if state["SIM ON GROUND"] != 1 or abs(state["GROUND VELOCITY"]) > 0.1:
        raise RuntimeError("Aircraft is not stationary on the ground")
    if state["GENERAL ENG COMBUSTION:1"] != 0 or state["GENERAL ENG COMBUSTION:2"] != 0:
        raise RuntimeError("An engine is running")
    if state["BRAKE PARKING POSITION"] != 1:
        raise RuntimeError("Parking brake is not set")
    return state


def payload(item, failed):
    return {
        "id": item["id"],
        "title": item["title"],
        "failureCondition": None,
        "failed": failed,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dll", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--base-url", default="http://127.0.0.1:8083/fenix")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--active-seconds", type=float, default=0.35)
    args = parser.parse_args()

    catalog = json.loads(CATALOG_FILE.read_text(encoding="utf-8"))["records"]
    records = {record["id"]: record for record in catalog}
    mapping = json.loads(MAPPING_FILE.read_text(encoding="utf-8"))
    if set(mapping) != set(records):
        raise RuntimeError("Mapping keys do not exactly match the production catalogue")
    if len(set(mapping.values())) != len(mapping):
        raise RuntimeError("Fenix IDs are not unique in the mapping")

    SimConnect = load_simconnect()
    sim = SimConnect(args.dll)
    output = Path(args.output)
    report = {
        "startedUtc": dt.datetime.now(dt.timezone.utc).isoformat(),
        "mode": "dry-run" if args.dry_run else "activation-readback-restoration",
        "catalogCount": len(records),
        "mapping": mapping,
        "results": [],
        "complete": False,
    }
    try:
        initial_state = sim.read(SAFE_FIELDS)
        expected_title = initial_state["TITLE"]
        report["aircraft"] = expected_title
        report["initialSimulatorState"] = check_safe(sim, expected_title)
        initial_payload = request_json(args.base_url + "/failures/manual")
        baseline = flatten(initial_payload)
        missing = sorted(set(mapping.values()) - set(baseline))
        if missing:
            raise RuntimeError(f"Mapped Fenix IDs missing: {missing}")
        unavailable = [fid for fid in mapping.values()
                       if baseline[fid]["failed"] or baseline[fid].get("failureCondition") is not None]
        if unavailable:
            raise RuntimeError(f"Mapped failures are not initially clear: {unavailable}")
        report["initialManualFailureState"] = {
            fid: stable_state(item) for fid, item in baseline.items()
        }
        save(output, report)

        if args.dry_run:
            report["complete"] = True
            report["finishedUtc"] = dt.datetime.now(dt.timezone.utc).isoformat()
            save(output, report)
            print(json.dumps({"dryRun": "passed", "aircraft": expected_title,
                              "mapped": len(mapping)}, indent=2), flush=True)
            return 0

        for index, record in enumerate(catalog, 1):
            catalog_id = record["id"]
            fenix_id = mapping[catalog_id]
            current = flatten(request_json(args.base_url + "/failures/manual"))
            if stable_state(current[fenix_id]) != stable_state(baseline[fenix_id]):
                raise RuntimeError(f"Unexpected initial state for {fenix_id}")
            check_safe(sim, expected_title)
            item = current[fenix_id]
            result = {
                "index": index,
                "catalogId": catalog_id,
                "catalogName": record["name"],
                "fenixId": fenix_id,
                "fenixTitle": item["title"],
                "activation": "pending",
                "restoration": "pending",
            }
            report["results"].append(result)
            save(output, report)
            attempted = False
            try:
                attempted = True
                activate_response = request_json(
                    args.base_url + "/failures/saveManual", "POST", payload(item, True)
                )
                time.sleep(args.active_seconds)
                active = flatten(request_json(args.base_url + "/failures/manual"))[fenix_id]
                result["activationResponse"] = activate_response
                result["activeReadback"] = active
                if activate_response.get("failed") is not True or active["failed"] is not True:
                    raise RuntimeError(f"Activation readback failed for {fenix_id}")
                result["activation"] = "verified"
            finally:
                if attempted:
                    check_safe(sim, expected_title)
                    restore_response = request_json(
                        args.base_url + "/failures/saveManual", "POST", payload(item, False)
                    )
                    time.sleep(args.active_seconds)
                    restored_all = flatten(request_json(args.base_url + "/failures/manual"))
                    restored = restored_all[fenix_id]
                    result["restorationResponse"] = restore_response
                    result["restoredReadback"] = restored
                    if (restore_response.get("failed") is not False
                            or stable_state(restored) != stable_state(baseline[fenix_id])):
                        result["restoration"] = "FAILED"
                        save(output, report)
                        raise RuntimeError(f"Restoration readback failed for {fenix_id}")
                    result["restoration"] = "verified"
                    collateral = [fid for fid in mapping.values()
                                  if stable_state(restored_all[fid]) != stable_state(baseline[fid])]
                    if collateral:
                        result["collateralChanges"] = collateral
                        save(output, report)
                        raise RuntimeError(f"Other Manual Failures changed: {collateral}")
                    save(output, report)
            print(f"[{index:02d}/{len(catalog)}] {catalog_id} {fenix_id}: PASS", flush=True)

        report["complete"] = True
        report["finishedUtc"] = dt.datetime.now(dt.timezone.utc).isoformat()
        report["summary"] = {"passed": len(report["results"]), "failed": 0}
        save(output, report)
        return 0
    except Exception as error:
        report["error"] = str(error)
        report["finishedUtc"] = dt.datetime.now(dt.timezone.utc).isoformat()
        save(output, report)
        print(json.dumps({"error": str(error), "completed": len(report["results"])}, indent=2), flush=True)
        return 1
    finally:
        sim.close()


if __name__ == "__main__":
    raise SystemExit(main())
