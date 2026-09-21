# Aircraft Pool and Failure-Activation Matrix

Research date: 18 September 2026.

## Purpose and decision boundary

This document defines the requested aircraft pool and the current technical route for
automatic failure activation. It is a research result, not an implementation promise.
An aircraft can have an extensive built-in failure menu without exposing a supported
external command that another application can call.

The pool is limited to Microsoft Flight Simulator products. The requested A340 is the
Aerosoft Aircraft A340-600 Pro developed with ToLiss for MSFS, not the ToLiss A340 for
X-Plane. A single MSFS integration service can therefore serve the whole pool, while
provider-specific adapters remain necessary.

## Confirmed aircraft pool

| Provider / adapter family | Included products and variants | MSFS platform status on the research date |
|---|---|---|
| Fenix | A319, A320 and A321; CFM and IAE configurations | Released for MSFS 2020; Fenix supplies an MSFS 2024 build through its installer. Fenix still describes 2024 support as experimental in its published compatibility notice. |
| Flight Sim Labs | A321ceo with CFM56 or IAE V2500 and wing-tip-fence or Sharklet variants; A321neo N/NX and LR configurations, with LEAP and released Pratt & Whitney support | A321ceo and A321neo are released for MSFS 2020/2024. The older A319-X/A320-X/A321-X Prepar3D line is not part of this MSFS application pool. |
| PMDG 737 | 737-600, 737-700, 737-800 and 737-900/900ER packages, including the package-specific passenger, BBJ and freighter configurations | All four 737NG packages are released as native MSFS 2024 products. |
| PMDG 777 | 777-200LR, 777-200ER, 777-300ER and 777F | All four packages are available for MSFS 2020 and MSFS 2024. Treat the 777 as a separate adapter from the 737. |
| Aerosoft / ToLiss | A340-600 Pro; Standard and High Gross Weight configurations | Released for MSFS 2020/2024. Current store version observed: 1.0.5. |
| iniBuilds | A350-900, A350-1000 and A350 ULR | Released for MSFS 2020/2024. iniBuilds has announced that A350 V2 will be MSFS 2024 only, so V1 and V2 mappings must be versioned separately. |
| iniBuilds | A380 Airliner; Trent 900 and GP7200 engines; Early-MSN and Modern-MSN configurations | Released for MSFS 2024 through the in-game Marketplace. Current product version observed: 1.0.0. |
| Synaptic Simulations / iniBuilds | A220-300 | Released for MSFS 2020/2024. A220-100 and A220 ACJ are separate products in active development and are not included until released and inspected. |

“All FSLabs Airbuses” means all current FSLabs Airbus products for MSFS. Prepar3D
products would require a separate platform scope, test environment and support policy.

## Readiness scale

| Level | Meaning |
|---|---|
| R0 — unavailable | The aircraft or required interface is not available for investigation. |
| R1 — documented aircraft only | A built-in failure system exists, but no supported external failure-control path has been identified. |
| R2 — integration candidate | A supported SDK, writable variables or events exist, but individual failure mappings and readback are not yet verified. |
| R3 — verified subset | At least one failure is activated and independently confirmed on an exact simulator and aircraft version. |
| R4 — production adapter | The reviewed catalog subset has versioned mappings, readback, regression tests and documented limitations. |

No aircraft in this matrix is R3 or R4 yet because no live failure-activation test was
performed during this documentation research.

## Failure-activation matrix

