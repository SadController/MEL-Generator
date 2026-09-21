Applicability of FAA MMEL to Fenix A319/A320/A321

Date of inspection: **September 13, 2026**. Source of dispatch relief provisions: **FAA A320 MMEL Rev.32, 30.07.2025**. Installed by Fenix: **2.4.0.4720**. The app was not developed at this stage. **Addition after the launch of Fenix:** checked the real menu **A321-231 IAE WTF** — 384 buttons in 19 ATA sections. [New report and current paths ](live_A321_IAE_WTF_2026-09-13/ОТЧЁТ.md). Menus for all 48 documented K scores were found; two DCDU and Transfer Defuel Valve candidates were added. No waivers included. Below is the original documentary score before viewing the menu; its numbers and menu unavailability marks refer to that stage.

FAA MMEL is suitable as a base, but you can not use the entire document in the generator. We need a selected set of specific sub-items with verified failure states and aircraft configurations. The coincidence of the name of the system does not establish compliance with the failure or the fulfillment of the MMEL conditions.

# What's tested

An index of **606 unique printed top-level numbers** was compiled for all 445 pages of the PDF system. It’s not the number of individual dispatch relief provisions: there are different blocks, categories, conditions, and patterns within the same number. Numbers and page anchors are verified by an independent passage according to the words in the left PDF column. The source document has at least one title error – see below. **113 MMEL numbers** for which **133 conformity assessments are compiled are subject to evaluation:

| Result | Estimates | Value |
|---|---:|---|
| K - Candidate according to | 48 | There is a component/function semantic match and a published Fenix waiver name. You still need an up-to-date menu, configuration and test. |
| U - Requires clarification | 39 | The exact failure state, desired configuration or reproduction method is not established. |
| X - comparison rejected | 24 | Verified matching sentence violates the meaning or scope of the MMEL dispatch relief. This is not a rejection of the entire MMEL number. |
| N - outside the selected configuration | 22 | Items for neo/XLR, A318/PW6000 and other equipment outside the selected CEO family. | **493 numbers do not yet have an established Fenix match.** They are kept in a full registry with the status of "comparison with Fenix not established". This is not to say that Fenix does not model them. Many refer to individual lamps, controls, salon and optional equipment for which a published current catalog of failures has not been received.

No record has yet been labeled as ready for generation: **failure behavior tests in the installed Fenix are 0**. At the time of the initial documentary check, MSFS/Fenix had not been launched; later menus checked, see addendum above. Documentary checking or reading menus cannot be passed off as testing the behavior of systems.

# Key results

| MMEL | What can be considered for Fenix | Significant limitation |
|---|---|---|
| 21-31-01 | CPC 1, CPC 2 | Different sub-paragraphs and conditions. Outflow valve jamming is not a single CPC failure. |
| 22-10-01 | AP 1, AP 2 | AP function failure; total FMGC failure affects more equipment. |
| 22-66-01 | FAC 2 | FAA calls FAC 2; FAC 1 cannot be added by analogy. |
| 27-93-01 | ELAC 1 | Permits do not apply automatically to ELAC 2.
| 27-94-01 | SEC 1, SEC 2, SEC 3 | Different sub-clause by block, model and modifications; Sharklets do influence. |
| 27-95-01 | FCDC 2 | FCDC 1 is not covered by FCDC 2.
| 28-21-01 | One wing tank pump | Separate branches of CFM/IAE and fuel restrictions. |
| 29-25-01 | Yellow electric hydraulic pump | Suitable component; full Blue pump failure is not the same dispatch relief. |
| 31-53-01/31-55-01 | FWC 2/SDAC 2 | Not FWC 1/SDAC 1. |
| 31-63-01 | F/O PFD, CAPT ND, F/O ND, lower ECAM | CAPT PFD and upper ECAM are not listed in these permits. The rest of the displays have to work. |
| 32-31-01 | LGCIU 2 | Not LGCIU 1; many other systems require serviceability. |
| 32-42-04 | AUTO/BRK function | Normal braking shall be maintained. Failure of the button lamp is a separate subparagraph. |
| 34-10-01 | ADR 2, ADR 3; individual IR | ADR 1 states are not added by analogy. For IR1, ATT must be stored in the appropriate NAV dispatch relief. |
| 78-30-01(1) | One reverser inhibited by maintenance | It is a deactivated retracted reverse, with various CFM/IAE checks; not REV UNLOCKED or REV PRESSURIZED. |

