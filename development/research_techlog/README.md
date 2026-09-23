# A320-family technical log references for BL-002

Verified 23 September 2026. This research informs a *simulated presentation* of a
generated failure scenario, not an operational aircraft technical log or maintenance
release. Real operator log pages and electronic records are generally not public;
the incident reports below reproduce short, authentic defect entries, while the
vendor demonstrations illustrate electronic workflows.

| Reference | Type and applicability | Useful evidence | Limit |
| --- | --- | --- | --- |
| [UK CAA AMC M.A.306(a)](https://regulatorylibrary.caa.co.uk/1321-2014/Content/Document%20Structure/01%20M/3%20AMC/AMC%20M%20A%20306%20a%20Aircraft%20technical.htm) | Official technical-log content guidance; generic aircraft | Section 3 covers reported defects and crew sign-off; Section 4 cross-references deferred defects, their original date, description, and eventual rectification. | Regulatory content guide, not an A320 screenshot or a template licensed for this app. |
| [AAIB report 2/2008, G-EUOB, PDF p. 18](https://assets.publishing.service.gov.uk/media/5422ee3240f0b613420001ad/2-2008_G-EUOB.pdf) | Actual **A319-131** technical-log text reproduced in an official incident report | Three separate entries: “ASR raised - see subsequent entries”; “ENG 1 - EPR mode fault - N1 degraded mode”; “ELEC - TR 1 fault”. | A319 family reference, not A320; short excerpts only, no full page image. The report says the log lacked full event detail. |
| [AAIB report, G-DJAR, PDF p. 5](https://assets.publishing.service.gov.uk/media/5422efe440f0b61342000275/dft_avsafety_pdf_501105.pdf) | Actual **A320-231** commander entry reproduced in an official incident report | “A/C FAILED TO PRESSURISE. ALL ECAM IND(ICATION)S (ALL PAGES) NORMAL.” | The report says the fuller later safety report was unavailable to the engineer. A terse example is not necessarily a good completeness model. |
| [Conduce eTechLog8](https://www.conduce.net/etechlog8), [pilot defect demo](https://www.conduce.net/videos/recording-pireps), [engineer defect demo](https://www.conduce.net/videos/recording-mareps) | Vendor electronic-logbook workflow examples, not aircraft-specific | Separate pilot defect reporting, engineering report, and defect action views. | Product demonstrations; not evidence of a specific operator's A320 log wording or a reusable UI design. |
| [Lufthansa Technik AVIATAR eTLB at Eurowings](https://www.lufthansa-technik.com/en/eurowings-introduced-aviatar-s-electronic-technical-logbook-1969ff56bfcde8cd) | Vendor/operator electronic-logbook example, A320-family fleet | Describes prefilled text blocks and input masks for in-flight and ground technical issues. | Marketing description, not a complete real entry. |
| [IATA Electronic Logbook Implementation Roadmap](https://www.iata.org/contentassets/fafa409c883d41198aeb87628c848851/elb-implementation-roadmap_master_final_2024_05_03.pdf) | Industry implementation guidance | Explains the wider sector-record, defect, rectification, acceptance, correction, and audit-trail workflow. | Background only. Its contents must not be redistributed or quoted in the app. |

## Implications for the proposed display

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
