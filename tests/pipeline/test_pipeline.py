"""Synthetic identities here are isolated test fixtures, never production medicine records."""
import copy
import csv
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from pipeline.core import normalize, strength, release, validate, reconcile, app_product, search_index
from pipeline.importers import JSONImporter, CSVImporter, ManualVerifiedCSVImporter, HTMLImporter, PDFTableImporter, ManufacturerJSONImporter, load_manifest, import_source
from pipeline.build import build_dataset
from pipeline.guidance import validate_guidance

SOURCE = {"id": "fixture", "publisher": "Fixture publisher", "source_type": "json", "adapter": "json", "base_url": "https://example.org", "enabled": True, "access_method": "local_reviewed_file", "license_or_permission_note": "Local synthetic test fixture only", "last_checked": "2026-10-08", "input": "input.json", "reviewed": True}
RAW = {"id": "fixture-legacy", "brand_name": "Fixture Brand", "generic_name": "Fixture ingredient", "active_ingredients": ["Fixture ingredient"], "strength": "500MG", "dosage_form": "Tab.", "route": "ORAL", "release_type": "IR", "manufacturer": "Fixture Manufacturer", "registration_number": None, "mapping_status": "VERIFIED", "source_url": "https://example.org/product", "last_verified": "2026-10-08", "high_risk": False}


def product(raw=None, source=None):
    return normalize(copy.deepcopy(raw or RAW), source or SOURCE, "2026-10-08T00:00:00Z", "FixtureImporter")


