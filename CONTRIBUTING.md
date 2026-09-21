# Development workflow

## Branches

- `main` contains stable, reviewed releases.
- Create a short-lived branch for each change from the current `main` branch.
- Use names such as `feature/automatic-failure-activation`,
  `fix/fenix-reconnect`, or `docs/update-integration-matrix`.
- Merge changes into `main` through a GitHub Pull Request after tests pass.
- Delete the feature branch after the Pull Request is merged.

A permanent `develop` branch is not required while the project has one active
development stream. It can be introduced later if several unreleased features
must be integrated together before a release.

## Commit scope

Commit source code, tests, documentation, research records, and configuration
needed to reproduce a build. Do not commit `node_modules`, test profiles,
diagnostic logs, generated installers, or local reference PDFs.

## Before pushing

Run the automated tests:

```powershell
node --test development/tests/*.test.cjs
```

For a release candidate, also build the NSIS installer from `production/` and
run the packaged application QA. Upload the installer and SHA-256 checksum to a
GitHub Release instead of adding them to Git history.

## Releases

After a Pull Request is merged into `main`:

1. update the application version;
2. build and verify the installer;
3. create an annotated Git tag such as `v1.1.0`;
4. push the tag;
5. create a GitHub Release and attach the installer and checksum.