| Aircraft adapter | Built-in failure capability | External integration evidence | Planned activation route | Required readback | Current readiness and blocker |
|---|---|---|---|---|---|
| Fenix A319/A320/A321 | Fenix documents more than 200 failures, immediate or condition-armed activation, random Minor/All modes and MTBF behaviour. | Fenix documents cockpit LVars and `Cockpit_Behavior.xml` for hardware bindings. No public supported command for a named EFB failure was found. | SimConnect broker -> Fenix adapter -> vendor failure API if Fenix provides one; otherwise a tightly reviewed LVar/Input Event/WASM mapping only for failures proven in a local test. | Failure-manager state plus an independent aircraft indication or system value. | **R1.** Blocked for direct named failures until Fenix confirms an external failure interface or a reproducible supported mapping is proven. |
| FSLabs A321ceo/A321neo | FSLabs advertises an integrated Techlog/MEL system that produces inoperative equipment and operational challenges. | An FSL Hardware Interface exists for MSFS, currently described for selected Skalarki hardware. Public material does not define a general third-party failure API. | SimConnect broker -> FSLabs adapter -> supported FSL interface if opened to software clients. Do not automate Techlog/MEL screens. | Techlog/MEL item state plus affected system state and cockpit indication. | **R1.** The aircraft exposes an integration surface for hardware, but external creation of a MEL item is not documented. |
| PMDG 737NG | Full-featured failures cover nearly all QRH scenarios and include MTBF simulation. | The shipped PMDG SDK uses SimConnect Client Data and control events for aircraft data and controls. Public evidence reviewed here does not show a direct failure-set command. | SimConnect broker -> dedicated `pmdg-737` Client Data adapter. Use a direct PMDG failure API only if present in the installed SDK or confirmed by PMDG. CDU key-sequence automation is excluded. | PMDG failure record if exposed, backed by annunciation/system values from Client Data. | **R2 for aircraft integration; R1 for failure injection.** Inspect the exact MSFS 2024 SDK headers/manual and ask PMDG whether failure control is supported. |
| PMDG 777 | Hundreds of failures, manual/random/scheduled/event-driven activation and MTBF modelling are documented. | The 777 has its own SDK history and product-specific data structures. It must not reuse 737 Client Data layouts or event IDs. No current public direct failure API was established. | SimConnect broker -> separate `pmdg-777` adapter -> 777 SDK Client Data/events; enable failure commands only if explicitly defined and supported. | 777-specific SDK state plus EICAS/system consequence. | **R2 for aircraft integration; R1 for failure injection.** Obtain and inspect the current MSFS 2024 777 SDK for all four variants. |
| Aerosoft/ToLiss A340-600 Pro | Aerosoft documents 303 failures through the fault-injection screen, with immediate, time/altitude/speed and random flight-phase triggers. | The aircraft exposes some LVars/Input Events, but Aerosoft does not publish a complete SDK; support discussions confirm that some requested values are not exported. | SimConnect broker -> `aerosoft-toliss-a340` adapter -> supported LVar/Input Event only where documented and writable. Ask Aerosoft/ToLiss for a fault-injection API before catalog mapping. | Fault-injection state if exposed plus ECAM and affected component state. | **R1.** Excellent internal failure coverage, but no supported external fault-injection interface was found. |
| iniBuilds A350 | Failures can be triggered through the OIS and are organized by ATA chapter; iniBuilds has expanded ECAM failure states. | iniBuilds publishes a key LVar list for externally reading/setting switches and behaviours. That list is a cockpit-control interface, not evidence of failure-manager access. | SimConnect broker -> `inibuilds-a350` adapter -> official LVars/Input Events for verified cases; request a supported OIS failure API. Keep V1 and future V2 manifests separate. | OIS failure state if exposed plus ECAM/system values. | **R2 for cockpit integration; R1 for direct failure injection.** Interface stability across A350 V1/V2 is an additional blocker. |
| iniBuilds A380 | The released product has an ATA-organized failure system with immediate or random scheduling, including leaks and individual display failures. | The aircraft is MSFS 2024 native, but no public LVar/event list or external failure API was found in the reviewed official material. Marketplace packaging may also limit static file inspection. | SimConnect broker -> `inibuilds-a380` adapter -> runtime Input Event/LVar discovery, followed by vendor-supported commands where available. Do not automate EFB/OIT screens. | Failure scheduler state if exposed plus ECAM/system effect. | **R1.** Newly released product; request integration documentation and repeat discovery after early updates. |
| Synaptic A220-300 | The custom system model supports cascading system effects and working circuit breakers; no official general-purpose failure-injection menu/API was identified. | Synaptic publishes an official index of LVars, H-events and input events and explicitly permits external applications to read and modify aircraft state. Writable cockpit circuit-breaker variables are documented. | SimConnect broker -> `synaptic-a220` adapter -> published LVars/H-events/Input Events. Model only MEL states that can be produced safely through documented controls; request a direct fault API for latent/internal failures. | Published aircraft variables plus CAS/system effects; circuit-breaker position alone is insufficient. | **R2 and the best first non-Fenix proof-of-concept candidate.** Direct internal fault injection remains unconfirmed. |

