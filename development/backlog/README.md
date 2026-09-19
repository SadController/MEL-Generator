# MEL Generator — Product Backlog

Created: 18 September 2026.

This backlog records ideas for future development beyond version 1.0.0. Priorities and
target releases for the initial roadmap were approved on 18 September 2026. A dash in
either field means that the priority or target release has not yet been assigned. Moving
an item into development still requires a separate specification and an explicit
decision to implement it.

## Release format decision

Starting with version 1.1.0, MEL Generator will be distributed only as an installed
Windows desktop application. New Portable editions will not be produced or supported.
The existing Portable 1.0.0 file remains part of the historical 1.0.0 release and does
not define the packaging model for future versions.

Future packaging, updates, settings migration and support documentation must assume a
single installed application with a normal Windows installation directory, Start menu
entry and uninstaller.

## Backlog overview

| ID | Item | Area | Priority | Target release | Status | Main dependency |
|---|---|---|---|---|---|---|
| BL-001 | Automatic failure activation in the simulator | Integration | P1 | 1.1.0 | In Development | Verified provider adapters over SimConnect/WASM |
| BL-002 | Technical log note presentation | Presentation | P2 | 1.2.0 | Proposed | Technical log template and content rules |
| BL-003 | Application settings | Core UX | P1 | 1.1.0 | In Development | Packaged acceptance of implemented settings and diagnostics |
| BL-004 | Dark and light themes | UI | P2 | 1.2.0 | Proposed | BL-003 application settings |
| BL-005 | In-app application updates | Distribution | P1 | 1.1.0 | Proposed | Release hosting, signing and update policy |
| BL-006 | PMDG 737 and 777 support | Aircraft support | P3 | 3.0.0 | Research | Family-specific catalogs and verified PMDG SDK failure interfaces |
| BL-007 | Source document selection | Data | P2 | 1.2.0 | Proposed | Separate reviewed catalog for every document |
| BL-008 | Up to 10 simultaneous failures | Generator | P3 | 3.0.0 | Proposed | Generator and compatibility-engine redesign |
| BL-009 | INOP placard | Presentation | P3 | 3.0.0 | Proposed | Placard content and output rules |
| BL-010 | Scenario generation engine redesign | Generator architecture | — | 2.0.0 | Proposed | Agreed generation model and metadata schema |
| BL-011 | Failure severity selection | Generator UX | — | 2.0.0 | Proposed | BL-010 and an approved severity rubric |
| BL-012 | Failure occurrence weighting | Generator data | — | 2.0.0 | Proposed | BL-010 and sourced occurrence data |
| BL-013 | Serviceable-aircraft outcome | Generator UX | — | 2.0.0 | Proposed | BL-010 and an agreed zero-failure probability policy |
| BL-014 | Flight Sim Labs A321 support | Aircraft support | — | — | Research | Separate A321ceo/A321neo catalogs and a supported external MEL/failure interface |
| BL-015 | Aerosoft/ToLiss A340-600 Pro support | Aircraft support | — | — | Research | A340 catalog and a supported fault-injection interface |
| BL-016 | iniBuilds A350 support | Aircraft support | — | — | Research | A350 catalog, V1/V2 boundary and verified failure mappings |
| BL-017 | iniBuilds A380 support | Aircraft support | — | — | Research | A380 catalog and verified MSFS 2024 failure mappings |
| BL-018 | Synaptic A220 support | Aircraft support | — | — | Research | A220 catalog and verified mappings using the published external interface |
| BL-019 | Fenix event-type failures | Generator / Fenix | — | — | Proposed | Separate event catalog, generation rules and verified Fenix manager mappings |
| BL-020 | Expand the Fenix MEL failure pool | Data / Fenix | — | 2.0.0 | Proposed | BL-010, reviewed source-document coverage and verified Fenix manager mappings |

## Release roadmap

### Version 1.1.0 — Priority P1

