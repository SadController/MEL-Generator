# Automatic Failure Activation — Integration Research

Research date: 18 September 2026  
Backlog item: BL-001  
Status: Research completed for the initial Fenix slice; production implementation is in
progress in version 1.1.0 alpha 1.

The complete requested aircraft pool, current product variants and provider-by-provider
activation routes are recorded in [Aircraft Pool and Failure-Activation Matrix](AIRCRAFT_MATRIX.md).

## Executive conclusion

Automatic failure activation is feasible, but there is no single SimConnect command
that can activate every detailed failure in every third-party aircraft. The reusable
part must therefore be the orchestration layer, connection broker, typed command model,
capability discovery, verification and reporting. Each supported aircraft family needs
its own versioned adapter and an empirically verified mapping from a catalog failure to
the controls exposed by that aircraft.

SimConnect should be the primary connection to MSFS 2024. It is the official external
API, supports out-of-process applications, provides simulator lifecycle events,
standard events, settable SimVars, aircraft-specific Input Events and Client Data. A
small optional WASM bridge is justified only when a supported aircraft operation cannot
be reached from an external SimConnect client. A vendor-supported SDK or API takes
precedence over private variables and reverse-engineered commands.

The recommended product architecture is therefore:

```text
Electron application
  -> simulator integration service (stable JSON protocol)
       -> SimConnect transport
       -> optional WASM bridge transport
       -> aircraft adapter selected from detected aircraft identity
            -> standard MSFS adapter
            -> Fenix adapter
            -> PMDG 737 adapter
            -> PMDG 777 adapter
            -> FSLabs, Aerosoft/ToLiss, iniBuilds and Synaptic adapters
            -> future provider adapters
```

This structure is universal at the framework level. Failure mappings are deliberately
aircraft-specific because pretending that one command has identical effects in all
complex aircraft would produce false activation reports.

## What SimConnect provides

Microsoft recommends an out-of-process SimConnect application because it is easier to
build, test and debug, and a crash normally does not crash the simulator. The API is
available to C/C++ and managed .NET clients. For MEL Generator, the first implementation
should be a separate helper process rather than a native Node/Electron add-on. This
isolates the Electron process from SimConnect versioning and allows the helper language
to change without changing the application-facing protocol.

SimConnect can provide the following common services:

- connect to and disconnect from MSFS;
- receive `SimStart`, `SimStop`, `AircraftLoaded` and related lifecycle events;
- read identity data such as `TITLE`, `ATC MODEL`, `ATC TYPE` and aircraft category;
- read and write SimVars that are explicitly settable;
- transmit standard simulator events;
- enumerate, inspect and set Input Events exposed by the loaded aircraft;
- exchange Client Data with vendor modules or an optional WASM bridge;
- return exceptions and connection state for diagnostic reporting.

SimConnect does not guarantee that a third-party aircraft uses the default simulation
system behind a standard event or SimVar. Advanced aircraft commonly implement their
own systems and expose their own variables or events. A successful API call therefore
does not by itself prove that the intended aircraft failure is active.

## Technology comparison

| Technology | Reach | Strengths | Limits | Recommended role |
|---|---|---|---|---|
| Standard SimConnect events | Low for detailed MEL failures | Official, external, no Community package | Only coarse built-in failures are documented; several are toggles | First choice only when the exact effect and readback are verified |
| Settable SimVars | Low to medium | Official, typed, readable for verification | Many variables are read-only; custom aircraft can ignore the default system | Use for aircraft that demonstrably use the corresponding MSFS system |
| SimConnect Input Events | Medium | Aircraft-specific events can be enumerated at runtime and set by hash | Primarily control inputs; a failure action is not guaranteed | Preferred discovery and control path for aircraft-exposed actions |
| SimConnect Client Data | Medium to high with vendor support | Structured communication with aircraft/vendor modules | Requires an agreed data-area protocol | Use for vendor SDKs such as PMDG-style integrations |
| LVars, HVars and BVars | Potentially high | Can reach custom aircraft model behavior | Names and semantics are provider/version-specific; external access may require WASM | Adapter-only fallback with strict versioning and readback |
| RPN/calculator code through WASM | High technical reach | Can combine custom variables and events in the gauge context | Powerful but fragile; arbitrary scripts create security and support risks | Controlled internal transport for reviewed, bundled commands only |
| Vendor SDK/API | Best when available | Intended semantics and better compatibility contract | Different for every product and sometimes incomplete | Highest-priority aircraft-specific method |
| MobiFlight WASM | Useful for prototypes | Open-source bridge for RPN and LVars over SimConnect Client Data | Its public description targets MSFS 2020; production MSFS 2024 support must be verified | Research and prototype tool; do not require it in the released app yet |
| FSUIPC7/WAPI | Useful compatibility layer | Mature uniform interface; current product supports MSFS 2020/2024 | Adds a separately maintained runtime and support boundary | Optional diagnostic/prototype route, not the default dependency |
| UI automation of EFB/CDU | Superficially broad | May work when no API exists | Resolution-, layout-, timing- and localization-dependent; cannot reliably prove state | Excluded from the core implementation |