The full page numbers, Fenix search names and comments are in the [detailed ](МАТРИЦА.md) matrix]. The terms herein are abbreviated to explain the correspondences and do not replace the text of the selected FAA line.

# What can not be compared by similarity of names **29-10-02:** The FAA is considering a Blue Pump automatic control failure while maintaining manual work. The full `Elec hyd pump blue failure` is not suitable. **29-23-01:** The FAA is considering a PTU automatic power failure in which the PTU is continuously operating and retains power transmission. General `PTU Fault` does not correspond to this condition. **36-12-04:** Loss of AUTO or MAN crossbleed control while retaining another control mode is not equal to a jammed valve.
- **28-23-02:** CROSSFEED buttons/lamps are not equal to the jamming of the crossfeed valve itself.
Leakage of fuel or fluid, actually low pressure in the tire, a small amount of oil / oxygen do not equal the failure of the corresponding indication.
Engine/APU fire, actual smoke, engine damage, rudder jamming, decompression and landing gear failure cannot be included just because Fenix has such scenarios. Each needs its own precise dispatch relief; they are not included in the selected set.
The Alpha list contains `TAT heat STBY`, while the FAA 30-31-05 lists two installed TAT heaters. Such a third channel cannot be transferred to the catalog without clarification.

# Model and configuration

The Fenix v2.0 local guide describes **A320 CEO family with EIS2**. For this work, the basic variants are A319/A320/A321 with CFM56 or IAE V2500. The mere presence of engine files in the installed product does not yet confirm the engine of the selected board, the presence of an extension or the applicability of all its failures.

| Sign | Why you need it |
|---|---|
| A319 / A320 / A321 | There are different fuel systems, doors and model conditions for a number of dispatch relief provisions. |
| CFM56 / IAE V2500 | There are different lines of anti-ice, reverser, fuel and propulsion systems. CFM56 should not be mixed with CFM LEAP. |
| Wingtip fences/Sharklets | The FAA 27-94-01 identifies separate branches of the A320 Sharklets for the SEC. It's not just the look. |
| Center electric pumps/transfer jet-pumps | FAA 28-21-02(1) refers to pumps, 28-21-02(2) refers to transfer valves. You cannot issue an A321 electrical center pump failure over branch A319/A320. Mod.154327 is also checked for the A319/A320. |
| ACT: presence, number and location of | Affects 28-21-02, 28-28-xx, 28-40-02, 36-12-02 and 49-10-01. Fenix officially describes the ACT implementation of the A321, including variants with wingtip fences. |
| ECS / EIS / BSCU / FMS / eRudder / Other MODs | Required for dependent items only. It is impossible to derive every modification number or computer standard from the general “CEO/EIS2”. An unknown configuration should not automatically be considered suitable. |

