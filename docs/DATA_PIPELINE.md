# Independent medicine-data pipeline

The Python pipeline separates Bangladesh product identity from generic/formulation medical guidance. It builds static files; the browser never scrapes a directory and needs no inference service or Python server.

## Commands

Python 3.11+ is required. The core has no pip dependencies.

```sh
python scripts/import_source.py square_reviewed
python scripts/import_source.py manual_verified
python scripts/import_source.py --all
python scripts/build_dataset.py
python -m unittest discover -s tests/pipeline -v
npm run build
```

The final command also rebuilds and validates data, then compiles TypeScript and Vite. pnpm may be used instead of npm. `build_dataset.py --refresh` reimports all enabled sources. Otherwise it uses source checkpoints, automatically reimporting local inputs when their SHA-256 or adapter configuration changes. CLI errors return a nonzero exit status. A missing/empty valid catalogue or malformed guidance will not replace production outputs.

## Source manifest and access

`config/sources.yaml` uses JSON syntax, which is valid YAML 1.2, so a standard-library parser suffices. Keep that syntax when editing. Every source supplies id, publisher, source_type, base_url, enabled, access_method, license_or_permission_note, last_checked, adapter, and input.

Enabled sources are **local reviewed facts** retained from Beximco manufacturer leaflets and Square manufacturer publications. A manual CSV repeats the existing Napa 500 mg identity to prove deduplication and attribution. These are concise factual records, not copies of publisher prose/PDFs and not a claim that their publications have an open redistribution licence. No new remote crawling occurs. Registration/current availability remain unverified.

DGDA is disabled because no bulk-use/redistribution permission or licensed export was supplied. There is no MedEx adapter. A disabled source is neither fetched nor included from an old checkpoint.

For a future remote source, use `permitted_https` only after documenting permission. Both `automated_access_allowed` and `redistribution_allowed` must be true, with `permission_reference`. The URL must remain on the declared HTTPS host. Robots must be readable and allow access; ambiguous/missing policies fail closed. Redirects, TLS errors, and access denials are not bypassed. The fetcher has timeouts, a 20 MB limit, throttling, bounded retries for 429/5xx and Retry-After handling. This is a single-resource importer, not a nationwide paginated crawler. Add a reviewed pagination adapter only after authorization; source snapshots provide source-level checkpoint/resume.

## Add a manufacturer

1. Obtain a permitted export or manually review concise identity facts. Record publisher URLs, date and reviewer. Do not invent fields or infer ingredients from a brand.
2. Place the local input under `data/inputs/`.
3. Add a manifest record with a new slug, `enabled: true`, `access_method: local_reviewed_file`, a permission note and `adapter: json` or `csv`. `columns` maps source headers to canonical raw field names. `defaults` may supply explicit, reviewed source metadata, never guessed medicine facts.
4. For the reusable `manufacturer_json` adapter, set `manufacturer` to the exact source manufacturer string. It filters a reviewed JSON export to that manufacturer. No application code changes are needed.
5. Set `reviewed: true` only for source-checked records. Rows additionally require mapping_status VERIFIED and a review date to retain verified identity status. Unreviewed records stay NEEDS_REVIEW; automatic extraction never verifies clinical facts.
6. Run `python scripts/import_source.py your_source_id`, then `python scripts/build_dataset.py`. Review the quality report before building/deploying.

Example manifest record (replace every placeholder; not an enabled production source):

```json
{
  "id": "your_source_id",
  "publisher": "Actual publisher",
  "source_type": "manufacturer_json",
  "adapter": "json",
  "base_url": "https://publisher.example",
  "enabled": false,
  "access_method": "local_reviewed_file",
  "input": "data/inputs/your_export.json",
  "reviewed": false,
  "license_or_permission_note": "Document the actual permission/review here",
  "last_checked": "YYYY-MM-DD"
}
```

The existing `data/inputs/manual_verified.csv` is a real one-row example. `manual_verified_csv` requires reviewed_by, last_verified and source_url. Ingredient arrays may be JSON or plus-separated names. The existing clinical review command writes to `data/inputs/generic_guidance.json` and `guidance_sources.json`; rebuilt outputs remain separate.

## Adapter interface

