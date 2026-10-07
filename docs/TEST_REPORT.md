# Test report

Date: 8 October 2026, Asia/Dhaka. Results below are observed, not planned.

## Automated checks

- Vitest: **24 passed, 0 failed** across 2 files.
- Covers exact identity, generic/manufacturer search, typo tolerance, ambiguity gating, cited food guidance, unavailable evidence, formulation separation, bilingual switching, no patient-specific dosage output, nonexistent search, importer validation and numeric-strength refusal.
- Zod data validation: 29 products, 9 formulation guides, 16 sources, 15 matched products, 14 abstentions.
- TypeScript: passed after explicitly adding the testing-library DOM peer type dependency.
- Production Vite build: passed, with manifest and generated precache service worker.
- Adapter probes: DailyMed and openFDA each returned 3 records; no data automatically published.

Two initial search assertions failed (short transposition typo, fuzzy lookalike ingredient). Search was corrected and the final suite passed. Windows sandbox file-resolution restrictions required elevated execution; those failed attempts are not counted as passing tests.

## Browser acceptance

UI exercised through the Codex browser with snapshots after actions. Desktop 1280×900; mobile 390×844.

| Category | Product | Food instruction observed | Confirmation, sources, Bangla, mobile |
| --- | --- | --- | --- |
| Pain | Napa 500 mg Tablet | With or without food | Passed |
| Acid/reflux | Seclo 20 mg Capsule | Before a meal | Passed |
| Antibiotic | Cef-3 200 mg Tablet | With or without food | Passed |
| Diabetes | Comet XR 500 mg Tablet | With evening meal; do not crush/cut/chew | Passed |
| Antihypertensive | Amdocal 5 mg Tablet | Before or after food; grapefruit note | Passed |
| Allergy | Alatrol 10 mg Tablet | With or without food; no required time of day | Passed |

Mobile checks are captured in `mobile-acceptance.json`. Document scroll width was 375px within a 390px viewport (15px vertical scrollbar), with no horizontal overflow. Initial equality-based overflow diagnostics were corrected to check `scrollWidth <= innerWidth`.

Screenshots: desktop search/guidance, mobile search and mobile Bangla guidance in `screenshots/`.

## Public deployment checks

Pending the first GitHub Pages deployment. This section will be updated with actual public URL, workflow and deployed search/mobile results before completion.

## Limits of verification

Browser viewport tests do not prove installation on a physical Android device. Automated tests inspect the finite deterministic guidance records and forbidden dosage patterns; they are not a clinical safety certification. Independent clinical/pharmacy and Bangla-language review has not been completed.
