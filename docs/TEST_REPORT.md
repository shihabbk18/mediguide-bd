# Upgrade test report

Date: 8 October 2026, Asia/Dhaka.

## Observed automated results

- Vitest: 54 tests passed, 0 failed, across 3 files.
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

Public deployment and ten-category acceptance results will be recorded after observing the deployed application.
