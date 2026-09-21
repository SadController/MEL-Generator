# MEL Generator — Development Materials

This folder contains everything that is not required to run or rebuild the released
application itself.

## Contents

- `documentation/` — agreed boundaries and development proposal.
- `backlog/` — proposed features and dependencies for future releases.
- `research_fenix/` — Fenix applicability research, catalog source data and combination rules.
- `research_simulator_integration/` — SimConnect, WASM and aircraft-adapter research for automatic failure activation.
- `sources_mel_mmel/` — collected MEL/MMEL documents and source registry.
- `design/` — approved interface mockup and screenshots.
- `tests/` — logic and settings tests that were used for release verification.
- `test-output/` — generated QA artifacts and extracted source-package checks.
- `scripts/` — data preparation, packaging, reporting, icon and documentation utilities.
- `settings/` — proposed settings model, defaults and versioned expansion plan.
- `release-records/` — source archive, checksums and the 1.0.0 verification report.
- `historical-prototype/` — the early browser-only prototype, which is not part of the Electron app.
- `repository-snapshot/` — the preserved Git repository snapshot and its history.

The runnable source and release executables are in `../production/`.

The tests are wired to the sibling `production/` source and can be run from the project
root with:

```text
node --test development/tests/*.test.cjs
```

Some maintenance scripts retain paths from the original unified project layout. They
are preserved as development history and release evidence; the production application
does not call them.