`pipeline/importers.py` defines `fetch()`, `parse()`, `normalize()`, `validate()`, `export()` and orchestration `run()`. Adapters are registered in ADAPTERS. JSON, manufacturer JSON, CSV, manual CSV and explicit HTML-table adapters share normalization/validation. HTML requires a table_id and unique headers with rectangular rows. Raw extraction is not automatically verified.

The optional PDF-table adapter needs `pip install -r requirements-pdf.txt`, `table_extraction_reviewed: true`, and explicit `tables: [{"page": 1, "table": 0}]` selections. It rejects missing selections, ragged rows and merged/empty cells; no OCR or prose guessing is attempted. No PDF adapter is enabled and no publisher PDF table was newly ingested in this release. Reliability must be checked on each actual document. General HTML/CSV/JSON extraction is tested with isolated fixtures.

## Normalization and reconciliation

Raw values are preserved. Unicode/whitespace and explicit vocabularies normalize names, units, forms, routes and release types: 500MG → 500 mg; Tab. → Tablet; Cap → Capsule; explicit SR/XR/ER → EXTENDED. Salt aliases, route, and release are never guessed from a brand. Generic ingredients remain separate for combinations. Source ingredient lists must match the full generic combination.

Deterministic product keys include manufacturer, brand, normalized strength, ingredients, form, route and release. Stable SHA-256-derived IDs identify entities; legacy IDs preserve existing saved medicines. Different strengths, tablets/capsules, routes and IR/ER stay distinct. Exact duplicates merge field attribution rather than increment coverage. Cross-source ingredient/formulation disagreements for the same pack, or conflicting registrations, create conflict issues and block guidance; distinct records are retained where identity differs.

Every raw field has field_provenance with raw_value, source ID, publisher, URL, retrieval time, importer, verification status and source section. Derived fields also record normalization rules. `retrieved_at` means the pipeline read the local export; the original source check date is separate. Ingredient/entity provenance and product_sources retain multiple origins. No dosage is inferred by splitting combination strength text.

## Outputs and app integration

Inputs are `data/inputs/reviewed_products.json`, manual CSV, reviewed generic guidance and its source register. Source snapshots plus hash/config metadata go to ignored `data/ingested/`; runs append to runs.jsonl. Latest contributing runs are also published in ingestion_runs.json.

`data/production/` contains products, manufacturers, active_ingredients, product_ingredients, product_sources, generic_guidance, guidance_sources, guidance_provenance, ingestion_runs, validation_issues, statistics, app_products and search_index JSON files. Clinical claims retain citations and sections; guidance validation rejects missing citations, unsafe dosing, inconsistent formulation keys and unsupported food/timing states. No LLM or automatic label extraction supplies verified instructions.

`src/catalogue.ts` and the search worker import app_products/search_index directly from production. These projections exclude bulky raw/provenance tables from the app bundle. Existing `src/data/` files are generated compatibility projections for older tooling/tests; do not edit them. Production files replace individually via temporary files after validation. Publication of the entire directory is not a database transaction; avoid concurrent builds.

Statistics are computed: product/brand/generic/formulation/manufacturer counts, form distribution, source coverage, validation failures and guidance coverage. Source coverage counts unique products per source; a product supported by two sources counts in both, so source totals need not sum to catalogue size.

`reports/data_quality_report.json` includes all issues and conflicts. Missing identity fields, malformed URLs and unmapped combinations are quarantined. Unknown forms/units block guidance. Unknown route/release remains searchable but abstains. Current output: 177 products, 106 brands, 99 generic-name strings, 124 formulation keys, 2 manufacturers; 0 validation errors, 127 unverified-formulation warnings, 1 duplicate observation. This pipeline release adds infrastructure, not new market coverage.

## Limits and future work

Manufacturer publications do not establish current DGDA registration or availability. No complete-market coverage is claimed. Guidance remains 17 reviewed records (13 verified, 4 partial); 25 products resolve verified guidance, 4 partial and 148 unavailable. Future work: licensed independent exports/manufacturer agreements, reviewed pagination, unresolved formulation review, independent clinical/Bangla review, historical run archival and profiling/chunking at nationwide scale. Keys/index generation are deterministic for identical input/configuration; retrieval/build timestamps intentionally differ across fresh imports/builds.