- BL-001 — Automatic failure activation in the simulator.
- BL-003 — Application settings.
- BL-005 — In-app application updates.

### Version 1.2.0 — Priority P2

- BL-002 — Technical log note presentation.
- BL-004 — Dark and light themes.
- BL-007 — Source document selection.

### Version 2.0.0 — priority not assigned

- BL-010 — Scenario generation engine redesign.
- BL-011 — Failure severity selection.
- BL-012 — Failure occurrence weighting.
- BL-013 — Serviceable-aircraft outcome.
- BL-020 — Expand the Fenix MEL failure pool.

### Version 3.0.0 — Priority P3

- BL-006 — PMDG 737 and 777 support.
- BL-008 — Up to 10 simultaneous failures.
- BL-009 — INOP placard.

### Release not assigned — aircraft pool expansion

- BL-014 — Flight Sim Labs A321 support.
- BL-015 — Aerosoft/ToLiss A340-600 Pro support.
- BL-016 — iniBuilds A350 support.
- BL-017 — iniBuilds A380 support.
- BL-018 — Synaptic A220 support.

### Release not assigned — other features

- BL-019 — Fenix event-type failures.

## BL-001 — Automatic failure activation in the simulator

**Goal:** Allow the application to activate the generated failures in MSFS instead of
requiring the user to set them manually in the Fenix EFB.

**Scope to investigate:**

- determine whether Fenix exposes a supported interface for every catalog failure;
- evaluate SimConnect, documented simulator events, local variables and any official
  Fenix integration mechanism;
- map each catalog record to a verified simulator command and resulting aircraft state;
- detect whether MSFS and the selected aircraft are running;
- report partial activation clearly if only some failures can be set automatically;
- preserve manual activation as a fallback.

**Approved connection UX:** The application connects to MSFS automatically and keeps
trying in the background if the simulator is unavailable or the connection is lost.
The header shows two equal circular indicators instead of the `MSFS` text. The first is
green only when SimConnect is connected and a loaded user aircraft is identified. The
second is green only when that aircraft is supported for automatic failure activation
and its adapter is ready. Each circle is gray, like an unlit signal, when its condition
is not met. No visible
label is shown beside either circle; a small explanation appears only on hover, with
non-visible accessible status text retained for screen readers. Per-failure activation
and readback errors are still reported separately. See `../settings/README.md`.

**Acceptance direction:** For Fenix, the same generated scenario sets the exact mapped
records to `failed=true` in the Fenix Manual Failures manager, confirmed by a separate
manager reload, without activating additional mapped records. Empirical confirmation of
cockpit indications or simulated system consequences is not required.

**Research direction:** Use official out-of-process SimConnect as the base transport,
place it behind a stable helper-process protocol and implement a versioned adapter for
each aircraft provider/family. Prefer a vendor SDK/API, then aircraft Input Events,
standard events or settable SimVars, and use a reviewed WASM bridge only where an
external SimConnect client cannot reach the required operation. Require readback before
reporting success and preserve manual activation for unsupported mappings. Keep the
MMEL/MEL catalog separate from simulator activation mappings. See
`../research_simulator_integration/README.md`.

**Fenix feasibility milestone, 19 September 2026:** The local Fenix EFB gateway accepted
activation and restoration commands for all 53 production-catalogue mappings on a Fenix
A321 IAE WF SC. Separate catalogue reloads verified every active and restored state;
53/53 mappings passed and the final check found no mapped failure left active. Under the
approved product rule, separate readback from the Fenix manager is sufficient and
empirical system-effect verification is not required. Other Fenix
variants/configurations, multi-failure activation and compatibility across Fenix updates
remain unverified. The gateway interface is version-bound until Fenix documents or
confirms it for external use. See
`../research_simulator_integration/fenix_live_2026-09-19/README.md`.

