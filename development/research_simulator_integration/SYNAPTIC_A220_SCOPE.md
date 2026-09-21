# Synaptic A220-300 — activation feasibility scope

Updated: 19 September 2026  
Backlog: BL-018; integration dependency: BL-001  
Status: Feasibility milestone complete on 19 September 2026. External VHF 1 deactivation and functional recovery confirmed by the user's cockpit observations; R C1 activation/restoration verified by telemetry. Standard COM STATUS does not reflect this condition, so automated verification is not established. See [test report](synaptic_a220/README.md).

## Objective and configuration

Prove that an external program can create one inoperative component state through
a documented switch or circuit breaker, verify the system effect and restore the
initial state. Testing all failures is not part of this milestone.

- Aircraft: **Synaptic A220-300 only**. Other aircraft variants are outside this work.
- Simulator: MSFS 2024 on the user's Windows PC.
- Installation: iniManager; user-reported version **1.0.7a**. Installed manifest checked on 19 September: **1.0.7**, without the suffix. Loaded TITLE: **A220-300**; simulator window version **1.8.16.0**.
- The user accepts control-based inoperative states provided the intended system effect is verified.
- One suitable reversible example is enough. Try additional candidates only if needed to find a workable example.

## Minimal experiment

1. Identify the loaded A220-300 and read the relevant initial state.
2. Select one documented external control and an independent indication of component operation.
3. Send the command and verify that the component actually becomes inoperative.
4. Restore the changed control and verify recovery.
5. Record the command, before/after observations, secondary effects and any access limitations.

Test while parked, with power and system configuration appropriate to the selected
component. Change only the selected controls; do not clear unrelated failures.
Stop if the connection is lost or the loaded aircraft changes.

A successful API response or changed circuit-breaker position alone is insufficient.
System parameters or independent cockpit indications can demonstrate the result.
The report must distinguish programmatic readings from manually observed indications.
A finished automated verification framework is not required.

## Out of scope for this experiment

- A complete A220 adapter, failure catalogue or exhaustive test campaign.
- MMEL/MEL collection, dispatch-relief assessment and MMEL item mapping.
- Random generation or simultaneous activation of multiple failures.
- Other aircraft variants, MSFS versions, installation channels or software builds.
- Production UI changes, installer packaging or a complete integration service.
- Comprehensive reconnect, regression and persistence testing.
- In-flight triggers, wear or maintenance simulation.
- Screen-coordinate/OCR automation, memory patching or aircraft-package modification.

SimConnect and a small external diagnostic program are the initial approach.
A custom WASM bridge is considered only if the selected operation demonstrably needs it.
The previously discussed application-managed helper process is a future integration
option; building that whole subsystem is not a prerequisite for this experiment.

## Completion criterion and interpretation

**External command → component becomes inoperative → independent evidence → restoration.**

One demonstrated chain establishes feasibility for that operation on the tested
installation. Switching a component off does not establish equivalence to every
internal failure of that component. Record precisely what was reproduced.

If a candidate cannot be controlled or verified, record that specific limitation;
one unsuccessful candidate does not prove every method impossible.

MMEL mapping and compatibility rules become necessary later, before adding the
tested state to the generator's operational catalogue. They do not block this proof
of the activation method.

## References

- Project task **Sol medium**: prior discussion of aircraft adapters.
- [Synaptic SimVars](https://docs.synapticsim.com/pilots/simvars), checked on 19 September 2026.
- [Synaptic Inputs](https://docs.synapticsim.com/pilots/inputs), checked on 19 September 2026.
- [Aircraft research matrix](AIRCRAFT_MATRIX.md).
- [Integration research](README.md).
- [Backlog](../backlog/README.md).
