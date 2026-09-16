# MEL Generator - development proposal

Date: 15.09.2026. **Status: approved by user 15.09.2026; version 1.0.0 developed and verified 16.09.2026.** Approved interface: `design/index.html`. Working data: `research_fenix/efb_mmel_pool/`. This proposal does not change the current directory and rules.

# 1. Format of delivery

We offer a desktop application for Windows x64. Target versions are Windows 10/11; the actual verified versions will be listed in the report. The main delivery is one portable EXE that is launched without installation. Additionally, one EXE installer to install in the current user profile and create a shortcut in the Start menu. Only one of the two assemblies is selected for use.

Each EXE contains an application, directory, rules, interface resources and FAA MMEL PDF. Separate installation of the browser, Node.js or Python is not required. Application operation and document viewing are completely local, without running an HTTP server, account, API key and connection to Fenix.

One EXE means one distributed file. The Portable build when you start unpacks the service components into a temporary folder; the regular installer places the application files in its folder. The user does not collect these files manually. Settings are saved automatically in the user profile.

The size reference for each EXE is 100–200MB; this is an estimate, the exact size will be known after assembly. Electron includes its own interface display environment, which increases the size, but allows you to save the layout and avoid dependence on the separately installed WebView2.

# 2. Technology

| Part | Proposed technology | Purpose |
|---|---|---|
| Application shell | Electron | Windows window, local files, PDF, saving settings |
| Interface | Existing HTML/CSS and JavaScript | Saving approved layout; no additional UI framework |
| Logic | Separate JavaScript module | Combination selection, random selection, applicable MMEL conditions |
| Data | Built-in JSON | 53 failures, English texts and current rules |
| Assembly | electron-builder | Portable EXE and conventional NSIS EXE installer |
| Checks | Logic tests and check of assembled application | Verification of all combinations and user path |

Dependency versions are fixed at the start of development. The interface works with context isolation, without direct access to Node.js; local system actions are limited to necessary operations. The external server is not required. Update the first version by manually replacing the Portable EXE or launching a new installer.

# 3. Application behavior

1. At launch, Setup opens with the last selected aircraft and the number of failures; at first launch, A321 and 2.
2. Aircraft: A319/A320/A321. Number of failures: 1/2/3. The choice of aircraft determines the signature of the script; the pool is the same. There is no engine choice or category.
3. To failures creates a new random set and opens Failures. Each tap performs a new selection without repeating the combinations until the current sized pool is exhausted. The order of rejection does not change the identity of the set.
4. There are no repeating IDs in one set. Check the entire set, including the restrictions on threes. There are 89 prohibited pairs and 2 additional minimum prohibited triples. The option of unpressurized flight is excluded.
5. If the MMEL offers a valid alternate string to match, the cards receive the conditions of that particular string. The same MMEL item with general conditions can occur on several cards.
6. The set is selected equally likely among the permissible sets of the requested size. To do this, a list of permissible sets is formed and randomly shuffled. Sets are drawn without replacement. For each number is a separate cycle, common to all aircraft. After exhaustion, the pool is shuffled again; the first combination of the new cycle does not repeat the last previous one. History resets when it restarts. Equal probability applies to sets: individual failures can occur with different frequency due to the prohibitions of combinations.
7. Back to main menu returns to settings and saves them. The top tab of Failures returns to the already created set. Switching tabs does not create a new set.
8. View source opens the attached FAA MMEL PDF in a separate view window on the desired page. The current scenario is saved in the main window.
9. When closing, the aircraft, the number of failures and window parameters are saved. Scenarios and failures between launches are not saved.

The entire interface, application menu, English names of all 53 failures and terms of all MMEL strings used will be in English. The terms are translated and verified with the original English FAA MMEL. Source, revision, item numbers, ID and EFB paths are saved.

# 4. Structure of development

- `desktop/` - Electron shell and limited interface of system operations.
- `ui/` is a work interface based on an approved layout.
- `core/` - Compatibility rules and script selection without depending on the window.
- `data/` - prepared English catalog data and rules.
- `resources/` - FAA MMEL PDF and application icon.
- `tests/` – catalog checks, conditions, combinations and selection.
- `release/` - ready-made EXE and accompanying files.

`design/` is saved as an approved reference. Python research materials remain in the project; the installed Python application is not required.

# 5. Results that the user will receive

| Proposed name | Content |
|---|---|
| `MEL-Generator-1.0.0-portable.exe` | Main Assembly: one file to run without installation |
| `MEL-Generator-Setup-1.0.0.exe` | Alternative: Normal installation, shortcut and removal by Windows |
| `MEL-Generator-1.0.0-source.zip` | Sources, directory, rules, fixed dependencies and instructions for reassembly; no node modules and temporary files |
| `README.txt` | Short start, installation and use instructions |
| `TEST-REPORT.md` | What is verified, environment versions, results and remaining limitations |
| `SHA256SUMS.txt` | Checksums for finished files |

Dependency license details are included in the supply and source archive. The digital signature of the publisher is not expected to be automatic: its release will require an available certificate or signature service. Purchasing a certificate and publishing files online are not part of this agreement.

# 6. Preparedness criteria

- Approved appearance retained; Design preview and fixed examples replaced by working behavior.
- All 53 records have English texts and correct references to the source.
- All 53 single failures, 1,378 pairs, and 23,426 triples are aligned with current rules; translating logic into JavaScript does not change results.
- Alternative MMEL conditions and the exclusion of unpressurized flight are taken into account.
- Work 1-3 cards, transitions, return to the existing scenario, save selected settings and view PDF.
- Checked exactly collected EXE: start, restart, installation / removal of the installation assembly, work without the Internet and after transferring Portable EXE to another folder.
- Checked paths with gaps and Cyrillic. The actual checks available on pure Windows and their limitations are reflected in the report, without a statement of untested testing.

# 7. Implementation following agreement

1. Transfer the approved interface to the application shell.
2. Prepare English data and connect the rules of combinations.
3. Implement generation, viewing PDF and settings.
4. Check the logic and user path.
5. Collect both EXE variants and check the finished builds.
6. Prepare the original archive and accompanying files.

# Proven technical sources

- Electron, composition and purpose: https://www.electronjs.org/docs/latest/
- electron-builder, Windows delivery options: https://www.electron.build/v26/docs/targets/
- Portable EXE, temporary unpacking: https://www.electron.build/docs/api/app-builder-lib.interface.portableoptions/ **The user has approved the concept and the start of development, including generation without repetition in the current launch.**