**Implementation milestone, 19 September 2026:** The 1.1.0 alpha production source now
contains an out-of-process SimConnect identity helper, automatic reconnection state, a
Fenix localhost adapter, all 53 production mappings, activation readback, rollback of
newly activated records after a partial failure, persistent opt-in activation and the
approved two-circle header status. Automated adapter, generator, settings and Electron
UI checks pass. The production controller, SimConnect helper and Fenix adapter also
passed a live activation/readback/restoration test on `FenixA321 IAE WF SC`, while
preserving three pre-existing unmapped Fenix states. Final installed-application
acceptance and broader reconnection/error-path checks remain before BL-001 is complete.

**Open decisions:** Supported Fenix versions, availability of a supported Fenix failure
API, first reversible vertical-slice failure, helper implementation language, whether a
WASM package is necessary and the default value of automatic activation. The approved
settings behavior starts activation when `To failures` is selected and
`Automatically activate failures when generating the briefing` is enabled. See
`../settings/README.md`.

## BL-002 — Technical log note presentation

**Goal:** Add a presentation mode that formats the generated scenario as a technical
log note while preserving the current failure card data.

**Scope to investigate:**

- agree on one non-operator-specific technical log template;
- define which fields come directly from MMEL/MEL data and which are scenario labels;
- preserve the exact source document, revision and item references;
- support one note containing all failures in the generated set;
- provide copy or export behavior if required.

**Acceptance direction:** The technical log representation contains the same failures
and conditions as the cards and never invents maintenance action, authorization,
dates, signatures or operational approval.

**Open decisions:** Whether cards and the technical log coexist, whether the user can
switch between them, and whether export or printing is required.

## BL-003 — Application settings

**Goal:** Add a dedicated settings screen for persistent application preferences.

**Approved settings:**

- `Check for updates on startup` — boolean;
- `Automatically activate failures when generating the briefing` — boolean;
- `Enable diagnostic log` — boolean.

The Settings screen also contains a `Check for updates` action. Aircraft, source
document, failure count and later main-screen parameters are saved automatically as the
last selection and are not duplicated in the Settings menu. Application and Integration
Service versions are displayed as read-only information.

**Acceptance direction:** Settings are validated, saved in the existing user profile,
restored on launch and safely migrated when the application version changes.

**Approved direction:** Keep the settings scope deliberately small. Main-screen choices
retain their last valid values. Simulator connection is automatic and has no settings
toggle. Do not expose low-level SimConnect/WASM commands, logging levels or add
unapproved connection, theme, document-default or presentation settings. See
`../settings/README.md`.

**Approved log policy:** Store diagnostic logs in the application's per-user data
directory. At every startup, delete the application's own log files older than seven
days. Do not provide log-folder, manual-clear, diagnostic-report or reset-settings
actions in the current scope. Connected-aircraft and adapter details belong in the log,
not on the Settings screen. Diagnostic report export and settings reset remain possible
future ideas.

**Implementation milestone, 20 September 2026:** All three approved settings are stored,
validated and migrated through schema version 3. Startup and manual update checks use
the public stable GitHub Release endpoint. Diagnostic logging is opt-in JSON Lines with
credential-field redaction, 10 MB rotation and seven-day cleanup. The update button uses
the approved manual release-page fallback until BL-005 supplies installation. The final
replacement label for `To failures` remains deferred.

## BL-004 — Dark and light themes

**Goal:** Let the user select a dark or light visual theme.

**Scope to investigate:**

- define complete color tokens for both themes;
- maintain readable contrast for cards, controls, warnings and disabled states;
- store the selected theme through BL-003;
- decide whether a system-theme option is also required;
- verify all application screens at supported window sizes.

**Acceptance direction:** Both themes provide the same functionality and information,
with no unreadable, missing or theme-specific controls.

## BL-005 — In-app application updates

**Goal:** Allow the installed application to discover and install a newer release from
within the application.

**Scope to investigate:**

