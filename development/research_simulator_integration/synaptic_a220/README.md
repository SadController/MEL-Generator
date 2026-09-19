# Synaptic A220-300 — local feasibility experiment

## Result, 19 September 2026

**PASS — bounded feasibility milestone complete. External VHF 1 deactivation and subsequent functional recovery are confirmed by the user's cockpit observations. Breaker activation and restoration are also verified by telemetry.**

At 12:14:49 Moscow time an external command set R C1 from 0 to 1 and left it
pulled for observation, as requested. The user confirmed that the aircraft showed
the same radio-inoperative indication as after manual operation. This establishes
the activation method for this one component and installation, with human verification.
It does not establish a built-in internal-fault API or an automated health check.

At 12:15:37 the probe restored only R C1 to its recorded initial value 0 and
verified readback. The user subsequently confirmed that the radio worked again
in response to the explicit cockpit recovery question. This is manual confirmation,
not an automated radio-health measurement.
The user's dome-light setting was left unchanged.

Evidence: `vhf1-user-observation-20260919T091449Z.json` and
`vhf1-restoration-20260919T091537Z.json`. The earlier automatic test logs remain
unchanged: their `passed=false` records the limitations of the COM STATUS check,
not the later user-confirmed cockpit result.

Initial automated tests ran on the user's parked aircraft, 12:01–12:04 Moscow time
(09:01–09:04 UTC); the user-observed activation/restoration followed at 12:14–12:15.
Loaded TITLE was `A220-300`; simulator window identified MSFS 2024 1.8.16.0.
The iniManager package manifest says `1.0.7`, minimum simulator `1.8.14`;
the user's `1.0.7a` suffix is not independently established by that manifest.
Engines were stopped, parking brake on, ground speed approximately zero, displays
and both MKPs powered. No aircraft package was modified; no bridge was installed.

## Initial automated observations (before user cockpit confirmation)

| Experiment | External command | Independent observation | Result |
|---|---|---|---|
| VHF 1 breaker R C1 | `L:A22X Circuit Breaker R C1`: 0 → 1 → 0 | `COM STATUS:1` remained 0 throughout 12 active samples over about 6 seconds; COM 2/3 also stayed 0 | Breaker variable control confirmed; radio loss of power NOT confirmed |
| Dome-light switch | `L:A22X Dome Lights`: 0 → 1 → 0 | `LIGHT POTENTIOMETER:18`: 0 → 100 → 0 percent | Switch affects the parameter driving the dome light |
| Dome-light breaker R B4, switch kept on | `L:A22X Circuit Breaker R B4`: 0 → 1 → 0 | `LIGHT POTENTIOMETER:18` stayed 100 percent during both open-breaker samples | Breaker variable control confirmed; light power loss NOT confirmed |

The dome test is a positive control for the external write route and system updates,
not a successful failure simulation. Ordinary switching off is not sufficient here
to establish that the component cannot operate when commanded on.

`COM TEST:1..3` returned 0 even before intervention, so it was not used as evidence
of failure or recovery. Standard COM variables may not represent all custom Synaptic
radio states. An unchanged reading does not prove the internal radio remained functional.
The lighting parameter drives lightdef.20 in the installed configuration; it is not a
visual measurement of the rendered light or a direct measurement of electrical current.

No changes were observed in the sampled caution/warning flags, DU1–3 backlight,
MKP power or other monitored controls. This is not an exhaustive secondary-effects check.

All three written controls were restored and checked again through a new read-only
connection at 09:04:01 UTC: R C1=0, R B4=0, dome switch=0, dome light output=0.
No running probe or active data subscription was left behind.

## Evidence files

- `baseline-2026-09-19.json`: initial read-only snapshot.
- `radio-baseline-2026-09-19.json`: radio monitoring baseline.
- `vhf1-test-2026-09-19.json`: baseline, 12 active and 10 recovery samples; `passed=false`.
- `dome-test-2026-09-19.json`: light-on, breaker-open, breaker-restored and original configuration stages; `passed=false`.
- `final-readonly-2026-09-19.json`: final independent connection/readback.
- `probe.py`: small Python/ctypes diagnostic, not production adapter code.

Native cockpit capture was attempted twice and failed with
`SetIsBorderRequired failed: Интерфейс не поддерживается (0x80004002)`.
There is no visual verification or user-reported cockpit observation in these results.

## Technical route and next bounded step

### Manual VHF 1 comparison, 12:10:41 Moscow time