### Standard failure events are insufficient

The official MSFS event list exposes coarse failure events for the electrical system,
hydraulic system and engines 1–4. These are `TOGGLE_*` events, not explicit
`SET_FAILED` operations. A toggle is non-idempotent: if the current state is unknown,
calling it may clear an existing failure instead of activating one. It must not be used
without reliable state readback and an adapter-level test.

The MSFS 2024 modular systems add component-oriented variables such as hydraulic system
integrity and named valves. These are promising for aircraft built on those systems,
but they are not a substitute for vendor adapters. Component names come from the
aircraft implementation, and complex add-ons may use independent system simulations.

## Aircraft-provider findings

### Fenix A319/A320/A321

Fenix officially documents more than 200 failures in its EFB and supports immediate and
condition-armed activation. Fenix also officially documents LVars for external hardware
control and points users to the aircraft's `Cockpit_Behavior.xml` for switch and knob
bindings.

The researched public Fenix material does not document a supported external API for
activating a named EFB failure. The LVar hardware article establishes access to cockpit
controls, not to the failure manager. This is a research status, not proof that no such
interface exists internally.

Consequences for BL-001:

- do not assume that an EFB failure name maps to an LVar of the same name;
- request or locate a supported Fenix failure interface before production mapping;
- use DevMode/SimConnect inspection and controlled local experiments only to identify
  candidates;
- mark every mapping `unverified` until activation and readback are observed on the
  supported Fenix version;
- keep manual EFB activation available for unsupported failures.

The local installation contains the Fenix user guide at
`C:\ProgramData\Fenix\EFB\documents\FenixSim A320 User Guide.pdf`, but no local SDK or
failure API document was found under `C:\ProgramData\Fenix` during this review.

### PMDG

PMDG publishes product documentation and distributes SDK material for supported
products. Public support material confirms that the MSFS 737 SDK documentation is
available with the aircraft and uses SimConnect-related data/control integration. This
makes a PMDG adapter technically plausible.

The currently reviewed public material does not establish a direct SDK call for
activating an individual failure. PMDG's aircraft failures are managed through its own
aircraft interfaces, so each PMDG family and simulator generation must be investigated
separately. Driving CDU pages by synthetic button presses may be technically possible
through panel-control events, but it is UI navigation and should not be treated as a
stable failure API unless PMDG documents and supports that use.

### FlyByWire as an architecture reference

FlyByWire documents custom LVars and custom events for A32NX and explains why advanced
aircraft need provider-specific APIs beyond standard SimConnect controls. This is a
useful reference for the adapter model: a provider with published variables can be
integrated without changing the core orchestrator, but the failure mapping still needs
its own documented and tested commands.

### Default and simpler MSFS aircraft

Aircraft that use standard MSFS systems may support a limited generic adapter through
standard events, settable SimVars, Input Events and modular-system component names. The
application must report the exact supported capability set; it must not advertise full
failure coverage merely because a SimConnect connection succeeds.

## Recommended universal integration design

### Current Fenix implementation milestone

Version 1.1.0 alpha 1 implements the first production vertical slice: a separate
SimConnect identity helper, automatic connection state, a versioned Fenix adapter using
the localhost gateway, all 53 current mappings, independent manager readback and
best-effort rollback limited to failures activated by the current operation. The
Electron renderer receives only typed status and activation results through the
preload bridge. The packaged alpha passes automated and UI checks with MSFS offline;
the remaining release check is a live packaged activation with Fenix loaded.