- choose a trusted release host and update metadata format;
- use GitHub Releases as the proposed release host;
- support the installed Windows application only;
- introduce release signing and integrity verification;
- show version, release notes, download progress and clear failure recovery;
- make update checks configurable through BL-003;
- retain a manual update path.

**Approved UI behavior:** If an automatic startup check or the manual `Check for
updates` action finds a newer compatible version, show `Update available` in the main
screen header. Selecting it starts the update flow. If a manual check finds no update,
show `No updates available` below the manual button. Do not treat a connection or
metadata error as confirmation that no update exists. Disabling startup checks does not
disable the manual action. See `../settings/README.md`.

**Acceptance direction:** The application accepts only an authentic, compatible
release and can recover from interrupted or failed downloads without damaging the
installed version.

**Approved direction:** Publish releases from the owner's GitHub repository and use the
NSIS-compatible update flow. Do not embed a personal GitHub token in the application.
A public release repository is preferred so installed copies can read update metadata
and download release assets without user credentials. For Windows code signing, first
apply to a free signing program for eligible open-source projects, with SignPath
Foundation as the current preferred option. Do not purchase a commercial signing
certificate at this stage. If the project is not accepted, record the reason and make
a separate decision before public rollout; self-signed certificates are not considered
a substitute for a publicly trusted signature.

**Open decisions:** Eligibility and acceptance by the free signing program, installation
timing and staged rollout. The startup-check default is enabled under BL-003.

## BL-006 — PMDG 737 and 777 support

**Goal:** Extend scenario generation beyond Fenix to the complete current PMDG 737NG
and 777 pool selected for the project.

**Scope to investigate:**

- support the 737-600, -700, -800 and -900/900ER as one catalog family with
  variant/configuration applicability;
- support the 777-200LR, -200ER, -300ER and 777F as a second catalog family;
- obtain an authoritative MMEL/MEL basis applicable to that aircraft family;
- inventory the failures actually supported by the selected PMDG product;
- create a separate mapping between document items and PMDG controls;
- implement separate PMDG 737 and PMDG 777 adapters because their SDK structures and
  events are not interchangeable;
- introduce an aircraft-provider layer so Fenix and PMDG data do not mix;
- keep document provenance and compatibility rules isolated by aircraft family.

**Acceptance direction:** Selecting a PMDG aircraft uses only its reviewed documents,
failure mappings and compatibility rules; no Airbus or Fenix record can enter the
scenario.

**Research result:** Both PMDG families contain extensive internal failure simulation.
Their SDKs make external aircraft integration plausible, but the reviewed public
material does not establish a supported direct failure-injection command. Inspect the
current installed SDK for each family separately before specifying automatic
activation. See `../research_simulator_integration/AIRCRAFT_MATRIX.md`.

**Open decisions:** First PMDG family to implement, initial variant subset and whether
automatic activation is part of the first PMDG release slice.

## BL-007 — Source document selection

**Goal:** Let the user choose which MMEL or operator MEL forms the basis of generation.

**Scope to investigate:**

- show document type, issuing organization/operator, aircraft applicability, revision
  and revision date;
- maintain a separate reviewed catalog and compatibility rules for every document;
- prevent records or conditions from different documents from being mixed;
- filter available documents by the selected aircraft and configuration;
- show the selected source on every result card;
- define how new revisions are added and older revisions are archived.

**Acceptance direction:** Every generated scenario is traceable to exactly one selected
document and contains only records validated against that document and configuration.

**Open decisions:** First additional document, revision-retention policy and whether
operator-specific procedures are displayed or only referenced.

## BL-008 — Up to 10 simultaneous failures

**Goal:** Increase the selectable scenario size from 1–3 to as many as 10 failures.

**Required redesign:**

- replace full precomputation of every valid combination with bounded constraint-based
  generation; enumerating all combinations does not scale to 10 failures;
- evaluate compatibility across the complete selected set, including alternative
  MMEL/MEL branches;
