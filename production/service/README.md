# MEL Generator core and Integration Service

The application keeps Electron as the presentation shell and moves domain and simulator
work into two .NET 8 components:

- `MelGenerator.Core` owns versioned generation contracts, catalogue/rule validation,
  compatibility assessment, deterministic seeded operation for tests and the current
  uniform-without-replacement strategy;
- `MelGenerator.IntegrationService` is a self-contained Windows process that hosts the
  core, monitors MSFS through SimConnect and owns the Fenix adapter.

Electron communicates with the service through newline-delimited JSON over private
standard input/output pipes. Protocol version 2 supports `generate`, `activate` and
`status` requests. Every request has an ID and receives one success or structured-error
response. Unsolicited `state` messages carry simulator, aircraft and adapter readiness.
No local TCP listener is created by MEL Generator.

The current generation profile is explicitly identified as `fenix-faa-r32` version
`1.0.0`. The request contract also identifies simulator, provider, aircraft family,
variant/configuration and source document. These boundaries allow future profiles and
strategies to be added without placing provider-specific rules in the Electron UI.

Only the existing uniform 1–3 failure behavior is implemented. Severity, occurrence
weights, zero-failure outcomes and larger sets from BL-010 through BL-013 are not
implemented by this foundation.

## Build

Run from `production`:

```powershell
pnpm run build:service
```

The script uses the repository-local .NET SDK when present, otherwise `dotnet` from
`PATH`, and publishes a compressed self-contained `win-x64` executable to
`production/integration/service`. The application installer includes this executable
and its reviewed JSON data, so users do not need to install .NET separately.

Run the .NET tests with:

```powershell
dotnet test production/service/MelGenerator.sln --configuration Release
```
