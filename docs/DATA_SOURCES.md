# Data-source preflight and curation log

Source check date: **8 October 2026 (Asia/Dhaka)**.

## Bangladesh identities

- DGDA public catalogue: https://info.dgda.gov.bd/allopathic-medicines
- Official catalogue pages were visible through web search. No documented bulk API, complete permitted machine-readable download, or redistribution licence was located during the bounded preflight.
- Direct access to `https://info.dgda.gov.bd/robots.txt` failed TLS validation (`NotTimeValid`). No certificate bypass, crawl, undocumented endpoint enumeration, or rate-limit circumvention was attempted. Robots permission therefore remains unknown.
- Seed identities are individually curated factual fields from Beximco and Square publications, **not DGDA registry extracts**. Registration numbers stay `null`; current registration and market availability are unverified.
- No claim of complete coverage or manufacturer endorsement. No manufacturer marketing claims, pack images or dosing tables are reproduced.

## Actual source register

The exact source names, URLs, types and check dates are in `src/data/sources.json`; each product also has its own source URL and section. `scripts/seed.ts` records the authoring inputs. The current catalogue contains **29 products** (brand / ingredient / strength / form / release type / manufacturer identities), from **two manufacturer publication sets**. Different pack sizes are not counted as separate medicines.

Guidance contains **9 generic/formulation records**, applicable to **15 products**, with **14 products abstaining**. Sources used for medical claims: NHS patient guidance, DailyMed structured drug labels, and Square administration/indication publications. Beximco publications establish local product identities.

## Source adapter investigation

- DailyMed documented API: https://dailymed.nlm.nih.gov/dailymed/webservices-help/v2/spls_api.cfm
- openFDA label API: https://open.fda.gov/apis/drug/label/
- The implemented adapters were actually probed: each returned three matching records (cefixime through DailyMed, metformin hydrochloride through openFDA).
- openFDA is implemented and tested as a **retrieval adapter**, not a source of published MVP guidance. It does not independently verify submitted labels and is not used for clinical decisions.
- The static browser app never queries either API at runtime. Adapter output goes to a human curation step. Route, ingredient, formulation, strength-specific differences, source sections, local-label conflicts and current publication dates must be reviewed before adding guidance.

## Verification meaning

`VERIFIED` means the displayed paraphrases were checked against the named source sections. It does **not** mean generated content became verified automatically, independent pharmacist review, local product bioequivalence, official Bangladesh approval, or a complete safety assessment. Sources may be older than the check date.

`PARTIALLY_VERIFIED` is supported for records with incomplete evidence. `NOT_AVAILABLE` or absence of an exact formulation match yields explicit abstention. Combination medicines are never resolved to single-ingredient guidance. Numeric strength tokens are never fuzzy-corrected.

English and Bangla text is fixed in versioned records. It is manually authored from the cited instructions; independent professional Bangla terminology review remains pending. No runtime machine translation, model inference or user-personalised medical advice exists.

## Future import process

1. Obtain and document permission/licensing for the prospective dataset; do not assume public visibility permits a bulk crawl.
2. Prepare CSV/JSON following `docs/product-import.example.csv` and the Zod schema.
3. Run `pnpm import:products your-file.csv` for validation only. Check the source URL, composition, release type, registration provenance, duplicates and risk flags.
4. Run with `--write` only after review. Replacement is atomic and invalid imports leave the current file intact.
5. Add or review guidance separately; ingestion cannot manufacture verification or fuzzy-map a formulation.
6. Run data validation, tests, build and browser acceptance checks; commit the reviewed version and deploy.

Future work: licensed catalogue coverage, qualified pharmacist/clinician review, professional Bangla review, dated label snapshots/version IDs, periodic source-link and content rechecks, and a documented conflict-resolution/review ownership process.