### 1. Stable application-to-broker protocol

The Electron main process should start a bundled simulator integration service and
communicate using newline-delimited JSON over stdin/stdout or a local named pipe. The
renderer must not call SimConnect or execute arbitrary adapter commands directly.

Minimum operations:

- `connect` / `disconnect`;
- `getSimulatorState`;
- `getLoadedAircraft`;
- `getCapabilities`;
- `validateScenario`;
- `activateFailures`;
- `deactivateFailures` when supported;
- `getActivationStatus`;
- `cancelOperation`;
- structured diagnostic events.

The protocol must carry its own version so the Electron application and broker can
reject incompatible combinations cleanly.

### Product connection behavior

The Electron application starts the integration service and requests a SimConnect
connection automatically. No connection toggle or manual connect button is exposed in
Settings. If MSFS is unavailable at application startup, starts later, closes, reloads
a flight or interrupts the SimConnect session, the service continues connection or
reconnection attempts in the background.

The application header shows two equal circular indicators. The first is green only
while the broker reports a live SimConnect connection and identifies a loaded user
aircraft; it is gray otherwise. The second is green only when the detected aircraft is
supported for automatic failure activation and its applicable adapter is ready; it is
gray otherwise. The gray state should look like an unlit signal. The header shows no
visible labels beside the circles. Each indicator
shows a small explanation on hover and retains non-visible accessible status text for
screen readers. Neither indicator replaces per-command activation and readback results.

### 2. Aircraft identity and adapter selection

Adapter selection should use several signals rather than a display title alone:

- simulator generation and version;
- `TITLE`, `ATC MODEL`, `ATC TYPE` and category;
- provider-specific readiness variable or SDK handshake where available;
- detected provider package/version when it can be obtained through a supported method;
- user-selected aircraft profile as a confirmation, not as the only detection signal.

Every adapter manifest should declare exact supported simulator, aircraft family,
variants and tested product-version ranges. Unknown versions should produce a visible
`compatibility not verified` result rather than silently reusing an old mapping.

### 3. Typed adapter commands

Do not store unrestricted scripts in downloadable data. Use a closed command vocabulary
implemented by the broker, for example:

```json
{
  "method": "simconnect-event",
  "event": "TOGGLE_ENGINE1_FAILURE",
  "precondition": { "simvar": "ENG FAILED:1", "equals": 0 },
  "verify": { "simvar": "ENG FAILED:1", "equals": 1, "timeoutMs": 3000 }
}
```

Additional reviewed command types can cover settable SimVars, Input Events, vendor
Client Data and named adapter functions. If RPN is required, it should be compiled into
the trusted adapter or restricted to signed, bundled profiles; it should never be
accepted directly from a downloaded catalog or user-entered text.

### 4. Separate failure catalog from activation mapping

The MMEL/MEL catalog describes dispatch relief and scenario selection. The integration
mapping describes how a particular simulated aircraft reproduces a state. They must be
separate records joined by stable IDs.

Suggested activation mapping fields:

- `mappingId`;
- `catalogFailureId`;
- `provider`, `aircraftFamily`, `variant`;
- `simulator` and tested versions;
- `adapterId` and adapter version;
- activation command sequence;
- required initial conditions;
- readback and expected observable state;
- optional deactivation/rollback sequence;
- verification evidence and test date;
- support status: `unsupported`, `candidate`, `verified`, `deprecated`;
- limitations and known secondary effects.

One MMEL entry may have zero, one or several mappings because different aircraft can
model the same item differently.

### 5. Capability-first user flow

Before offering automatic activation, the application should connect, detect the
aircraft, select an adapter and validate every generated failure. The result should be
one of:

- all failures can be activated and verified;
- some failures can be activated, with the remainder requiring manual activation;
- the aircraft is recognized but this version is unverified;
- no compatible adapter is installed;
- the simulator or aircraft is not ready.

Partial activation must require an explicit operation result listing each failure. A
green overall result is allowed only when every requested mapping passes its readback.