- define practical repetition behavior without storing every possible combination;
- prevent impossible or misleading high-failure scenarios;
- redesign the result screen for up to 10 readable cards;
- add performance limits, cancellation and clear error states when no valid set exists.

**Acceptance direction:** The generator returns a valid set within an agreed response
time, never duplicates an ID, applies all known compatibility rules and explains when
the requested number cannot be generated.

**Open decisions:** Whether every number from 1 through 10 is offered, whether high
counts require a warning, and whether operational realism should limit some scenarios.

## BL-009 — INOP placard

**Goal:** Provide an INOP placard representation for a generated failure when an
inoperative indication is appropriate for the simulated scenario.

**Scope to investigate:**

- define the placard content and visual format;
- determine whether one placard is produced per failure or per affected control/item;
- link each placard to the exact generated failure and selected source document;
- prevent the application from inventing placement, maintenance action or operator
  wording that is not supported by the selected MEL/MMEL or an approved template;
- define preview, copy, print and export behavior;
- keep placards associated with the scenario when up to 10 failures are displayed.

**Acceptance direction:** Every generated placard is traceable to a specific failure,
uses the approved format and contains no unsupported maintenance or operational
statement.

**Open decisions:** Placard template, exact wording, physical placement information,
print/export formats and whether placards appear inside cards, the Technical Log view
or a separate screen.

## BL-010 — Scenario generation engine redesign

**Type:** Foundation epic. BL-011, BL-012 and BL-013 are separate user-facing features
built on this engine.

**Goal:** Replace the current uniform one-to-three-failure combination pools with a
versioned scenario-generation engine that can combine applicability, compatibility,
failure count, severity, occurrence weighting and an optional zero-failure outcome.

**Required capabilities:**

- accept a generation profile for the selected simulator, provider, aircraft,
  configuration and source document;
- filter inapplicable records before random selection;
- support a documented zero/nonzero outcome policy;
- select a failure count within the profile's supported range;
- select failures using reviewed occurrence weights and a requested severity range;
- enforce all pair, triple and higher-order compatibility constraints on the complete
  set;
- avoid precomputing every possible combination so the design can support BL-008;
- provide deterministic seeded operation for automated tests without exposing a random
  seed as a normal user setting;
- return an explanation record containing profile version, eligible pool, selected
  strategy and validation result;
- preserve a uniform mode for comparison, testing and catalogs that have no approved
  weights;
- keep generation deterministic code-driven logic rather than runtime AI.

**Recommended generation pipeline:**

1. Resolve the exact aircraft and document profile.
2. Build the applicable and compatible candidate pool.
3. Draw the serviceable or non-serviceable scenario outcome when that mode is enabled.
4. Select failure count and requested severity range.
5. Perform weighted sampling without replacement while enforcing constraints.
6. Validate the complete result independently before presenting it.
7. Record non-sensitive diagnostic metadata for reproducible tests and support.

**Acceptance direction:** Given a fixed profile and test seed, the engine returns a
reproducible valid result. Across large statistical tests, observed zero-failure,
failure-count, severity and item-selection distributions remain within agreed
tolerances, and incompatible failures are never returned.

**Open decisions:** Exact sampling algorithm, interaction between severity and
occurrence weights, revised no-repeat behavior, statistical tolerances, profile version
format and whether users can select named generation presets.

## BL-011 — Failure severity selection

**Goal:** Let the user request a scenario by difficulty/severity in addition to choosing
the number of failures.

**Scope to investigate:**

- define an explicit rubric for simulator challenge rather than relying on subjective
  labels alone;
- assess dimensions such as crew workload, operational limitation, system impact,
  handling impact and the number of dependent functions affected;
- decide whether each failure has one severity class or a score assembled from several
  dimensions;
- define user-facing choices such as Light, Moderate, Serious and Any;
- calculate and display the severity of a multi-failure scenario;
- prevent several individually light failures from producing an unexpectedly extreme
  combined scenario without being classified accordingly;
- keep severity metadata specific to an aircraft/provider mapping where simulation
  behavior differs.

