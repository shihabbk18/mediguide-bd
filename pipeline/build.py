"""Build normalized entity tables and the application/search projection from snapshots."""
import hashlib
import json
from collections import Counter
from pathlib import Path

from .core import app_product, formulation, identity, now, reconcile, search_index, token, validate
from .importers import import_source, load_manifest, write_json
from .guidance import validate_guidance


def build_dataset(root, refresh=False):
    root = Path(root)
    manifest = load_manifest(root)
    records, issues, runs = [], [], []
    for source in manifest.values():
        if not source["enabled"]:
            continue  # Disabling a source also excludes an old snapshot from publication.
        if source["access_method"] not in {"local_reviewed_file", "permitted_https"} or (source["access_method"] == "permitted_https" and not all(source.get(flag) for flag in ["automated_access_allowed", "redistribution_allowed", "permission_reference"])):
            raise PermissionError("Enabled source lacks permitted access and redistribution")
        path = root / f"data/ingested/{source['id']}.json"
        if path.exists() and source["access_method"] == "local_reviewed_file":
            input_path = (root / source["input"]).resolve()
            if not input_path.is_relative_to(root.resolve()):
                raise ValueError("Input must stay within project root")
            checkpoint = json.loads(path.read_text(encoding="utf-8"))
            config_hash = hashlib.sha256(json.dumps(source, sort_keys=True).encode()).hexdigest()
            if hashlib.sha256(input_path.read_bytes()).hexdigest() != checkpoint["run"]["input_sha256"] or config_hash != checkpoint["run"].get("source_config_sha256"):
                import_source(root, source["id"])
        if refresh or not path.exists():
            import_source(root, source["id"])
        snapshot = json.loads(path.read_text(encoding="utf-8"))
        if snapshot["run"]["source_id"] != source["id"]:
            raise ValueError("Snapshot source provenance mismatch")
        runs.append(snapshot["run"])
        issues.extend(i for i in snapshot["validation_issues"] if i["code"] == "PARSE_ERROR")
        for p in snapshot["products"]:
            # Revalidate checkpoints, not merely the live input. Errors are quarantined.
            found = validate(p)
            issues.extend(found)
            if p["source_id"] != source["id"] or not all(e["source_id"] == source["id"] for es in p["field_provenance"].values() for e in es):
                raise ValueError("Checkpoint field provenance mismatch")
            if any(i["severity"] == "ERROR" for i in found):
                continue
            if not source.get("reviewed"):
                p["mapping_status"] = "NEEDS_REVIEW"
                p["verification_status"] = "NEEDS_REVIEW"
            if any(i["code"] in {"UNKNOWN_DOSAGE_FORM", "INVALID_UNITS"} for i in found):
                p["mapping_status"] = "NEEDS_REVIEW"
                p["verification_status"] = "NEEDS_REVIEW"
            records.append(p)
    products, conflicts = reconcile(records)
    issues.extend(conflicts)
    # Manifest/input order is deterministic; retained legacy IDs preserve saved medicines.
    manufacturers, active, links, product_sources = {}, {}, [], []
    for p in products:
        manufacturer_id = identity("manufacturer", token(p["manufacturer"]))
        p["manufacturer_id"] = manufacturer_id
        maker = manufacturers.setdefault(manufacturer_id, {"manufacturer_id": manufacturer_id, "name": p["manufacturer"], "raw_names": [], "field_provenance": {"name": []}})
        if p["manufacturer_raw"] not in maker["raw_names"]:
            maker["raw_names"].append(p["manufacturer_raw"])
        for entry in p["field_provenance"]["manufacturer"]:
            if entry not in maker["field_provenance"]["name"]:
                maker["field_provenance"]["name"].append(entry)
        for position, name in enumerate(p["active_ingredients"]):
            ingredient_id = identity("ingredient", token(name))
            entity = active.setdefault(ingredient_id, {"ingredient_id": ingredient_id, "name": name, "field_provenance": {"name": []}})
            provenance = p["field_provenance"].get("active_ingredients", p["field_provenance"].get("generic_name", []))
            for entry in provenance:
                if entry not in entity["field_provenance"]["name"]:
                    entity["field_provenance"]["name"].append(entry)
            links.append({"product_id": p["product_id"], "ingredient_id": ingredient_id, "position": position, "field_provenance": provenance})
        for origin in p.pop("source_records"):
            product_sources.append({"product_id": p["product_id"], "source_id": origin["source_id"], "publisher": manifest[origin["source_id"]]["publisher"], "source_url": origin["source_url"], "retrieved_at": origin["retrieved_at"], "importer": runs[[r["source_id"] for r in runs].index(origin["source_id"])]["importer"], "verification_status": origin["verification_status"], "raw_values": origin["raw_values"]})
    if not products:
        raise ValueError("No valid products; refusing to replace production data")
    guidance = json.loads((root / "data/inputs/generic_guidance.json").read_text(encoding="utf-8-sig"))
    guidance_sources = json.loads((root / "data/inputs/guidance_sources.json").read_text(encoding="utf-8-sig"))
    guidance_provenance = validate_guidance(guidance, guidance_sources)
    # Existing evidence-reviewed guidance is copied, never inferred from product identities.
    guidance_by_key = {g["generic_key"]: g for g in guidance}
    if len(guidance_by_key) != len(guidance):
        raise ValueError("Duplicate guidance keys")
    app = [app_product(p) for p in products]
    if len({p["id"] for p in app}) != len(app):
        raise ValueError("Conflicting legacy IDs; review aliases before publishing")
    statuses = [(guidance_by_key.get(formulation(p), {}).get("verification_status", "NOT_AVAILABLE") if p["mapping_status"] == "VERIFIED" and p["verification_status"] == "VERIFIED" and p["route"] != "UNKNOWN" and p["release_type"] != "UNKNOWN" else "NOT_AVAILABLE") for p in products]
    statuses = [s if s in {"VERIFIED", "PARTIALLY_VERIFIED"} else "NOT_AVAILABLE" for s in statuses]
    source_counts = {source_id: len({o["product_id"] for o in product_sources if o["source_id"] == source_id}) for source_id in {o["source_id"] for o in product_sources}}
    stats = {"built_at": now(), "products": len(products), "total_products": len(products), "unique_brands": len({token(p["brand_name"]) for p in products}), "unique_generics": len({token(p["generic_name"]) for p in products}), "unique_formulations": len({p["generic_key"] for p in products}), "manufacturers": len(manufacturers), "dosage_forms": dict(Counter(p["dosage_form_normalized"] for p in products)), "source_coverage": dict(source_counts), "validation_failures": sum(i["severity"] == "ERROR" for i in issues), "validation_warnings": sum(i["severity"] == "WARNING" for i in issues), "duplicate_observations": sum(i["code"] == "DUPLICATE_PRODUCT" for i in issues), "guidance_records": len(guidance), "verified_products": statuses.count("VERIFIED"), "partial_products": statuses.count("PARTIALLY_VERIFIED"), "unavailable_products": statuses.count("NOT_AVAILABLE"), "verified_guidance": sum(g["verification_status"] == "VERIFIED" for g in guidance), "partial_guidance": sum(g["verification_status"] == "PARTIALLY_VERIFIED" for g in guidance), "needs_review_guidance": sum(g["verification_status"] == "NEEDS_REVIEW" for g in guidance), "sources": len(guidance_sources), "input_hashes": {r["source_id"]: r["input_sha256"] for r in runs}}
    report = {"built_at": stats["built_at"], "statistics": stats, "issues": issues, "conflicts": [i for i in issues if i["code"] == "CONFLICTING_SOURCE_DATA"], "quarantine_policy": "ERROR records excluded; uncertain units/forms and source conflicts cannot resolve administration guidance. Unknown route/release abstain."}
    outputs = {"products": products, "manufacturers": list(manufacturers.values()), "active_ingredients": list(active.values()), "product_ingredients": links, "product_sources": product_sources, "generic_guidance": guidance, "guidance_sources": guidance_sources, "guidance_provenance": guidance_provenance, "ingestion_runs": runs, "validation_issues": issues, "app_products": app, "search_index": search_index(app), "statistics": stats}
    # Validate all outputs before writing. Individual files replace atomically; build only then starts Vite.
    json.dumps(outputs, allow_nan=False)
    for name, value in outputs.items():
        write_json(root / f"data/production/{name}.json", value)
    write_json(root / "reports/data_quality_report.json", report)
    # Legacy tools/tests consume generated projections, not a second independent catalogue.
    for name, value in {"products": app, "guidance": guidance, "sources": guidance_sources, "search-index": outputs["search_index"], "coverage": stats}.items():
        write_json(root / f"src/data/{name}.json", value)
    return stats