### 6. Transaction and recovery behavior

For a multi-failure scenario:

1. Validate the complete set and all preconditions without changing the simulator.
2. Capture available before-state for every mapping.
3. Activate failures sequentially with per-command timeouts.
4. Verify each failure using independent readback where possible.
5. If a later activation fails, roll back earlier changes only when a tested reversal is
   available; otherwise preserve the simulator state and report a partial result.
6. Never claim rollback for a destructive or irreversible simulated state without a
   verified reset mechanism.

This design avoids the false promise of atomic behavior when the aircraft SDK cannot
provide it.

## Recommended implementation sequence

### Research gate

- install the MSFS 2024 SDK and capture the exact SimConnect runtime/API version;
- build a read-only connection probe;
- log simulator lifecycle and loaded-aircraft identity;
- enumerate Input Events and selected SimVars for a default aircraft and Fenix;
- ask Fenix support whether a supported external failure API exists;
- inspect the installed PMDG SDK only after selecting the first exact PMDG product;
- choose three representative failure types: one standard/coarse failure, one Fenix
  system failure and one failure expected to require a custom interface.

### Architecture prototype

- implement the versioned broker protocol with no activation commands initially;
- implement capability discovery and a `dryRun` validation response;
- add a generic standard-MSFS adapter for one reversible, observable test failure;
- add a Fenix adapter containing only verified mappings;
- record command, before-state, after-state, timing and simulator/add-on versions.

### Production gate

BL-001 should move from Research to Specified only when at least one complete vertical
slice demonstrates: aircraft detection, adapter selection, activation, independent
readback, failure reporting and safe behavior after an aircraft reload. Broad catalog
mapping begins only after that gate.

## Decisions adopted by this research

- Use official out-of-process SimConnect as the base transport.
- Put simulator integration behind a replaceable helper-process protocol.
- Use an adapter per provider/aircraft family and version the mappings.
- Prefer vendor SDK/API, then Input Events, then standard events/settable SimVars, then
  a reviewed WASM bridge where necessary.
- Keep MMEL/MEL data independent from simulator activation mappings.
- Require readback before reporting successful activation.
- Permit a mixed automatic/manual result when coverage is incomplete.
- Exclude EFB/CDU screen automation from the core design.
- Do not make FSUIPC or MobiFlight a mandatory user dependency at this stage.

## Open questions

- Does Fenix expose or plan a supported command for named failure activation and state
  readback?
- Which Fenix versions should 1.1.0 support, and how can the installed version be read
  through a supported interface?
- Which exact PMDG product will be the first non-Fenix adapter?
- Should the optional WASM package be installed automatically by the app installer or
  separately after the first adapter proves it necessary?
- Which failure is the safest reversible vertical-slice test for each provider?

## Implementation decision — 20 September 2026

The shared service is implemented in C# on .NET 8 and published as a self-contained
Windows executable. Protocol version 2 carries generation, activation and state traffic
over redirected standard pipes. The Electron shell no longer owns SimConnect, Fenix HTTP
commands or scenario generation. See `../architecture/CORE_AND_INTEGRATION_SERVICE.md`.

## Source registry

All web sources were accessed on 18 September 2026.