## Recommended adapter boundaries

Use one shared Windows integration service with SimConnect, but keep eight adapter
packages:

1. `fenix-a320-family`
2. `fslabs-a321`
3. `pmdg-737`
4. `pmdg-777`
5. `aerosoft-toliss-a340`
6. `inibuilds-a350`
7. `inibuilds-a380`
8. `synaptic-a220`

PMDG 737 and 777 remain separate even if both use SimConnect Client Data. iniBuilds
A350 and A380 also remain separate because their failure managers, avionics and product
release cycles differ. Provider name alone is not a safe compatibility boundary.

Each adapter manifest must declare:

- simulator generation and tested simulator build;
- exact provider, family, variant, engine/configuration and product version range;
- supported catalog failure IDs;
- activation command, preconditions, timeout and reversal where available;
- independent readback and expected secondary indications;
- evidence file and test date;
- `unsupported`, `candidate`, `verified` or `deprecated` status per mapping.

The application should show a mixed result when only part of a generated scenario can
be activated. It may report success only for mappings that pass readback.

## Research priority

### First: prove the transport and mapping contract

Use the Synaptic A220 for the first external-control experiment because the developer
publishes writable variables and events. Select one reversible circuit-breaker-based
state, verify the resulting aircraft effect and restore it. This validates the broker,
adapter, version checks and readback without assuming access to a hidden failure menu.

### Second: resolve the current Fenix requirement

Ask Fenix whether its EFB failure manager has a supported local API, LVar/H-event,
SimConnect Client Data area or documented WASM call. If the answer is no, BL-001 cannot
honestly promise automatic activation for the full Fenix catalog; it must ship with a
verified subset and manual instructions for the remainder.

### Third: inspect installed vendor SDKs

Inspect current PMDG 737 and 777 SDK packages separately. Confirm whether they expose
failure identifiers, commands and status. General cockpit-event access does not meet
this gate.

### Fourth: request vendor interfaces

Send concise technical questions to Flight Sim Labs, Aerosoft/ToLiss and iniBuilds:

- Is there a supported external command for selecting a named failure?
- Can an external client read whether it is active or armed?
- Is the interface versioned and permitted for a distributed desktop application?
- Which MSFS 2024 product versions are covered?

### Fifth: build provider test inventories

For every family, start with three failures: a simple replaceable-unit failure, a
system failure with downstream effects and a failure that cannot be represented by a
cockpit switch. Record both successful and unsupported cases. Do not scale to the full
MMEL/MEL catalog until one R3 vertical slice exists for that adapter.

## Product implications

- Automatic activation remains capability-based. Aircraft selection does not imply
  that every generated failure can be injected.
- Each aircraft family needs its own reviewed MMEL/MEL catalog. Simulator failure
  names cannot be used as regulatory source data.
- Engine, avionics and weight/configuration variants belong in applicability metadata,
  even when they share an adapter binary.
- Marketplace-only packages can still be controlled through public runtime interfaces;
  the application must not depend on modifying encrypted package files.
- UI automation of EFB, OIS, Techlog or CDU pages remains excluded because it is
  fragile and provides poor state verification.

## Source registry

All sources below are official publisher, developer or platform sources and were
accessed on 18 September 2026.