class PipelineTests(unittest.TestCase):
    def test_units_and_raw_values(self):
        self.assertEqual(strength("500MG"), "500 mg")
        self.assertEqual(strength("10MG / 5ML + 2.5MG"), "10 mg/5 ml + 2.5 mg")
        self.assertEqual(strength("50µg"), "50 mcg")
        p = product()
        self.assertEqual(p["strength_raw"], "500MG")
        self.assertEqual(p["dosage_form_normalized"], "Tablet")
        self.assertEqual(p["dosage_form_raw"], "Tab.")

    def test_release_types_and_no_guess(self):
        for value in ["SR", "XR", "ER"]:
            self.assertEqual(release(value), "EXTENDED")
        self.assertEqual(release("modified release"), "UNKNOWN")
        self.assertEqual(product(dict(RAW, release_type="", route=""))["route"], "UNKNOWN")

    def test_combinations(self):
        raw = dict(RAW, generic_name="Ingredient A + Ingredient B", active_ingredients="Ingredient A + Ingredient B", strength="500 mg + 65 mg")
        p = product(raw)
        self.assertEqual(len(p["active_ingredients"]), 2)
        self.assertFalse(any(i["severity"] == "ERROR" for i in validate(p)))
        bad = product(dict(raw, active_ingredients=["Ingredient A"]))
        self.assertIn("UNMAPPED_COMBINATION", [i["code"] for i in validate(bad)])

    def test_deterministic_key(self):
        a, b = product(), product(dict(RAW, strength="500 mg", dosage_form="Tablet", brand_name=" Fixture Brand "))
        self.assertEqual(a["product_id"], b["product_id"])
        self.assertTrue(a["product_id"].startswith("product-"))

    def test_duplicate_attribution(self):
        other = dict(SOURCE, id="second")
        products, issues = reconcile([product(), product(source=other)])
        self.assertEqual(len(products), 1)
        self.assertEqual(len(products[0]["field_provenance"]["strength_normalized"]), 2)
        self.assertEqual(issues[0]["code"], "DUPLICATE_PRODUCT")

    def test_different_strengths(self):
        products, _ = reconcile([product(), product(dict(RAW, strength="1000 mg"))])
        self.assertEqual(len(products), 2)

    def test_different_forms_routes_release(self):
        variants = [RAW, dict(RAW, dosage_form="Cap"), dict(RAW, route="INJECTION"), dict(RAW, release_type="XR")]
        products, _ = reconcile([product(x) for x in variants])
        self.assertEqual(len(products), 4)
        self.assertEqual(len({p["generic_key"] for p in products}), 4)

    def test_provenance_every_input_field(self):
        p = product()
        for field, raw in RAW.items():
            entry = p["field_provenance"][field][0]
            self.assertEqual(entry["raw_value"], raw)
            self.assertEqual(entry["publisher"], SOURCE["publisher"])
            self.assertEqual(entry["source_url"], RAW["source_url"])
            self.assertEqual(entry["importer"], "FixtureImporter")
            self.assertEqual(entry["retrieved_at"], "2026-10-08T00:00:00Z")

    def test_no_automatic_verification(self):
        p = product(source=dict(SOURCE, reviewed=False))
        self.assertEqual(p["verification_status"], "NEEDS_REVIEW")
        self.assertEqual(app_product(p)["mapping_status"], "NEEDS_REVIEW")

    def test_conflicting_ingredients_quarantined(self):
        a = product()
        b = product(dict(RAW, generic_name="Other ingredient", active_ingredients=["Other ingredient"]), dict(SOURCE, id="other"))
        products, issues = reconcile([a, b])
        self.assertEqual(len(products), 2)
        self.assertIn("CONFLICTING_SOURCE_DATA", [i["code"] for i in issues])
        self.assertTrue(all(p["mapping_status"] == "NEEDS_REVIEW" for p in products))

    def test_conflicting_registration(self):
        a = product(dict(RAW, registration_number="REG-1"))
        b = product(dict(RAW, registration_number="REG-2"), dict(SOURCE, id="other"))
        products, issues = reconcile([a, b])
        self.assertEqual(len(products), 1)
        self.assertEqual(products[0]["verification_status"], "NEEDS_REVIEW")
        self.assertIn("CONFLICTING_SOURCE_DATA", [i["code"] for i in issues])

    def test_missing_fields_and_bad_units(self):
        bad = product(dict(RAW, generic_name="", active_ingredients=[], manufacturer="", strength="500 bananas", dosage_form="Mystery", source_url="javascript:alert(1)"))
        codes = {i["code"] for i in validate(bad)}
        self.assertTrue({"MISSING_GENERIC", "MISSING_MANUFACTURER", "INVALID_UNITS", "UNKNOWN_DOSAGE_FORM", "MALFORMED_URL", "UNMAPPED_COMBINATION"}.issubset(codes))
        self.assertIn("MISSING_STRENGTH", {i["code"] for i in validate(product(dict(RAW, strength="")))})
        self.assertIn("INVALID_UNITS", {i["code"] for i in validate(product(dict(RAW, strength="500")))})

    def test_search_index(self):
        index = search_index([app_product(product())])
        self.assertEqual(index["version"], 1)
        self.assertEqual(index["count"], 1)
        self.assertEqual(index["postings"]["500"], [0])
        for word in ["fixture", "brand", "ingredient", "manufacturer", "tablet", "mg"]:
            self.assertEqual(index["postings"][word], [0])

    def test_json_and_manufacturer_adapter(self):
        adapter = JSONImporter(".", SOURCE)
        payload = json.dumps([RAW]).encode()
        self.assertEqual(adapter.parse(payload), [RAW])
        maker = ManufacturerJSONImporter(".", dict(SOURCE, manufacturer=RAW["manufacturer"]))
        self.assertEqual(maker.parse(payload), [RAW])
        self.assertEqual(ManufacturerJSONImporter(".", dict(SOURCE, manufacturer="Other")).parse(payload), [])

    def test_csv_and_manual_require_review(self):
        buffer = io.StringIO()
        writer = csv.DictWriter(buffer, fieldnames=list(RAW))
        writer.writeheader()
        writer.writerow(dict(RAW, active_ingredients=json.dumps(RAW["active_ingredients"])))
        rows = CSVImporter(".", SOURCE).parse(buffer.getvalue().encode())
        self.assertEqual(CSVImporter(".", SOURCE).normalize(rows[0])["active_ingredients"], RAW["active_ingredients"])
        with self.assertRaisesRegex(ValueError, "reviewer"):
            ManualVerifiedCSVImporter(".", SOURCE).normalize(rows[0])
        row = dict(rows[0], reviewed_by="Fixture reviewer")
        self.assertEqual(ManualVerifiedCSVImporter(".", SOURCE).normalize(row)["verification_status"], "VERIFIED")

    def test_html_table_and_ragged_rejection(self):
        adapter = HTMLImporter(".", dict(SOURCE, table_id="products"))
        rows = adapter.parse(b'<table id="products"><tr><th>brand_name</th><th>strength</th></tr><tr><td>Fixture</td><td>20 mg</td></tr></table>')
        self.assertEqual(rows, [{"brand_name": "Fixture", "strength": "20 mg"}])
        with self.assertRaisesRegex(ValueError, "ragged"):
            adapter.parse(b'<table id="products"><tr><th>a</th><th>b</th></tr><tr><td>x</td></tr></table>')

    def test_pdf_requires_reviewed_table_selection(self):
        with self.assertRaisesRegex(ValueError, "reviewed"):
            PDFTableImporter(".", SOURCE).parse(b"%PDF")

    def test_disabled_and_unpermitted_sources_make_no_requests(self):
        with patch("pipeline.importers.urlopen") as request:
            with self.assertRaises(PermissionError):
                JSONImporter(".", dict(SOURCE, enabled=False)).fetch()
            with self.assertRaises(PermissionError):
                JSONImporter(".", dict(SOURCE, access_method="permitted_https", input="https://example.org/data")).fetch()
            request.assert_not_called()

    def test_local_input_cannot_escape(self):
        with self.assertRaisesRegex(ValueError, "root"):
            JSONImporter(".", dict(SOURCE, input="../outside.json")).fetch()

    def test_end_to_end_build_and_rebuild(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "config").mkdir()
            (root / "data/inputs").mkdir(parents=True)
            (root / "config/sources.yaml").write_text(json.dumps({"sources": [SOURCE]}))
            (root / "input.json").write_text(json.dumps([RAW, RAW, dict(RAW, id="bad", generic_name="", active_ingredients=[])]))
            (root / "data/inputs/generic_guidance.json").write_text("[]")
            (root / "data/inputs/guidance_sources.json").write_text("[]")
            import_source(root, "fixture")
            stats = build_dataset(root)
            self.assertEqual(stats["total_products"], 1)
            self.assertEqual(stats["duplicate_observations"], 1)
            self.assertGreater(stats["validation_failures"], 0)
            products = json.loads((root / "data/production/products.json").read_text())
            self.assertEqual(products[0]["product_id"], product()["product_id"])
            for table in ["manufacturers", "active_ingredients", "product_ingredients", "product_sources", "generic_guidance", "ingestion_runs", "validation_issues", "search_index", "statistics"]:
                self.assertTrue((root / f"data/production/{table}.json").exists())
            self.assertTrue((root / "reports/data_quality_report.json").exists())
            self.assertEqual(json.loads((root / "data/production/search_index.json").read_text())["count"], 1)
            second = build_dataset(root)
            self.assertEqual(second["input_hashes"], stats["input_hashes"])
            # A local edit invalidates the checkpoint without a manual cache deletion.
            (root / "input.json").write_text(json.dumps([dict(RAW, strength="600 mg")]))
            third = build_dataset(root)
            self.assertNotEqual(third["input_hashes"], second["input_hashes"])
            revised = json.loads((root / "data/production/products.json").read_text())
            self.assertEqual(revised[0]["strength_normalized"], "600 mg")
            # Revoking reviewed status also invalidates the adapter configuration.
            (root / "config/sources.yaml").write_text(json.dumps({"sources": [dict(SOURCE, reviewed=False)]}))
            build_dataset(root)
            revised = json.loads((root / "data/production/app_products.json").read_text())
            self.assertEqual(revised[0]["mapping_status"], "NEEDS_REVIEW")

    def test_actual_production_sources_and_provenance(self):
        root = Path(__file__).resolve().parents[2]
        manifest = load_manifest(root)
        self.assertFalse(manifest["dgda"]["enabled"])
        self.assertNotIn("medex", manifest)
        products = json.loads((root / "data/production/products.json").read_text(encoding="utf-8"))
        self.assertGreaterEqual(len(products), 177)
        for p in products:
            self.assertTrue(p["field_provenance"])
            self.assertTrue(p["source_url"].startswith("https://"))
        napa = next(p for p in products if p["legacy_id"] == "bd-1")
        self.assertEqual(len(napa["field_provenance"]["brand_name"]), 2)

    def test_guidance_rejects_unsafe_and_uncited_changes(self):
        root = Path(__file__).resolve().parents[2]
        guidance = json.loads((root / "data/inputs/generic_guidance.json").read_text(encoding="utf-8"))
        sources = json.loads((root / "data/inputs/guidance_sources.json").read_text(encoding="utf-8"))
        self.assertEqual(len(validate_guidance(guidance, sources)), len(guidance))
        bad = copy.deepcopy(guidance)
        bad[0]["food_guidance"]["en"] = "Take 500 mg twice a day"
        with self.assertRaisesRegex(ValueError, "unsafe"):
            validate_guidance(bad, sources)
        bad = copy.deepcopy(guidance)
        bad[0]["food_guidance"]["source_ids"] = ["nonexistent"]
        with self.assertRaisesRegex(ValueError, "citation"):
            validate_guidance(bad, sources)


if __name__ == "__main__":
    unittest.main()