The user reported manually pulling the VHF 1 breaker. A read-only snapshot
(`manual-vhf1-readonly-2026-09-19.json`, 09:10:41 UTC) confirmed
`L:A22X Circuit Breaker R C1=1`, while `COM STATUS:1=0` and
`COM TEST:1=0`. COM 2/3 statuses and caution/warning flags also remained 0.
The aircraft was still parked with engines stopped and brake set.
These monitored values match the earlier external-command active state.
Thus this telemetry does not distinguish manual and external breaker operation;
it still cannot establish whether the custom radio lost functionality. No cockpit
radio indication was observed. This comparison made no writes and intentionally
left the user's breaker pulled; it supersedes the earlier restored-state snapshot.

Used existing local SimConnect.dll from the installed ChasePlane module, loaded by
absolute path; the DLL was not copied or redistributed. This dependency must be
replaced with an appropriate SDK distribution arrangement before shipping an adapter.
Direct SimConnect `AddToDataDefinition` and `SetDataOnSimObject` suffice for the tested
LVars; no custom WASM module was required for these reads/writes.

The manual/external VHF 1 comparison has now been performed: the user reports the
same inoperative indication for both. Standard COM STATUS remained 0 and cannot
serve as a health check for this tested condition. The user has also confirmed
radio recovery after restoration, completing this bounded experiment. Future automated
verification needs a suitable Synaptic system indication. Other breakers and the
full catalogue remain outside the proven result.

## Running the diagnostic

Use 64-bit Python on Windows and supply a local compatible SimConnect DLL:

```powershell
python probe.py --dll 'C:\path\to\SimConnect.dll' --output baseline.json
```

Default mode only reads. `--test-vhf1` or `--test-dome` explicitly enables the named
experiment, with the aircraft parked, engines stopped and brake set. These modes
write only the three allowlisted controls described above, log initial states,
and attempt restoration in `finally`. They are supervised research tools: process
termination, disconnection or changing aircraft can prevent restoration. No automatic
reconnection/replay exists. TITLE checks are not a complete production identity guard.
Do not change controls during the short test. Exit 0 means read success or a passed
experiment; 1 means error; 2 means an experiment completed without proving its effect.
The original live runs preceded the exit-code refinement; their JSON `passed=false`
is the authoritative outcome, even though the process then returned 0.

## Sources and installed-file provenance

Official documentation accessed 19 September 2026:

- [Synaptic SimVars](https://docs.synapticsim.com/pilots/simvars): the exact writable controls and output names.
- [SimConnect AddToDataDefinition](https://docs.flightsimulator.com/msfs2024/html/6_Programming_APIs/SimConnect/API_Reference/Events_And_Data/SimConnect_AddToDataDefinition.htm): direct LVar access, FLOAT64.
- [SimConnect SetDataOnSimObject](https://docs.flightsimulator.com/html/Programming_Tools/SimConnect/API_Reference/Events_And_Data/SimConnect_SetDataOnSimObject.htm): write API.
- [COM status](https://docs.flightsimulator.com/msfs2024/html/6_Programming_APIs/SimVars/Aircraft_SimVars/Aircraft_RadioNavigation_Variables.htm): 0=OK, 2=no electricity, 3=failed.
- [Lighting SimVars](https://docs.flightsimulator.com/msfs2024/html/6_Programming_APIs/SimVars/Aircraft_SimVars/Aircraft_System_Variables.htm): LIGHT POTENTIOMETER.

Package root: `F:\SteamLibrary\steamapps\common\MSFS2024\Community\Community\synaptic-aircraft-a220`.
Read-only file evidence under that root:

- `manifest.json`, SHA256 `817AEF8A1405924455A2875AF00551DD96298331DF8AD70E63C4CEB1CB58E64D`.
- `SimObjects/Airplanes/Synaptic_A220/attachments/inibuilds/Asset_A220_Common/Synaptic/A220/Cockpit/Misc/Breakers.xml`: R C1 maps to `CB_COMM_VHF_1`; R B4 maps to `CB_LIGHTS_DOME`. SHA256 `9B41530E4A614584D1310FBAFC75415D0B88E0755368338D305F319EB2CB194F`.
- `SimObjects/Airplanes/Synaptic_A220/common/config/systems.cfg`: lightdef.20 dome uses potentiometer 18; custom electrical model, standard COM circuits on InfiniteBus. SHA256 `E05FC8748E66681C41CD5FF4B1D9510D3DD1F71006E271FA3976186537682F46`.
- Adjacent `Cockpit/Overhead/Lights.xml`: dome control is a latched LVar button.

SimConnect DLL path is recorded in each JSON, SHA256
`1B9DB770E95D1A883038F0F52898FCB1F34EADF659F7EC23BE9D0B50B47FA125`.

No MMEL applicability, dispatch relief, fault equivalence or production support is
established by this experiment.
