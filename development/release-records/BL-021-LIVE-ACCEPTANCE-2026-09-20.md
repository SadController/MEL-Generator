# BL-021 live MSFS/Fenix acceptance

- Date: 20 September 2026
- Application: MEL Generator 1.1.0 alpha 1, packaged `win-unpacked` build
- Simulator: Microsoft Flight Simulator 2024 1.8.16.0
- Aircraft: FenixA321 IAE WF SC

## Preconditions

The guarded SimConnect preflight confirmed that the loaded aircraft was stationary on
the ground, both engines were stopped and the parking brake was set. The Fenix Manual
Failures catalogue contained all 53 production mappings and every mapped item was clear.

## Activation result

The application displayed both readiness lights in green and generated two A321 cards:

- `M087` → `F_OH_FIRE_ENG2_LOOP_A`;
- `M260` → `F_ICE_PITOT_HEAT_CPT`.

The first Fenix item was activated before the application action to exercise the
idempotent path. Selecting **Activate failures** produced one `Already active` badge and
one `Activated` badge. The briefing displayed `All generated failures are active in
Fenix.` and the action changed to `Failures active`. A separate reload of the Fenix
Manual Failures catalogue confirmed `failed=true` for both items.

The harness restored both generated items to `failed=false` with no armed condition. A
second guarded preflight then confirmed that all 53 production mappings were clear.

## Error and recovery result

The test stopped only the packaged application's Integration Service. Both readiness
lights changed to the unavailable state. Hover text identified the stopped integration
service and instructed the user to reopen MEL Generator. A generation attempt displayed
`GENERATION_UNAVAILABLE` with a plain-English recovery action. The banner contained no
HRESULT, process exit detail, localhost address or local filesystem path.

After a normal application close and restart, both readiness lights returned to green,
the aircraft title was detected again and no error banner remained. The diagnostic log
contained the expected scenario and activation events, including both per-item statuses.

## Result

PASS. Live activation, independent readback, restoration, visible error handling and
restart recovery passed. Authenticode and installed older-to-newer update acceptance
remain dependent on the SignPath certificate and are outside this live simulator run.

Machine-readable evidence is stored beside this report:

- `BL-021-live-activation.json`;
- `BL-021-live-integration-error.json`;
- `BL-021-live-recovery.json`.
