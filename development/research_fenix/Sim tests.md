# Protocol of the next Fenix inspection

Condition as of 13.09.2026: **not fulfilled**. All the results below are intentionally empty. This is a test plan, not a confirmation of failures.

First pass: A320 CFM. Do not automatically transfer the results to the A319/A321, IAE or other equipment. For each model/engine set, conduct a separate availability and results check. Additional wingtip/ACT/center feed configurations are needed where MMEL is changed.

For each inspection, write down:

Fenix version, MSFS, model, engine, wingtip, ACT, fuel system variant and known computer standards
- assessment id from `applicability_matrix.json`, number and full subparagraph of the FAA;
Exact name, category and path in the current EFB; snapshot of the menu before activation
the initial configuration of the aircraft and the absence of extraneous / accidental failures;
the result of activation of one failure: ECAM EWD, STATUS, SD and the actual loss of the desired function;
operability of systems that the selected sub-item requires to be serviceable;
- the position of the valve if the failure fixes it in its current position;
- compliance with the final state after the required (M)/(O), or the impossibility of its reproduction;
- withdrawal of failure and restoration of condition;
Bottom Line: Confirmed/failed/inadequate data, with observations and images.

Priority checks:

| Order | Object | What to install |
|---|---|---|
| 1 | Autobrake - 32-42-04 | AUTO/BRK is lost, normal braking remains. |
| 2 | Yellow electric pump - 29-25-01 | The failure of the pump without leakage and loss of the entire system. |
| 3 | CPC1, then CPC2 - 21-31-01 | Separate channels, saving the second CPC and manual mode. |
| 4 | AP1, then AP2 - 22-10-01 | FD and FMGC do not refuse along with a separate AP function. |
| 5 | FAC2, FCDC2, FWC2, SDAC2 - one each | Check the exact block number and consequences; No. 1 do not automatically allow. |
| 6 | One engine fire detection loop - 26-12-01 | Fails loop, fire does not occur, another loop remains operational. |
| 7 | One wing pump - 28-21-01 | The other three are serviceable; the circuit corresponds to the selected configuration. |
| 8 | One reverser inhibited - 78-30-01(1) | Reverse removed and not disclosed; no REV PRESSURIZED/UNLOCKED state. |
| 9 | Separate DUs - 31-63-01 | Check F/O PFDs, both ND, lower ECAM one by one; the remaining displays are saved. |
| 10 | SFCC2 flap/slat separately - 27-51-01 | Channel failure does not turn into a complete computer failure. |
| 11 | A/THR1 or A/THR2 - 22-30-01 | Determine whether the total A/THR function or only one redundant channel is lost. |
| 12 | Transfer valves / ACT at A321 | Get current names and differences from alpha A320; check open/closed and ACT number. |

Full PTU failure, Blue pump jammed crossbleed, real leaks and No. 1 blocks with dispatch relief only for No. 2 are not needed to positively verify listed dispatch relief provisions: a documentary discrepancy has already been established. If the current Fenix offers a separate automatic failure, it should be evaluated with a new line.

After single checks - check the combinations according to the exact conditions of MMEL. The coincidence of two workable single scenarios does not prove the admissibility of their combination.