Source: [Fenix – It’s Shark Week](https://www.fenixsim.com/blog/entries/2024-11-05_its_shark_week/). This is information about the simulator; dispatch relief provisions continue to be taken only from the FAA.

# Several rejections

It is necessary to check not only each item separately, but also the whole set together with the consequences of failures. The following restrictions on combinations have already been confirmed:

| Combination | Why does not fit the selected dispatch relief provisions |
|---|---|
| CPC 1 or CPC 2 + FCU | 21-31-01 requires both FCU channels; 22-81-01 requires both CPCs. |
| FAC 2 + RA / LGCIU / ELAC / SEC / ADIRS / SFCC | 22-66-01 requires the operability of the listed systems. |
| Blower fan + Extract fan | Each of 21-26-01 and 21-26-02 requires a different fan to function. |
| Blower/Extract fan + idle pack | Fans dispatch relief provisions require both packs to be serviceable. |
| One wheel brake + one reverser | 32-42-01 requires both reversers; 78-30-01 requires proper primary braking. |
| Two wing tank pump | Considered 28-21-01 allows one out of four idle pumps. |
| Two displays from the list 31-63-01 | The considered subitems require the operability of the remaining listed DUs. |

FMGC and the resulting AP/FD losses are one original defect with consequences. Similarly, a wheel brake failure can render the AUTO/BRK "deemed non-functional" by MMEL. These are not additional random independent failures.

This list of conflicts is not exhaustive. Full resolution for arbitrary combinations of 1-3 failures is not yet available.

# Quality of the original FAA PDF

On the printed page **24-22**, PDF page **120**, under the heading **24-27-09 COMMERCIAL pb Switch (Cont'd)** there is a subitem **2) With Mod.27620** with the conditions for **TR2**. The content looks like a sequel 24-30-01, but the printed number is different. The error is visible in the image of the page, it is not only a text extraction error.

[Saved image of the original page of ](evidence/FAA_printed_24-22_source_heading_anomaly.png).

A printed number is saved in the research index. The comparison of TR2 is marked U; it cannot be automatically renumbered or given as a verified sub-paragraph. The basic FAA PDF has not changed.

# What is required for the final inspection

1. Get the current EFB → Failures menu of the installed version and match real names with alpha search names. Check for items separately from A319/A320/A321 and CFM/IAE.
2. To fix the complete set: model, engine, wingtip, ACT, center feed type, available equipment standards. Unknown MODs remain unknown.
3. At the parking lot, check for one failure: initial working condition, activation, ECAM / STATUS, affected functions, remaining intact systems, deactivation and recovery. For valves, record the actual position before and after activation.
4. Separately check how to reproduce the desired final state after (M)/(O). MMEL is not a complete set of detailed maintenance/operational procedures; they cannot be invented. The necessary physical actions of technicians are not automatically implemented in Fenix.
5. After that, create cards for specific subitems and check combinations. Next-step protocol: [Simulator verification](ПРОВЕРКА_В_СИМУЛЯТОРЕ.md).

# Sources and files

- [FAA DRS - MMEL Rev.32](https://drs.faa.gov/browse/excelExternalWindow/DRSDOCID152739505920250730144819.0001); [local PDF](../sources_mel_mmel/00_current_mmel/FAA_A320_MMEL_Rev32_2025-07-30.pdf). The only source of dispatch relief.
[Fenix Failures Guide](https://support.fenixsim.com/hc/en-us/articles/12457317731855-Failures-Guide-in-FenixSim-Aircraft), page updated 26.02.2026: confirms more than 200 failures and the work of EFB Failures, but does not publish a full up-to-date list.] The built-in CPC1 shot is dated 15.03.2024, so the update date of the article does not mean a new shot date.
- [Fenix User Guide v2.0, ©2025](evidence/Fenix_User_Guide_v2.0_2025.pdf), copy from `C:\ProgramData\Fenix\EFB\documents`. Page 3 – CEO/EIS2, page 21 – Failures and pictures of hydraulic leak / rudder travel limiter. This is documentation 2025, not a test version 2.4.0.4720.
- [Fenix Failure List v0.2 Alpha, 12/07/2021](https://soarbywire.com/wp-content/uploads/2021/08/failurelist-v0.2.pdf), a third-party mirror of the developer document; [saved copy](evidence/Fenix_failurelist_v0.2_ALPHA_2021-07-12.pdf). The old search reference is neither a source of dispatch relief nor proof of the current A319/A321 or IAE implementation.
[Fenix Weather Radar support](https://support.fenixsim.com/hc/en-us/articles/13357580514703-Weather-Radar-not-working): The presence of radar does not prove the availability of a separate radar failure in the menu.]
- Applicability matrix: [Markdown](МАТРИЦА.md), [CSV](applicability_matrix.csv), [JSON](applicability_matrix.json).
- Full index 606 numbers: [CSV](full_mmel_inventory.csv), [JSON](full_mmel_inventory.json)]. Research text extraction: `mmel_item_index.json`; it is not a ready-made structured base of MMEL sub-paragraphs.
- [Control of sources and files ](verification.json).