| Source | Evidence used |
|---|---|
| [Fenix product page](https://fenixsim.com/public/) | A319/A320/A321 product family |
| [Fenix MSFS 2024 compatibility notice](https://fenixsim.com/blog/entries/2024-11-25_msfs_2024_compatibility/) | MSFS 2024 build and stated experimental-support boundary |
| [Fenix Failures Guide](https://support.fenixsim.com/hc/en-us/articles/12457317731855-Failures-Guide-in-FenixSim-Aircraft) | 200+ failures, manual/armed/random and MTBF modes |
| [Fenix external hardware binding guide](https://support.fenixsim.com/hc/en-us/articles/12466468901135-Example-of-How-to-Bind-Switches-Knobs-and-Buttons-on-FenixSim-Aircraft-to-External-Hardware) | Cockpit LVars and behavior XML; no documented failure-manager command |
| [FSLabs A321ceo introduction](https://www.flightsimlabs.com/index.php/introducing-the-a321/) | A321ceo variants and integrated MEL feature |
| [FSLabs A321neo product page](https://www.flightsimlabs.com/index.php/a321neo/) | A321neo variants, MSFS support and MEL/Techlog feature |
| [FSLabs MSFS Hardware Interface](https://forums.flightsimlabs.com/files/category/120-hardware-interface-for-msfs/) | Current hardware-interface scope |
| [PMDG MSFS 2024 catalog](https://pmdg.com/pmdg-for-msfs-2024/) | Released 737-600/-700/-800/-900 products |
| [PMDG 737-800 for MSFS 2024](https://pmdg.com/pmdg-737-800-for-microsoft-flight-simulator-2024/) | Native MSFS 2024 status and full QRH/MTBF failure simulation |
| [PMDG 2020/2024 catalog](https://pmdg.com/msfs-2020-2024/) | Released 777-200LR/-200ER/-300ER/F products |
| [PMDG 777-300ER product page](https://pmdg.com/pmdg-777-300er-for-msfs-2020-2024/) | Hundreds of failures and manual/random/scheduled/event-driven modes |
| [PMDG 737 SDK support example](https://forum.pmdg.com/forum/main-forum/pmdg-737-for-msfs/general-discussion-no-support/366180-help-with-737-sdk) | PMDG NG3 Client Data interface and required SDK configuration |
| [Aerosoft A340-600 Pro product page](https://www.aerosoft.com/en/shop/flight/microsoft-flight-simulator/msfs-2020/msfs-aircraft/4763/aerosoft-aircraft-a340-600-pro) | MSFS platforms, variants, current version and 303-failure system |
| [Aerosoft A340 LVar support discussion](https://forum.aerosoft.com/index.php?/topic/185087-request-lvars-for-v1-vr-v2-vref/) | Incomplete exported-variable coverage and unfulfilled SDK request |
| [iniBuilds A350 v1.0.8 release notes](https://forum.inibuilds.com/topic/29695-inibuilds-a350-airliner-for-microsoft-flight-simulator-2024-2020-v108-released/) | ATA-organized OIS failure triggering and expanded failure states |
| [iniBuilds A350 key LVars](https://forum.inibuilds.com/topic/25015-key-lvars-list-a350/) | Official external switch/behaviour variable list |
| [iniBuilds A350/A380 August 2026 update](https://forum.inibuilds.com/topic/37603-inibuilds-a380-airliner-development-update-august-2026/) | A350 V2 platform boundary |
| [iniBuilds A380 product page](https://inibuilds.com/products/inibuilds-a380-airliner-msfs-2024) | Released MSFS 2024 product, configurations and failure scheduler |
| [Microsoft A380 release announcement](https://www.flightsimulator.com/msfs-announces-the-airbus-a380/) | Marketplace release date and status |
| [Synaptic A220 FAQ](https://synapticsim.com/faq) | Released A220-300 and planned A220-100/ACJ scope |
| [Synaptic A220 SimVars](https://docs.synapticsim.com/pilots/simvars) | Official writable LVars/H-events for external applications and circuit breakers |
| [Synaptic A220 Input Events](https://docs.synapticsim.com/pilots/inputs) | Official input-event index |
| [Microsoft SimConnect SDK](https://docs.flightsimulator.com/msfs2024/retail/programming-apis/simconnect/simconnect-sdk/) | Shared MSFS transport foundation |

## Evidence limitations

The product and interface statements above were verified from current public official
material. No vendor was contacted and no local installation other than the previously
reviewed Fenix files was inspected. No failure was activated. Product updates can alter
variables, event names and package structure, so every mapping remains unverified until
tested against an exact version and recorded as R3 evidence.