MEL repair categories A, B, C and D must not be used as severity levels. They describe
repair intervals, not operational impact or simulator difficulty. For example, the
proposed distinction between an MCDU failure and a simple switch failure must be justified
through the agreed rubric and verified simulator effects.

**Acceptance direction:** The selected severity option produces scenarios inside the
documented range, and every assigned score can be traced to reviewed criteria rather
than an unexplained label.

**Open decisions:** Severity dimensions and thresholds, labels shown to the user,
combined-scenario calculation, aircraft-specific overrides and treatment of failures
whose impact changes with flight phase or configuration.

## BL-012 — Failure occurrence weighting

**Goal:** Make commonly occurring simulated defects more likely to be selected than
rare defects while preserving applicability and compatibility rules.

**Scope to investigate:**

- store an occurrence weight, source, scope, revision/date and confidence level for
  every weighted record;
- distinguish a relative selection weight from a real failure probability or rate;
- seek aircraft/component reliability data that is legally usable and applicable to
  the represented aircraft and operation;
- keep separate weight profiles when aircraft family, provider, configuration or data
  basis differs;
- define a clearly labelled heuristic profile if reliable real-world rates are not
  available, without presenting it as real-world statistics;
- define fallback behavior for records with missing or incomparable data;
- test the distribution over large reproducible samples;
- document how compatibility rejection and severity filtering affect final marginal
  frequencies.

The relative expectation that APU or PACK defects should appear more often than an MCDU
defect is a product hypothesis until supported by a suitable data source. No numerical
rate should be invented from general experience or from the MMEL itself.

**Acceptance direction:** Every non-uniform weight has explicit provenance and scope,
the implemented sampler matches the approved distribution within agreed tolerances,
and the interface distinguishes sourced weighting from heuristic weighting.

**Open decisions:** Acceptable data sources, weight units, confidence thresholds,
fallback profile, user visibility of probability information and how often profiles are
reviewed.

## BL-013 — Serviceable-aircraft outcome

**Goal:** Add an optional pre-flight draw in which the result can contain no generated
deferred defects, allowing the user to check before each flight whether the scenario is
serviceable or contains one or more failures.

**Proposed modes:**

- `Always generate failures` — preserves the current product behavior;
- `Pre-flight dispatch draw` — may return zero or more failures according to the active
  profile.

**Scope to investigate:**

- define the probability of the zero-failure outcome separately from the probability
  distribution among individual failures;
- decide whether failure count is drawn by the engine or still constrained by a user
  maximum;
- present a clear serviceable result without manufacturing an empty failure card;
- preserve the result for the current session so repeated navigation does not redraw
  the aircraft condition;
- require an explicit new draw for the next flight/scenario;
- ensure that a zero-failure result does not clear failures already active in MSFS;
- describe the result as no generated deferred defects within the modeled catalog,
  rather than proof that every aircraft system is physically defect-free.

**Acceptance direction:** With pre-flight dispatch draw enabled, the engine can return a
stable, explicit zero-failure scenario at the configured rate, does not send simulator
activation or clearing commands for that outcome, and redraws only when the user starts
a new scenario.

**Open decisions:** Source and value of the serviceable-aircraft probability, whether
the user sees or can adjust it, failure-count distribution after a nonzero draw and the
exact wording of the serviceable result.

## BL-014 — Flight Sim Labs A321 support

**Goal:** Add the current Flight Sim Labs Airbus products for MSFS: A321ceo and
A321neo, including their reviewed engine and airframe configurations.

**Research direction:** Keep the FSLabs Techlog/MEL feature separate from the
application's source-document catalog. Determine whether FSLabs offers a supported
software interface for creating and reading an inoperative item; the published MSFS
Hardware Interface alone does not establish that capability.

**Acceptance direction:** Only applicable A321ceo/A321neo records are generated, and
automatic activation is offered only for mappings with a supported command and
independent readback.

