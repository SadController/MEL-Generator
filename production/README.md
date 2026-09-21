# MEL Generator 1.1.0 beta 1

Windows desktop application for Fenix A319 / A320 / A321 in flight simulation.
Uses the agreed pool of 53 failures and FAA A320 MMEL Rev. 32 (30 July 2025).

# Run

Install `release/MEL-Generator-Setup-1.1.0-beta.1.exe` for the current Windows user.
The assisted installer offers a `Create desktop icon` checkbox and always creates the
approved Start menu shortcut.
Portable editions are no longer produced. No separately installed browser, Node.js or
Python is required.
Choose the aircraft and 1–3 failures, then select **To failures**. **View source** opens the bundled PDF at the selected MMEL page.
Failures can be activated with **Activate failures** on the briefing, manually from the
displayed EFB path, or automatically when `Automatically activate failures` is enabled
in Settings. The briefing button becomes available when the two integration indicators
show that a supported Fenix aircraft and its adapter are ready.

The installed application checks the public GitHub release channel when enabled in
Settings. **Update available** downloads the compatible NSIS release and shows progress;
after verification it changes to **Restart to update**. Public update acceptance still
requires the approved Authenticode certificate and a signed installed-update test. The
project owner submitted an application to the SignPath Foundation program on
20 September 2026; its decision is pending.

Expected failures use a stable public error code, a plain-English explanation and a
recovery action. Update connection failures are kept distinct from `No updates
available`, and failed automatic activation preserves the briefing for manual action.
Raw exceptions, stack traces, HRESULT values and local paths are shown only in the
opt-in diagnostic log, never in the normal interface.

The two circles in the header have no visible labels. Hover over either circle for its
description. The first is green when MSFS is connected and a loaded aircraft is
identified; the second is green when the loaded aircraft has a ready automatic-
activation adapter. A gray circle represents an unlit, unavailable state.

The current Fenix adapter uses the local Fenix EFB gateway at
`http://127.0.0.1:8083/fenix`. It validates the complete 53-record mapping before it
reports ready, activates each generated record, and independently reloads the Fenix
Manual Failures catalogue to confirm the result. If a multi-failure operation fails,
the application attempts to restore only failures that it activated during that
operation; failures already active before the operation are preserved.

Scenario generation and simulator integration now run in the bundled self-contained
.NET 8 Integration Service. Electron communicates with it through a private versioned
JSON protocol over standard pipes. The service owns the generation core, SimConnect and
Fenix adapter; the Electron application remains the presentation and desktop-lifecycle
shell. Users do not need to install .NET separately. See `service/README.md`.

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
pnpm start
pnpm build
```

If Electron's postinstall was disabled by a local package-manager policy, run
`node node_modules/electron/install.js` before `pnpm start` or `pnpm build`.
Electron 44.3.0 and electron-builder 26.15.3 are pinned in `package.json`.
The `node-linker=hoisted` setting is required for desktop packaging.

# Verification

The test suite, reviewed research data, verification records and maintenance scripts
are stored in `../development/`. They are not required to run or rebuild the app.

Optional application integration test (uses an isolated profile):

```text
pnpm exec electron . --profile-dir=D:\MEL-QA\profile --qa-output=D:\MEL-QA\results
```

The same arguments work with the packaged application. This explicit test mode
exercises its own interface, disables network access for the test, saves screenshots
and `integration.json`, and exits. Use a dedicated profile and output folder.
Normal startup never runs these tests.

# Project layout

- `desktop/`: Electron main process, restricted preload, preferences, integration
  orchestration and opt-in QA.
- `integration/`: Fenix mapping and the out-of-process SimConnect identity helper.
- `ui/`: approved design connected to real data.
- `core/`: compatibility evaluation and random selection.
- `data/`: English catalogue and rules.
- `resources/`: unchanged FAA PDF, app icon and third-party notices.
- `node_modules/`: installed dependencies used to run and rebuild the source.
- `release/`: installer EXE files plus the user instructions.

Research, source documents, tests, design history, release records and the historical
web prototype are kept in the sibling `development/` folder.

Preferences are stored in `%APPDATA%\MEL Generator\settings.json`. No scenario history
is saved across launches. Update checks use the public stable GitHub Release endpoint;
the current alpha opens an available release page for manual installation. Automatic
download and installation remain part of BL-005. Optional diagnostic logs are stored as
JSON Lines under `%APPDATA%\MEL Generator\logs`, rotate at 10 MB and are deleted after
seven days. The build is unsigned; no signing certificate is included in this project.

The installer includes the unmodified native `SimConnect.dll` from Microsoft Flight
Simulator 2024 Core SDK 1.7.3. The integration helper looks for `SimConnect.dll` in this
order: the `MEL_GENERATOR_SIMCONNECT_DLL` support environment variable, the bundled SDK
library, and the optional `%APPDATA%\MEL Generator\simconnect-path.txt` support override.
It does not load an arbitrary DLL discovered inside the Community folder.

This is a flight simulation application. Card text summarizes the selected source
provision; the complete original PDF is available offline. See the bundled
third-party notices and Electron/Chromium license files.
