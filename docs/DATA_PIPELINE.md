# Reproducible data pipeline

Product identity and medical guidance are separate, versioned datasets. The browser never scrapes a drug directory or depends on a paid model.

## Production inputs

- `src/data/products.json`: normalized products with composition, strength, form, route, release, mapping status and identity provenance.
- `src/data/guidance.json`: bilingual, cited records keyed by sorted ingredient names + exact form + route + release.
- `src/data/sources.json`: source register. Every displayed clinical claim references a registered source and section.
- `data/reviewed-square-identities.json`: concise identity facts reviewed against the manufacturer's 9th-edition guide. The original PDF is not redistributed. Conventional oral release is marked immediate only for reviewed mappings; other oral release types remain unknown. Registration is not inferred.

## Manufacturer identity expansion

1. Check source access and reuse restrictions. `node scripts/download-square-guide.mjs` downloads one published manufacturer guide, checks PDF content type/magic and preserves TLS checks.
2. With Python and `pdfplumber`, run `python scripts/extract-guide.py` and `node scripts/parse-square-guide.mjs`. Candidates and rejects go to ignored `tmp/pdfs/`, never directly to production.
3. Review ingredient, strength, brand heading, preparation, route and release. Column extraction can confuse neighbouring products. Combination strength, modified release, ambiguous cream routes and contradictory preparation text require review. Do not automatically approve all candidates.
4. Add approved concise facts to the reviewed identity file. Run `node scripts/import-reviewed-square.mjs`; stable identity hashes and deduplication make repeat imports idempotent.
5. Run `pnpm build:data`, `pnpm validate:data`, `pnpm test`, `pnpm build`.

## DGDA / DGHS import — gated, not performed

Official [DGHS value set](https://fhir.dghs.gov.bd/core/ValueSet-dgda-registered-drugs.html) and [terminology source](https://api.tr.ocl.dghs.gov.bd/orgs/MoHFW/sources/DGDA-Drugs/) expose DGDA drug concepts. The observed collection reports approximately 39,195 concepts; this is a source count, **not our indexed coverage**. Public View access and a null copyright field are not a redistribution license. No publisher permission or licensed export was supplied.

`pnpm import:dgda permission.json [output-directory]` requires a reviewed publisher permission manifest containing publisher, exact source URL, permission reference/link, bulk-export and redistribution flags, reviewer and date. Do not invent this manifest. The importer throttles requests, respects 429/Retry-After, stops for 401/403/451, retries transient failures, restricts pagination to the official host/path, logs requests and checkpoints each page. It does not disable TLS verification.

After authorized ingestion, run `pnpm exec tsx scripts/normalize-dgda.ts permitted-page.json quarantine.json YYYY-MM-DD`. This conservative adapter accepts only unambiguous single-ingredient strength expressions, rejects retired/non-drug/incomplete concepts, and quarantines combinations. Routes and releases remain UNKNOWN/NEEDS_REVIEW until reviewed. Neither this output nor raw pages are published automatically. Reviewed records can be deduplicated with `pnpm normalize:products input.json output.json` and validated/imported with `pnpm import:products reviewed.json [--write]`.

CSV `active_ingredients` accepts a JSON array or plus-separated ingredient names. JSON arrays are preferred for combination products. A product import replaces the catalogue only with `--write`, after successful schema and duplicate validation.

## Authoritative guidance enrichment

`pnpm enrich:guidance --limit=10` deduplicates exact mapped formulations and retrieves openFDA labeling into ignored `tmp/guidance-review/`. Three formulation retrievals were successfully exercised. Paracetamol is searched using US terminology acetaminophen **only for retrieval**; the production identity is unchanged. Combination retrieval searches all ingredients.

Deterministic extraction proposes short food/administration sentences, filters numeric doses/frequencies and sensitive treatment passages, and marks every candidate NEEDS_REVIEW. Retrieved labels may have the wrong route, release or ingredients; candidates are not medical facts. No extraction result becomes VERIFIED automatically.

A reviewer must check exact formulation and label section, conflicts, source reuse and concise English/Bangla claims. `pnpm exec tsx scripts/review-guidance.ts reviewed-manifest.json [--write]` validates reviewer/date, source/formulation/language/permission checks and the complete cited guidance schema. Missing reviews and unresolved candidate statuses are rejected. Final data is version-controlled for audit. Existing DailyMed/openFDA retrieval adapters remain available.

VERIFIED means displayed administration facts were checked against a publication, not independent clinical review or local regulatory approval. PARTIALLY_VERIFIED exposes only reviewed fields. Non-oral meal irrelevance is a structural inference from the cited route, explicitly labelled partial; no universal non-oral dosing schedule is assumed. UNKNOWN, NOT_AVAILABLE and NEEDS_REVIEW never generate guessed guidance.

## Production build and retrieval

`pnpm build:data` validates provenance and creates a token inverted index and computed coverage JSON. `pnpm validate:data` checks the index against current records. Search intersects token postings, supports prefixes/substrings and one-edit/transpose typos, ranks candidates, and never fuzzes numeric strengths. Results are capped at 60 with a total count. Above 2,000 products a debounced worker performs queries off the UI thread and rejects stale responses. A 40,000-record synthetic benchmark validates retrieval and caps; it does not prove mobile performance or real coverage. Large future payloads may still require lazy/chunked loading.

The PWA caches the built catalogue and app shell. Source links require internet. Cached versions may be older; use the update banner when offered. Never combine an old identity dataset with a new guidance/index file outside a complete build.
