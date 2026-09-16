# MEL Generator 1.0.0

Offline Windows desktop application for Fenix A319 / A320 / A321 in flight simulation.
Uses the agreed pool of 53 failures and FAA A320 MMEL Rev. 32 (30 July 2025).

# Run

Use `release/MEL-Generator-1.0.0-portable.exe` without installation, or install
`release/MEL-Generator-Setup-1.0.0.exe` for the current Windows user.
No separately installed browser, Node.js, Python or running web server is required.
Choose the aircraft and 1–3 failures, then select **To failures**. **View source** opens the bundled PDF at the selected MMEL page.
Set the failures manually in the Fenix EFB using the displayed path.

Aircraft selection changes the scenario label. The same catalogue is used for
all three aircraft and both engine types, as agreed for this simulation project.
MMEL conditions concerning weather, route, maintenance and equipment outside the
catalogue remain on the cards. Simulator secondary effects are not modeled.

# Random selection

Each failure count has its own shuffled pool of valid combinations. Combinations
are drawn without replacement until that pool is exhausted, then reshuffled.
The last result of one cycle cannot be the first result of the next cycle.
Aircraft changes and tab navigation do not reset these pools. Restarting the app
resets them. Individual failures can recur in different combinations.

Valid pools: 53 singles, 1,289 pairs, 19,311 triples. The evaluator checks all
selected failures against the alternative MMEL branches; it preserves the first
compatible branch and displays that branch's conditions. The unpressurized
configuration is excluded. No arbitrary category or engine filters are applied.

# Build from source

Prerequisites for development only: Windows x64, Node.js 24, pnpm 11.19.0 and
internet access to download pinned build dependencies and Electron/NSIS assets.

```text
pnpm install --frozen-lockfile
pnpm test
pnpm start
pnpm build
```

If Electron's postinstall was disabled by a local package-manager policy, run
`node node_modules/electron/install.js` before `pnpm start` or `pnpm build`.
Electron 44.3.0 and electron-builder 26.15.3 are pinned in `package.json`.
The `node-linker=hoisted` setting is required for desktop packaging.

`pnpm prepare-data` regenerates English data from the reviewed research JSON and
the explicit translations in `scripts/prepare-data.cjs`. It does not change the
reviewed compatibility rules. Icon regeneration is optional and uses Python/Pillow;
the generated icon is already included, so Python is not needed to build the EXEs.

# Verification

`pnpm test` exhaustively checks all 24,857 one-to-three-failure sets against the
independent recorded forbidden combinations. It also checks branch selection,
complete nonrepeating draw cycles, invalid requests, English coverage, source PDF
identity and preference persistence.

Optional application integration test (uses an isolated profile):

```text
pnpm exec electron . --profile-dir=D:\MEL-QA\profile --qa-output=D:\MEL-QA\results
```

The same arguments work with the packaged application. This explicit test mode
exercises its own interface, disables network access for the test, saves screenshots
and `integration.json`, and exits. Use a dedicated profile and output folder.
Normal startup never runs these tests.

# Project layout

- `desktop/`: Electron main process, restricted preload, preferences and opt-in QA.
- `ui/`: approved design connected to real data.
- `core/`: compatibility evaluation and random selection.
- `data/`: English catalogue and rules.
- `resources/`: unchanged FAA PDF, app icon and third-party notices.
- `tests/`: exhaustive logic and preference tests.
- `design/`: original approved mockup, retained as a reference.
- `research_fenix/efb_mmel_pool/`: reviewed canonical catalogue and evidence.
- `release/`: deliverables and verification report.

The old root-level `index.html`, `app.js`, `style.css` and `catalog.example.json`
are historical prototypes and are not included in the executable.

Preferences are stored in `%APPDATA%\MEL Generator\settings.json`. The Portable
EXE temporarily extracts its runtime. No scenario history is saved across launches.
Updates in version 1 are manual. The release is unsigned; no signing certificate
or online publication is included in this project.

This is a flight simulation application. Card text summarizes the selected source
provision; the complete original PDF is available offline. See the bundled
third-party notices and Electron/Chromium license files.
