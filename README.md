# MEL Generator

MEL Generator is a Windows desktop application for generating Fenix Airbus
A319/A320/A321 failure scenarios and, when enabled, activating supported
failures in the loaded aircraft.

## Repository layout

- `production/` contains the application source and the files required to
  build and run it.
- `development/` contains tests, research, source-document records, design
  material, the backlog, and development documentation.

Generated installers are intentionally excluded from Git. Publish release
installers and their checksums as GitHub Release assets.

## Development

Install dependencies and run the automated tests from the repository root:

```powershell
cd production
pnpm install
cd ..
node --test development/tests/*.test.cjs
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the branch and release workflow.