## BL-015 — Aerosoft/ToLiss A340-600 Pro support

**Goal:** Add the Aerosoft Aircraft A340-600 Pro developed with ToLiss for MSFS
2020/2024.

**Research direction:** The aircraft includes 303 internally triggered failures, but a
complete public external fault-injection API was not found. Ask Aerosoft/ToLiss for a
supported interface and treat discovered LVars/Input Events as candidates until tested.

**Acceptance direction:** The Standard/High Gross Weight applicability and selected
document are preserved, and every automatic mapping has ECAM/system-state readback.

## BL-016 — iniBuilds A350 support

**Goal:** Add the iniBuilds A350-900, A350-1000 and A350 ULR.

**Research direction:** Use the official key-LVar material for discovery, but do not
assume that cockpit-control variables can operate the OIS failure manager. Keep current
A350 V1 mappings separate from the announced MSFS 2024-only A350 V2.

**Acceptance direction:** Variant-specific catalog records and activation mappings are
versioned independently, and an A350 update cannot silently reuse an unverified mapping.

## BL-017 — iniBuilds A380 support

**Goal:** Add the iniBuilds A380 Airliner for MSFS 2024, including Trent 900/GP7200 and
Early-MSN/Modern-MSN applicability.

**Research direction:** Inventory the newly released ATA-organized failure system and
request an external failure API or official variable/event list. Runtime discovery may
identify candidates, but EFB/OIT screen automation is excluded.

**Acceptance direction:** The adapter identifies the selected engine/software
configuration and activates only mappings verified on the declared A380 version.

## BL-018 — Synaptic A220 support

**Goal:** Add support for Synaptic A220-300. The current feasibility experiment targets
MSFS 2024 and the user's iniManager installation, reported version 1.0.7a. No other
aircraft variants are included in this work.

**Current milestone (19 September 2026):** Demonstrate external activation and restoration
of one reversible component condition through a documented switch or circuit breaker,
with independent evidence of the system effect. A full catalogue, MMEL mapping and
exhaustive failure testing are outside this experiment.
See [the feasibility scope](../research_simulator_integration/SYNAPTIC_A220_SCOPE.md).

**Feasibility milestone completed, 19 September:** The user confirmed the VHF 1 inoperative
indication after external R C1 activation and radio recovery after restoration.
Breaker positions were verified by telemetry. This establishes the method for this
one component and installation with human verification; the complete adapter remains
future work. Standard COM STATUS stayed 0 and is unsuitable for verifying this condition.
See [the test report](../research_simulator_integration/synaptic_a220/README.md).

**Research direction:** Synaptic publishes writable LVars, H-events and Input Events for
external applications, making the A220 the preferred first non-Fenix adapter proof of
concept. Start with a reversible circuit-breaker-based inoperative state. A direct internal
fault interface is still required for failures that cannot be reproduced through
documented controls.

**Later catalogue-integration acceptance:** Activation is tied to a reviewed A220 catalog record, passes
aircraft-state readback and never reports success from circuit-breaker position alone.

## BL-019 — Fenix event-type failures

**Goal:** Add Fenix failures that represent a simulated event rather than an MMEL/MEL
deferred-defect item, such as an engine hot start, and allow them to be generated in the
same scenario alongside MEL-based failures.

**Required separation:** Event failures use a dedicated catalog and are explicitly
labelled as simulator events. They must not receive an MMEL/MEL item number, dispatch
relief, source-document conditions or other regulatory provenance unless a separate
review establishes a real document relationship. The existing MEL catalog remains
unchanged.

**Scope to investigate:**

- define the initial list of supported Fenix event failures;
- map each event to the exact Fenix Manual Failures manager ID;
- verify activation through a separate `failed=true` manager readback and verify
  restoration where the event supports clearing;
- define when an event is triggered, including immediate, engine-start or other
  condition-dependent behavior;
