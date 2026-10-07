# Source methodology — 8 October 2026

Identity facts come from Beximco leaflets and Square publications, including [Square’s published 9th-edition guide](https://squarepharma.com.bd/product_guide/Product%20Guide%209th_SPL.pdf). Concise composition/preparation facts preserve PDF page references; the PDF is not republished. Ambiguous ingredients, strengths, modified releases, neighbouring-column matches and contradictory preparations were excluded or left unresolved. Presence in an older publication does not verify current registration or availability.

Guidance uses manufacturer publications, [NHS medicines information](https://www.nhs.uk/medicines/) and [DailyMed](https://dailymed.nlm.nih.gov/). The complete claim-level register is src/data/sources.json. Facts are concise paraphrases, not complete copied leaflets. Foreign labeling does not establish local bioequivalence or approval. No independent clinician/pharmacist review has occurred.

[openFDA](https://open.fda.gov/apis/drug/label/) is used for an unpublished enrichment queue. Three successful formulation retrievals were exercised. Every extraction stays NEEDS_REVIEW until ingredients, route, release, evidence and bilingual wording are checked. The website needs no live API or model.

## Investigated, not imported

- [DGDA catalogue](https://info.dgda.gov.bd/allopathic-medicines): expired certificate prevented secure robots retrieval. No TLS bypass or page crawl.
- [Official DGHS value set](https://fhir.dghs.gov.bd/core/ValueSet-dgda-registered-drugs.html) and [DGHS terminology source](https://api.tr.ocl.dghs.gov.bd/orgs/MoHFW/sources/DGDA-Drugs/): public API located; two-concept audit checked fields. Approximately 39,195 source concepts are not app coverage. Public View access and a null copyright field are not redistribution permission. No permission/export was supplied.
- [OCL terms](https://openconceptlab.org/terms-of-use): service access is not assumed to authorize independent republication.
- [MedEx terms](https://medex.com.bd/terms-of-use): unauthorized extraction/redistribution restricted; no bulk import.
- [Healthcare Pharmaceuticals terms](https://www.hplbd.com/page/Terms%20of%20Use): product reuse restricted without written consent; no bulk import. A supposed product-list PDF redirected to HTML and was rejected.
- DOI 10.17632/3x5gsr2jm3.1: dataset blocked/withdrawn at author's request; no mirror workaround.

## Verification

Ingredient(s), strength, form, route and release remain separate. Unresolved releases may be searchable but cannot borrow another formulation's instructions. Combinations require combination-specific evidence. VERIFIED covers checked displayed facts; PARTIALLY_VERIFIED exposes only reviewed parts. Non-oral meal relevance is a disclosed inference from a cited route, not a universal dosing schedule. UNKNOWN and NEEDS_REVIEW abstain.

All production identities, claims and sources are versioned. See [pipeline documentation](DATA_PIPELINE.md) for future permitted imports and review. Coverage is computed from production records, not source totals or targets.
