# Fenix failure-activation feasibility experiment

Date: 19 September 2026  
Aircraft: Fenix A321 IAE WF SC  
Simulator: MSFS 2024  
Result: PASS for activation/restoration of all 53 mappings under the accepted Fenix
failure-manager verification rule.

## Production alpha integration test

After version 1.1.0 alpha 1 was implemented, the production `IntegrationController`,
out-of-process SimConnect helper and `FenixAdapter` were tested together against the
loaded `FenixA321 IAE WF SC`. Both header conditions resolved ready: SimConnect identified
the loaded aircraft and the adapter validated all 53 mapped IDs through the localhost
gateway.

The production controller activated `M198 — MCDU 1`, received and independently read
back `failed=true`, and then restored the record to `failed=false` with no armed
condition. Three pre-existing, unmapped Fenix records (`IR1 alignment`, `IR2 alignment`
and `IR3 alignment`) remained active and unchanged throughout the test.

The live run exposed that an immediate Fenix activation can temporarily return a
service-owned `failureCondition` with ID 3 while already reporting `failed=true`.
Activation acceptance therefore follows the approved rule and checks `failed=true`
without requiring the condition field to be null. Clearing is stricter: the adapter
waits, rereads and retries once if needed, and accepts restoration only when
`failed=false` and no armed condition remains. Evidence is recorded in
`alpha-live-integration-2026-09-19.json`; the repeatable harness is
`test_alpha_integration.cjs`.

## Complete catalogue API test

At 22:33–22:34 Moscow time on 19 September 2026, all 53 production catalogue records
were tested sequentially on the loaded `FenixA321 IAE WF SC`.

For every record the harness:

1. confirmed the aircraft remained on the ground, stationary, with both engines stopped
   and the parking brake set;
2. submitted `failed=true` for the mapped Fenix failure ID;
3. verified `failed=true` through a separate Manual Failures catalogue reload;
4. submitted `failed=false` in the restoration path;
5. verified the original clear state through another independent reload;
6. checked that no other mapped catalogue failure remained changed.

Result: **53 activation readbacks passed, 53 restorations passed, 0 failures.** An
independent final reload confirmed that none of the 53 mapped failures remained active.
The simulator state also remained stationary on the ground with the engines stopped and
parking brake set.

Files:

- `catalog-fenix-mapping.json` — complete 53-record mapping;
- `test_all_catalog_failures.py` — guarded repeatable harness;
- `all-failures-dry-run.json` — non-mutating preflight validation;
- `all-failures-api-test.json` — complete per-record responses and readbacks.

This proves that Fenix accepted and retained every mapped state long enough for an
independent readback from its own Manual Failures manager. By the product decision of
19 September 2026, this is sufficient verification for automatic Fenix activation;
separate empirical confirmation of cockpit indications or system consequences is not
required. MCDU 1 also received user-confirmed cockpit verification, but that additional
observation is not an acceptance gate for the remaining records.

## Proven operation

The local Fenix EFB exposes its Manual Failures state through the running Fenix gateway.
The EFB frontend uses `GET /fenix/failures/manual` to read the catalogue and
`POST /fenix/failures/saveManual` to update a failure record.

MEL Generator catalogue item `M198 — MCDU 1` was matched to Fenix failure ID
`F_MCDU_1`. Before the test, Fenix reported `failed=false` and no armed condition.
The aircraft was on the ground, stationary and both engines were stopped.

The test submitted the complete failure record with `failed=true`. The update response
and a separate reload of the Manual Failures catalogue both reported `failed=true`.
The user confirmed the resulting MCDU 1 failure in the aircraft.

The test then submitted `failed=false`. The response and a separate catalogue reload
both reported `failed=false`, completing restoration.

Evidence:

- `fenix-live-baseline-2026-09-19.json` in the parent integration-research directory;
- `manual-failures-before-mcdu1.json`;
- `mcdu1-activation.json`;
- `mcdu1-restoration.json`.

## Interpretation

This proves activation and restoration for one Fenix failure on the tested installation.
It also establishes a promising direct adapter route that is more stable than EFB screen
automation. It does not yet establish coverage of the other MEL Generator records,
compatibility across A319/A320/A321 and engine configurations, or a vendor-supported
public API contract. Treat the gateway route as version-bound until Fenix documents or
confirms it for external applications.

Every failure offered for automatic activation now has a verified Fenix ID, activation
response, independent failure-manager readback and restoration result on the tested
A321 configuration. Live testing of every possible multi-failure combination is not
required; combination testing should cover representative pairs/triples, known
constraints and failure/recovery behavior of the orchestration layer.
