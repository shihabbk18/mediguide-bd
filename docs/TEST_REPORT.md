# Upgrade test report

Date: 8 October 2026, Asia/Dhaka.

## Observed automated results

- Vitest: 55 tests passed, 0 failed, across 3 files.
- Required A–O cases: brand, generic, manufacturer, typo, multiple strengths, combinations, before/with/flexible food, injection, eye drops, topical, abstention, IR/ER and bilingual templates.
- Existing UI tests: exact confirmation, sources, bilingual switching, changing selection, unknown search and ID-only storage.
- Pipeline checks: no permission manifest means no bulk DGHS import; uncertain normalization is quarantined; extraction candidates remain NEEDS_REVIEW; missing review manifests and unsafe dosing are rejected.
- Prebuilt index retrieval over 40,000 synthetic records passed; result cap 60. Fixtures are not production data. This does not establish Android/mobile performance.
- Production data/index validation: 177 products, 106 brands, 124 formulation keys, 17 guidance records, 25 sources. Product guidance: 25 verified, 4 partial, 148 unavailable.
- TypeScript/Vite production build passed with GitHub Pages base, generated search worker, manifest, icons and offline precache service worker.
- openFDA enrichment: three successful formulation retrievals, all unpublished NEEDS_REVIEW candidates. Initial paracetamol searches returned 404; retrieval-only US terminology alias resolved this, without altering production ingredient keys.

The first regression run had 23 passes and one false positive: the dose-change regex rejected an alcohol warning saying “increase the risk”. The guard was narrowed to actual dose/medicine changes and explicit unsafe-claim rejection tests were added; the subsequent complete suite passed. No failed attempt is counted as a pass.

## Browser acceptance

The local HTTP preview served the current production asset successfully. The Codex browser loaded an older cached app on the original preview origin and could not load fresh local origins. This local browser attempt is not reported as passed.

Public deployment and category acceptance were subsequently observed; detailed results follow.

## Observed public deployment acceptance

GitHub Actions run 37700850369 successfully validated, tested, built and deployed commit 2b363bcda5a1adaffe9ac3345313db8d7f8721e8. Live URL: https://shihabbk18.github.io/mediguide-bd/.

HTTPS verification returned 200 for the app and JavaScript; the Pages manifest scope/start URL, both PNG icons and precache service worker passed. An existing cached 29-product PWA offered “Load update”; using it visibly loaded the 177-product catalogue and computed coverage.

At mobile viewport 390 × 844, each of the following real products was searched, selected, checked before confirmation, confirmed, and viewed in English and Bangla with ingredient/form/route/release and cited sources:

| Category | Exact product | Observed meal / timing |
| --- | --- | --- |
| Pain | Napa 500 mg Tablet | With or without food / unknown time, follow prescription |
| PPI | Seclo 20 mg Capsule | Before food / unknown time, follow prescription |
| Antibiotic | Moxacil 500 mg Capsule | With or without food / space already-prescribed doses evenly |
| Diabetes | Comet XR 500 mg Tablet | With evening meal / evening meal supported by sources |
| Antihypertensive | Angilock 50 mg Tablet | With or without food / consistent time |
| Antihistamine | Loratin 10 mg Tablet | With or without food / prescription-dependent |
| Oral NSAID | Sonap 250 mg Tablet | With or after food / prescription-dependent |
| Topical | Bactrocin 2% Ointment | Not applicable / prescription-dependent; partial guidance |
| Inhaler | Sultolin 100 HFA 100 mcg/puff | Not applicable / prescription-dependent; partial guidance |
| Eye drop | Alarid Eye Drops 0.025% | Not applicable / prescription-dependent; partial guidance |
| Additional injection | Fusid 20 mg/2 ml Injection | Not applicable / prescription-dependent; partial guidance |

The mobile DOM overflow checks reported false for horizontal overflow. English/Bangla source and meal cards were visually inspected. Desktop layout was inspected at 1280 × 900. Updated screenshots are saved under docs/screenshots/, including coverage-mobile.jpg. Viewport override was reset afterward.

Napa Extra was separately confirmed and displayed NOT AVAILABLE plus the combination-specific refusal; no paracetamol-only guidance appeared. A nonexistent medicine produced graceful no-results feedback. Methodology showed computed counts, source register and permission/verification limitations.

These are responsive browser checks, not an actual Android installation or a large-dataset mobile performance benchmark. Independent clinical review and nationwide coverage remain incomplete.

Final importer hardening: the complete suite passed 55 tests after adding a regression for conflicting ingredients, routes and known release types. The reviewed manufacturer import was rerun and added zero records; catalogue contents and coverage remained unchanged. TypeScript compilation passed after this final test addition.
