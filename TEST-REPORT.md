# MEL Generator 1.0.0 - Checks report

Date: 16.09.2026. Checked the final build of Windows x64.

# Wednesday

- Windows 10 Enterprise LTSC, version 10.0.19044, x64.
- Electron 44.3.0, electron-builder 26.15.3, Node.js v24.19.0 for assembly.
- Interface: native HTML/CSS/JavaScript; no external services.
- Original MMEL: FAA A320 Rev. 32, 30.07.2025, 472 pages.

# Logic and catalog

All 8 automatic tests were completed. Verified:

- 53 entries, 29 profiles and 47 English terms and conditions. Identifiers,
EFB paths, MMEL points and pages and limitations coincide with agreed
JSON research team. Texts of cards checked with saved English
Removal of the MMEL points used.
- All 24,857 sets: 53 singles; 1,378 pairs; 23,426 triples.
The results are consistent with an independent registry of 89 banned pairs and two.
additional minimum prohibited threes.
- 53 singles, 1,289 pairs and 19,311 triples are allowed; 89 pairs are blocked and
4,115 triples. There are no options for unpressurized flight.
- For each allowable set, the choice of an alternate line is the same as
the original rules. Some examples of two APs, two APU loops have been tested.
Two DCDUs, two TATs, CPC/FCUs, brakes and combinations of three heaters.
- Completed a full cycle of issuance of each pool. The combinations don't repeat.
The switching of the aircraft and quantity keeps the relevant history.
There is no repetition at the boundary of cycles. A new generator starts a new cycle.
- Error requests are rejected; settings are restored from the file.
Damaged settings are replaced by standard ones. Scripts are not saved.
- The attached PDF coincides with the received source.

# Application and ready EXE

Successfully completed inspections of the original, re-run, packaged,
Portable versions installed and transferred. Real windows were checked and
renderer Electron, not just a separate generator module.

- A319/1, A320/2, A321/3: correct signatures and number of cards.
- To failures creates results; Setup/Failures and Back to main menu
current outcome and choice. 54 sequential generation via interface
pass the limit of the single failure cycle without neighboring repetitions.
- A319/1 Settings restored after restart; Failures tab again
Blocked before the first result - the old story does not load.
- All generation, tab and PDF checks are done with the network disabled
Electron session. The application does not use a local HTTP server.
- PDF is opened in a separate window on the page from the selected card. At closing
The viewer's score is saved. An example of the latest Portable Verification:
  mel://app/MMEL.pdf#page=281&zoom=page-width.
- Interface shots and PDF viewed. A normal and narrow window has been checked.
There is no horizontal overflow and Russian inscriptions in the interface.
- Context isolation and absence of required/process in renderer
Preload provides only four operations.
- Packaged main, QA, UI, and JSON are byte-byte verified with the source files.
- Portable EXE is copied and launched from the Portable Build Check folder.
The profile is also in transit with Cyrillic and gaps.
- NSIS is installed in a separate test folder. Installation completion code: 0.
A Start menu shortcut and a deletion record are created in HKCU. Installed annex
Integration checks have been successful.
- Deletion: code 0. Verified absence of installed EXE, shortcut and record
removal. The test setup is removed, both distributed assemblies are saved.
- There are no raw interface errors in the final integration checks.

# Dimensions and composition

- Portable: 95,970,074 bytes.
- Installer: 96,124,896 bytes.
- Both EXEs include Electron and FAA PDF. Separate Node.js, Python or
A browser is not required for the user. Electron/Chromium licenses are included.
- EXE is not signed by a publisher certificate. SHA-256 files are in SHA256SUMS.txt.

# Boundaries of verification

- Windows 11 and a separate clean virtual machine were not checked.
Target Windows 10/11 x64 does not mean checking all computer configurations.
- No Fenix failure tests, automatic failure activation,
routing/weather check or reassessment of applicability for engines.
This corresponds to the agreed scope of the project.
- The interface is checked by the built-in Electron script and viewing the received
photos. Read this Portable window through Windows UI
Automation. External tool clicks / snapshots Windows on this LTSC issued
Error SetIsBorderRequired / unsupported interface, so manual passage
All buttons are not represented by this tool.
- Early test shots were sometimes requested before the first frame and given
UnknownVizError. In the test scenario added waiting frame; final
The scans were again successful.

Computer-readable results and images are saved in the test-output / project:
- dev-qa/integration.json
- restart-qa-fixed/integration.json
- packaged-qa/integration.json
- installed-qa/integration.json
- portable-final-qa/integration.json
- installation.json

Historical unsuccessful attempts are saved for diagnosis and do not apply to
final check. The original archive contains tests and instructions for their repetition.