| Source | Publisher / status | What it establishes | Verification state |
|---|---|---|---|
| [SimConnect SDK](https://docs.flightsimulator.com/msfs2024/retail/programming-apis/simconnect/simconnect-sdk/) | Microsoft/Asobo official MSFS 2024 SDK | External and WASM clients; C/C++ and managed .NET; out-of-process recommendation | Verified official documentation |
| [SimConnect system-event subscription](https://docs.flightsimulator.com/msfs2024/flighting/programming-apis/simconnect/api-reference/general/simconnect_subscribetosystemevent/) | Microsoft/Asobo official | `AircraftLoaded`, `SimStart`, `SimStop` and other lifecycle events | Verified official documentation |
| [SimConnect Input Events](https://docs.flightsimulator.com/msfs2024/html/6_Programming_APIs/SimConnect/API_Reference/InputEvents/Input_Events.htm) | Microsoft/Asobo official | Enumerate, inspect, read and set aircraft-specific Input Events | Verified official documentation |
| [Transmit client event](https://docs.flightsimulator.com/msfs2024/retail/programming-apis/simconnect/api-reference/events-and-data/simconnect_transmitclientevent/) | Microsoft/Asobo official | Sending mapped simulator/client events | Verified official documentation |
| [Set data on SimObject](https://docs.flightsimulator.com/html/Programming_Tools/SimConnect/API_Reference/Events_And_Data/SimConnect_SetDataOnSimObject.htm) | Microsoft/Asobo official | Writing only those SimVars marked settable | Verified official documentation; legacy URL for the API page |
| [Aircraft failure events](https://docs.flightsimulator.com/msfs2024/html/6_Programming_APIs/Key_Events/Aircraft_Misc_Events.htm) | Microsoft/Asobo official | Coarse electrical, engine and hydraulic toggle failures | Verified official documentation |
| [MSFS 2024 Simulation Variables](https://docs.flightsimulator.com/msfs2024/retail/programming-apis/simvars/simulation-variables/) | Microsoft/Asobo official | SimVar model, types, writable-variable concept and identity variables | Verified official documentation |
| [Aircraft system variables](https://docs.flightsimulator.com/msfs2024/retail/programming-apis/simvars/aircraft-simvars/aircraft-system-variables/) | Microsoft/Asobo official | Named modular hydraulic components and integrity variables | Verified official documentation |
| [MSFS 2024 WebAssembly](https://docs.flightsimulator.com/msfs2024/retail/programming-apis/wasm/webassembly/) | Microsoft/Asobo official | WASM module model, APIs, packaging and limitations | Verified official documentation |
| [WASM Vars API](https://docs.flightsimulator.com/msfs2024/html/6_Programming_APIs/WASM/Vars_API/Vars_API.htm) | Microsoft/Asobo official | LVar read/write in simulation context and other variable types | Verified official documentation |
| [Fenix Failures Guide](https://support.fenixsim.com/hc/en-us/articles/12457317731855-Failures-Guide-in-FenixSim-Aircraft) | Fenix official support | More than 200 EFB failures and manual/armed activation | Verified official documentation; no external failure API described |
| [Fenix external hardware binding example](https://support.fenixsim.com/hc/en-us/articles/12466468901135-Example-of-How-to-Bind-Switches-Knobs-and-Buttons-on-FenixSim-Aircraft-to-External-Hardware) | Fenix official support | Fenix cockpit LVars and local behavior XML for hardware controls | Verified official documentation; does not establish failure-manager access |
| [PMDG documentation center](https://pmdg.com/documentation/) | PMDG official | Product documentation distribution | Verified official page; public page does not establish failure control |
| [PMDG SDK location support answer](https://forum.pmdg.com/forum/main-forum/pmdg-737-for-msfs/general-discussion-no-support/259258-pmdg-sdk) | PMDG support forum | MSFS 737 SDK documentation shipped under the product documentation folder | Verified forum record; installed SDK still needs product-specific review |
| [FlyByWire A32NX API overview](https://docs.flybywiresim.com/aircraft/a32nx/a32nx-api/) | FlyByWire official documentation | Advanced aircraft expose provider-specific variables/events beyond standard controls | Verified official project documentation |
| [FlyByWire developer API](https://docs.flybywiresim.com/aircraft/a32nx/a32nx-api/a32nx-systems-api/) | FlyByWire official documentation | Published custom LVars and events provide an adapter-friendly interface | Verified official project documentation |
| [MobiFlight WASM module](https://github.com/Mobiflight/MobiFlight-WASM-Module) | Open-source third party, MIT | RPN/LVar bridge over SimConnect Client Data | Source and protocol reviewed; MSFS 2024 production compatibility not established here |
| [FSUIPC7](https://fsuipc.com/fsuipc7/) | Third-party official product page | Uniform external interface, Input Events and LVar/HVar access for MSFS 2020/2024 | Capability documented; not selected as a required dependency |

## Evidence limitations

This is a documentation and local-inventory review. No failure was activated in Fenix,
PMDG or a default aircraft during this work. No mapping is therefore classified as
`verified`. Simulator updates and aircraft updates can change exposed variables and
events; every production adapter needs version-specific integration tests.
