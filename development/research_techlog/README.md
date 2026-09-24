# A320-family technical log references for BL-002

Verified 24 September 2026. This research informs a *simulated presentation* of a
generated failure scenario, not an operational aircraft technical log or maintenance
release. Public examples fall into different categories: a teaching illustration of
a paper page, short authentic A320-family entries reproduced in investigation
reports, and vendor demonstrations of electronic logbooks. None is a complete,
reusable A320 operator template.

| Reference | Type and applicability | Useful evidence | Limit |
| --- | --- | --- | --- |
| [Illustrated paper technical-log page, PDF p. 38](https://www.flyingwithoutfear.com/wp-content/uploads/2020/04/WORKSHOP-BOOKLET.pdf#page=38) | Annotated educational example of a physical page; not A320-specific | Numbered defect rows face corresponding rectification rows; the page also has aircraft/sector, fuel, and acceptance/signature areas. This is a clear **paper layout** reference. | Teaching diagram, not an actual operator record or a form to reproduce verbatim. |
| [AAIB report 4/2009, G-EZAC, Table 1, PDF p. 56](https://assets.publishing.service.gov.uk/media/5422f68640f0b61342000587/4-2009_G-EZAC.pdf#page=56) | Actual **A320** technical-log wording reproduced in an official investigation table | Short defect descriptions such as “APU Generator will not come online” and “Gen 1 U/S” are shown alongside separate maintenance actions. A later deferred-defect entry cites MEL 24-20-01 and its expiry. This is a **text/content** reference. | The report reconstructs entries in a table; it is not an image of the original log page. It should not be treated as a model of ideal completeness. |
| [UK CAA AMC M.A.306(a)](https://regulatorylibrary.caa.co.uk/1321-2014/Content/Document%20Structure/01%20M/3%20AMC/AMC%20M%20A%20306%20a%20Aircraft%20technical.htm) | Official technical-log content guidance; generic aircraft | Section 3 covers reported defects and crew sign-off; Section 4 cross-references deferred defects, their original date, description, and eventual rectification. | Regulatory content guide, not an A320 screenshot or a template licensed for this app. |
| [Airbus Safety First: Correct Use of the MEL](https://safetyfirst.airbus.com/a-recall-on-the-correct-use-of-the-mel/?airbus-iframe=true&airbus-post=2124) | Manufacturer guidance on defect reporting and MEL assessment | The crew's observed defect entry starts the MEL assessment; useful details include ECAM title, time, SD indication, and flight phase. Maintenance later records the MEL item and rectification deadline; the captain separately accepts dispatch. | Workflow guidance, not a visual template. Observations cannot be inferred from an MMEL item title alone. |
| [AAIB report 2/2008, G-EUOB, PDF p. 18](https://assets.publishing.service.gov.uk/media/5422ee3240f0b613420001ad/2-2008_G-EUOB.pdf) | Actual **A319-131** technical-log text reproduced in an official incident report | Three separate entries: “ASR raised - see subsequent entries”; “ENG 1 - EPR mode fault - N1 degraded mode”; “ELEC - TR 1 fault”. | A319 family reference, not A320; short excerpts only, no full page image. The report says the log lacked full event detail. |
| [AAIB report, G-DJAR, PDF p. 5](https://assets.publishing.service.gov.uk/media/5422efe440f0b61342000275/dft_avsafety_pdf_501105.pdf) | Actual **A320-231** commander entry reproduced in an official incident report | “A/C FAILED TO PRESSURISE. ALL ECAM IND(ICATION)S (ALL PAGES) NORMAL.” | The report says the fuller later safety report was unavailable to the engineer. A terse example is not necessarily a good completeness model. |
| [TrustFlight electronic tech log](https://www.trustflight.com/products/electronic-tech-log/), [defect-screen image](https://www.trustflight.com/wp-content/uploads/2025/04/screenshot-feature-tech-log-03%402x.png) | Vendor demo with a visible **electronic defect-list UI**; not A320-specific | Separate defect records show short descriptions and status alongside reported-by/date/flight context, MEL/NEF classification, and resolution/limitation details. This is a **digital layout** reference. | Demonstration data and proprietary UI; do not copy it or imply its example aircraft is an A320. |
| [Flight Sim Labs A321 product page](https://www.flightsimlabs.com/index.php/introducing-the-a321/), [Tech Log defects screenshot](https://www.flightsimlabs.com/wp-content/uploads/2024/11/FSL-A321-Web-17.jpg), [close-up](https://www.flightsimlabs.com/wp-content/uploads/2024/11/FSL-A321-Web-25.jpg), [flight-history screenshot](https://www.flightsimlabs.com/wp-content/uploads/2024/11/FSL-A321-Web-26.jpg) | **First-party simulator UI** for the FSLabs A321 in MSFS, closely related to the requested FSLabs A320-family reference | The EFB Tech Log has an airframe/status header, separate Level 1 and Level 2 deferred-defect lists, one card per defect with a short title, impact tag, explanatory text and clearance/expiry timing. The illustrated TCAS defect also names an MEL item. Flight History and Fault History are separate views. | These images show **A321**, not a verified A320 Tech Log. The [FSLabs A320-X product page](https://www.flightsimlabs.com/index.php/a320-x/) identifies that product as Prepar3D/FSX, not MSFS. The maintenance/repair actions, dates and persistent airframe history are outside BL-002's current scenario data. Do not reuse the screenshots as application assets. |
| [Conduce eTechLog8](https://www.conduce.net/etechlog8), [pilot defect demo](https://www.conduce.net/videos/recording-pireps), [engineer defect demo](https://www.conduce.net/videos/recording-mareps) | Vendor electronic-logbook workflow examples, not aircraft-specific | Separate pilot defect reporting, engineering report, and defect action views. | Product demonstrations; not evidence of a specific operator's A320 log wording or a reusable UI design. |
| [Lufthansa Technik AVIATAR eTLB at Eurowings](https://www.lufthansa-technik.com/en/eurowings-introduced-aviatar-s-electronic-technical-logbook-1969ff56bfcde8cd) | Vendor/operator electronic-logbook example, A320-family fleet | Describes prefilled text blocks and input masks for in-flight and ground technical issues. | Marketing description, not a complete real entry. |
| [IATA Electronic Logbook Implementation Roadmap](https://www.iata.org/contentassets/fafa409c883d41198aeb87628c848851/elb-implementation-roadmap_master_final_2024_05_03.pdf) | Industry implementation guidance | Explains the wider sector-record, defect, rectification, acceptance, correction, and audit-trail workflow. | Background only. Its contents must not be redistributed or quoted in the app. |

## Implications for the proposed display

- The FSLabs example shows a useful *simulator-specific* hierarchy: aircraft context
  above a set of independent defect entries; each entry connects a plain-language
  fault label to its MEL reference and any relevant consequence. For BL-002, use
  only fields supported by our current source data. Do not imply a clearance date,
  completed maintenance, or a continuing airframe history where none exists.
- Both media keep the reported defect distinct from maintenance disposition. The
  paper reference places them in facing columns; the electronic example keeps
  information in separate record fields and statuses. BL-002 can borrow this
  *information hierarchy* without imitating either form or workflow.
- Keep a visible **simulation / briefing** label. Display one note for the generated
  scenario with distinct lines for each failure, plus the exact source-document
  title, revision, and item identifiers from the existing data.
- A MEL/MMEL item title describes a dispatch condition; it is not automatically a
  pilot-observed symptom. Reviewed symptom text would be needed before generating
  natural-language defect reports. Until then, label each line as a selected item
  rather than pretending it is an authentic pilot report.
- Keep operational conditions and procedures visually separate from the reported
  defect lines. Do not claim that the aircraft is cleared for dispatch.
- Do not fabricate flight date, registration, sector, engineer action, deferred-defect
  approval, certificate of release to service, or signatures. Those belong to real
  operator workflows and are not present in the current scenario data.
- The card view remains the source of truth. A note view, if implemented under
  BL-002, must preserve the same selected items and conditions without adding
  unsupported facts.
