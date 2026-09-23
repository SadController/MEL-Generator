# Core and Integration Service boundary

Decision date: 20 September 2026.

## Decision

Retain Electron for presentation, settings, update UI and desktop lifecycle. Put
scenario-domain logic and simulator/provider integration behind a self-contained .NET 8
service. C# is the implementation language; .NET is the runtime and build platform.

This avoids a user-interface rewrite while preventing future aircraft adapters,
document profiles and BL-010 generation strategies from accumulating in the Electron
main process.

## Ownership

| Component | Owns | Must not own |
|---|---|---|
| Electron renderer | User interaction and presentation | Catalogue rules, random selection, SimConnect or provider APIs |
| Electron main process | Window lifecycle, preferences, updater, service supervision and trusted IPC | Generation algorithms or provider-specific activation logic |
| `MelGenerator.Core` | Versioned profiles, compatibility, generation strategies, result validation and explanation records | UI or simulator transport |
| Integration Service | JSON protocol, core hosting, SimConnect state and provider adapters | Product presentation |
| JSON data | Reviewed catalogue, MMEL rules and provider mappings | Executable behavior |

## Protocol

The private newline-delimited JSON protocol is version 2. Electron starts the service
with redirected standard streams. Requests contain `protocolVersion`, `type`,
`requestId`, `method` and `payload`; responses echo `requestId`. State messages are
unsolicited. Unknown versions and methods fail explicitly.

The boundary is intentionally provider-neutral. A future adapter may implement PMDG,
Synaptic, iniBuilds, FSLabs or Aerosoft/ToLiss behavior without changing renderer IPC.
Provider-specific commands and readback remain inside the service.

## BL-010 preparation

The core already exposes a profile reference, strategy name, deterministic seeded
random source and an explanation record. The current strategy exactly preserves the
approved uniform 1–3 failure behavior and compatibility branches. Future BL-010 work
may add optional profile fields and strategy implementations for applicability,
severity, occurrence weights, count policies and a zero-failure outcome.

This preparation does not implement BL-010. Until that epic is approved, the service
rejects any strategy other than `uniform` and any profile other than the current Fenix
FAA Rev. 32 profile.

## Migration evidence

- the legacy JavaScript engine remains under `development/legacy-core` as a comparison
  oracle and is excluded from the packaged application;
- all 24,857 one-to-three-failure sets still pass the independently recorded legacy
  compatibility tests;
- .NET tests independently reproduce pool sizes 53, 1,289 and 19,311;
- seeded generation is reproducible;
- Fenix activation and rollback tests now run against the .NET adapter;
- an executable-boundary smoke test generates a three-card scenario while MSFS is not
  running, proving the core is independent from simulator availability.