- define compatibility between event failures and MEL failures in the same scenario;
- define whether events are additional to the selected MEL failure count or included in
  a combined scenario limit;
- present event cards so they cannot be mistaken for MEL dispatch-relief cards;
- preserve one generation result containing both the MEL set and any selected events.

**Acceptance direction:** A generated event is clearly identified as a Fenix simulator
event, activates the exact mapped Fenix manager record at the defined trigger condition,
and does not invent an MMEL/MEL reference or dispatch provision.

**Open decisions:** Initial event list, event count and probability, user controls,
trigger model, compatibility rules, presentation and whether non-clearable events require
an aircraft reload between scenarios.

## BL-020 — Expand the Fenix MEL failure pool

**Goal:** Expand the current 53-record Fenix MEL catalog with additional failures that
are available in the Fenix Failure Manager and can be tied to a reviewed item in the
selected MMEL or operator MEL.

**Scope to investigate:**

- inventory the complete Fenix Failure Manager pool for each supported Fenix aircraft
  and configuration;
- identify additional failures with a defensible relationship to the selected source
  document;
- record model, engine and configuration applicability instead of assuming that every
  new item applies to the complete Fenix family;
- add dispatch conditions and compatibility constraints from the reviewed MMEL/MEL
  branch;
- map every accepted catalog record to the exact Fenix failure-manager ID;
- verify activation through a separate `failed=true` manager readback and verify
  restoration where supported;
- add the accepted records to the redesigned generation profiles, severity model and
  occurrence-weight model introduced by BL-010 through BL-012;
- preserve the current 53-record catalog until each new record completes source and
  mapping review.

**Acceptance direction:** Every added record has a reviewed MMEL/MEL basis, explicit
aircraft/configuration applicability, generation compatibility rules and a verified
Fenix manager mapping. A Fenix simulator event without dispatch-relief provenance remains
in the separate BL-019 event catalog.

**Open decisions:** Target catalog size, expansion order by ATA chapter, treatment of
items with several MMEL alternatives, first additional source document and whether the
expanded pool is delivered in one release or in reviewed batches within version 2.0.0.

## Dependency notes

- BL-004 should follow the settings foundation in BL-003.
- BL-005 should use BL-003 for update preferences. It targets only the installed app
  and will use the public GitHub repository. Its remaining distribution dependency is
  acceptance by the selected free open-source signing program and the resulting CI
  signing setup.
- BL-006, BL-014, BL-015, BL-016, BL-017, BL-018 and BL-007 require a data
  architecture that isolates aircraft, configurations, source documents and failure
  mappings.
- BL-001 must be researched separately for each supported aircraft family; the current
  matrix is `../research_simulator_integration/AIRCRAFT_MATRIX.md`.
- BL-008 should be implemented on BL-010; both require replacing full combination-pool
  precomputation and revising the current no-repeat model.
- BL-009 depends on agreed placard wording and should reuse source-document data from
  BL-007 without treating the placard as proof that required maintenance action was
  completed.
- BL-011, BL-012 and BL-013 are separate features under the BL-010 foundation epic so
  they can be researched, approved and released independently.
- BL-012 must not block BL-010: the engine needs a uniform fallback when sourced weights
  are unavailable.
- BL-013 supersedes the earlier failure-only product boundary only when its optional
  pre-flight mode is enabled; `Always generate failures` remains available.
- BL-019 must remain data-separated from the MEL/MMEL catalog. If event and MEL failures
  are selected in one scenario, their combined selection and compatibility rules should
  be implemented through BL-010 rather than by merging their source records.
- BL-020 targets version 2.0.0 with BL-010 because the larger Fenix catalog should use
  the redesigned applicability, compatibility, severity and weighting model rather than
  extend the current precomputed combination pools.

## Backlog workflow

Suggested statuses: **Proposed → Research → Specified → Approved → In Development →
Verification → Done**. An item may also be marked **Blocked** or **Rejected**, with the
reason recorded beside it.
