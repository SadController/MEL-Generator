# A320 MEL Generator - Requirements

Date established: September 13, 2026. Updated September 15, 2026.

# Purpose

The application generates a random set of failures for Fenix aircraft of the Airbus A320 family based on the selected MMEL or MEL of a particular airline. The user independently activates the failures in Fenix.

# First version

Supported aircraft:

- Fenix A319;
- Fenix A320;
- Fenix A321.

09/14/2026: All 53 failures are considered applicable to the Fenix A319/A320/A321 and both CFM/IAE engine types. The pool is single, without division into categories and without filtering by model, engine or modification. This is an application assumption; the FAA MMEL's original reservations are not rewritten. The A319/A320/A321 is required in the interface; it sets the scenario label and does not change the pool. There is no engine choice.

# The user path

1. Open the app.
2. Select aircraft A319, A320 or A321.
3. See selected source - FAA A320 MMEL Rev.32 dated July 30, 2025; selection of other sources has been delayed.
4. Select the number of failures from 1 to 3.
5. Press **Prepare briefing**.
6. Go to a separate tab **Failures** with cards. The button **Back to main menu** returns to the tab **Setup**, saving the settings.
7. Self-activate the corresponding failures in Fenix.

# Sources

Current decision of September 13, 2026: during the data collection and applicability verification phase we use only **FAA A320 MMEL, Revision 32, July 30, 2025**. The selection of other MEL/MMELs has been delayed. Previously collected documents remain a reference archive and are not used to supplement FAA dispatch relief provisions. Fenix documentation is a source of information about the capabilities of the simulator.

Each document should be displayed with the full designation:

- Document type: MMEL or MEL;
- organization or airline;
- family or models of aircraft;
- revision number;
- revision date.

In one scenario, only one selected document is used. Items of different MMEL/MEL are not mixed.

Each card contains a reference to the original paragraph of the document. The basis is the current EFB list; the final catalog contains 53 selected failures with MMEL dispatch relief provisions and conditions. The remaining items are excluded from the working register. There is no division into groups and categories. There is no need to check the failure behavior in the simulator: the name EFB is taken as a description of the failed component or function, and unknown secondary effects are allowed as an element of randomness by the user's decision of 14.09. 2026.

# Presentation of the result

In the first version, one immutable form is used - a fault card. The user does not select or edit the presentation format.

The final catalog and interactive layout have been prepared. The interface is completely in English, minimalist, with a dark blue-gray palette and a blue accent on the color reference flightsim.to. Specification: `design/ИНТЕРФЕЙС.md`; layout: `design/index.html`. Card data:

- the name of the failure;
- Stable ID and exact EFB path
- MMEL item number, branch and pages of the source PDF;
- the dispatch conditions on the selected line; when combined, they can be replaced by the conditions of the alternative line MMEL;
- name and edition of the source document.

# Several failures

The application generates from 1 to 3 different failures. Each item should be separately:

- Be included in a single catalog of 53 entries; applicability to all supported models and engines is accepted as an assumption.
- be present in the selected document;
- Be present on the EFB Fenix failure list; no empirical verification of behavior is required.

The only rule of compatibility is that the selected set must not violate the MMEL limitations on other failures. Requirements for the operability of equipment and the permissible number of inoperative units are taken into account. For each item affected, one suitable alternative MMEL string is sufficient; its conditions are transmitted to the card. In the absence of a ban, the result is formulated as “the ban under the considered conditions of MMEL was not found”. There is no separate prohibition or mandatory manual check due to the lack of a specific combination description. Weather, route, timing and technical procedures are retained as conditions but are not additional generation filters at this stage.

At the subsequent decision of the user, the dispatch relief options requiring unpressurized flight are excluded. CPC1 and CPC2 remain in the catalog separately; the common line 21-31-01 for unpressurized flight is not used, so the combination of CPC1+CPC2 is excluded. The MMEL source code is retained unchanged.

The set contains 1-3 different IDs: repeating the same record is not considered another failure. Check the entire set, including three. For the accepted interpretation of the MMEL points and the selected dispatch relief options, 89 prohibited pairs and 2 additional minimum prohibited triples are compiled. The simulator’s supposed secondary effects are not used to create additional prohibitions. The interpretation of the requirements for static heaters and a separate AUTO/BRK failure is explicitly described in `research_fenix/efb_mmel_pool/ПРАВИЛА_СОЧЕТАНИЙ.md`.

# Beyond the First Version

- serviceable aircraft without failures;
- Automatic opt-outs in Fenix or MSFS;
- SimConnect and other simulator integrations
- Failures not included in the accepted EFB Fenix list;
- research and testing of failure behavior in the simulator;
- Preservation of defects between flights;
- modeling of repair and work of technical service;
- routing, weather, ETOPS and ground support calculations;
- support for aircraft of other developers;
- use of neural networks during generation;
- Choice between several forms of results.

# Deferred Opportunity

After the first version, you can add alternative forms of displaying the same data: a short result and a record of the Technical Log. This idea persists in terms of development, but is not included in the current scope.

# The next stage

Plan 1-6 points have been completed in the agreed amount. The final unified catalog of 53 entries and MMEL matching rules have been prepared: `research_fenix/efb_mmel_pool/РЕЕСТР.md`. All 53 single failures, 1,378 pairs and 23,426 triples were checked, including the preservation of the terms of alternative dispatch relief provisions. Catalog assembly and rule verification are performed by `research_fenix/finalize_catalog.py`; the former `classify_efb_pool.py` refers to the completed selection phase.

Item 7 completed: prepared two screens, a single card, English signatures, selection of aircraft and 1-3 failures, transition to the briefing and return Back to main menu. The layout shows fixed examples; random generation was connected in the production implementation.

Previous studies remain the history of the work; the old alpha directory does not determine the composition of the pool. Behavior test tasks and separate model/engine applicability checks are cancelled by new user solutions. Then there are the development of the application with the connection of the directory and rules, English texts of the full catalog, checking the application and preparing the launch.

# Approval of development - 15.09. 2026

The user approved the development of the Electron application and the delivery of Portable EXE plus NSIS EXE installer. A random selection without repetition of combinations in the current launch is agreed before the pool of a given number of failures is exhausted; then a new cycle without repetition at the boundary. History common to A319/A320/A321, separate to 1/2/3 failures; the ID order does not create a new combination. Switching tabs saves the result. Settings are saved between launches, the history of combinations is not.


# Issue 1.0.0 - 16.09. 2026

Development, directory connection, English interface, repetitive generation, settings saving, offline PDF, verification and assembly are complete. Delivery: Portable EXE, NSIS EXE installer, source archive, instruction, report and SHA-256 in release/. All 24,857 sets are consistent with the agreed rules. The final integration checks of Portable and the installed version passed, the test installation was removed. The actual environment is Windows 10 Enterprise LTSC x64 10.0.19044. Windows 11 and a clean virtual machine were not checked. The historical statuses of the “Next Stage” section above refer to the time of approval of the layout; current status – the release is completed. Details: release/TEST-REPORT.md.

