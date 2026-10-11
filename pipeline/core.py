"""Normalization, provenance, validation, and conservative identity reconciliation."""
from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from datetime import datetime, timezone
from urllib.parse import urlsplit

ROUTES = {"ORAL", "INJECTION", "OPHTHALMIC", "TOPICAL", "INHALATION", "RECTAL", "OTIC", "NASAL", "UNKNOWN"}
RELEASES = {"IMMEDIATE", "DELAYED", "EXTENDED", "MUPS", "NOT_APPLICABLE", "UNKNOWN"}
FORMS = {"tablet": "Tablet", "tab": "Tablet", "tab.": "Tablet", "capsule": "Capsule", "cap": "Capsule", "cap.": "Capsule", "syrup": "Syrup", "suspension": "Suspension", "oral suspension": "Oral suspension", "injection": "Injection", "eye drops": "Eye drops", "eye drop": "Eye drops", "cream": "Cream", "gel": "Gel", "ointment": "Ointment", "inhaler": "Inhaler", "suppository": "Suppository", "oral solution": "Oral solution", "solution": "Solution", "powder for suspension": "Powder for suspension", "nasal spray": "Nasal spray", "ear drops": "Ear drops", "drops": "Drops", "chewable tablet": "Chewable tablet", "effervescent tablet": "Effervescent tablet", "dispersible tablet": "Dispersible tablet", "mups tablet": "MUPS tablet"}


FORMS.update({"eye drops": "Eye Drops", "eye drop": "Eye Drops", "paediatric drops": "Paediatric drops", "powder for oral suspension": "Powder for oral suspension"})


def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def clean(value):
    return " ".join(unicodedata.normalize("NFKC", str(value or "")).split()).strip()


def token(value):
    return clean(value).lower().replace("®", "").replace("™", "").strip()


def identity(prefix, value):
    return prefix + "-" + hashlib.sha256(value.encode()).hexdigest()[:24]


def strength(value):
    value = clean(value)
    value = re.sub(r"(?i)(?<![a-z])(mcg|µg|μg|mg|ml|iu|mmol|meq|g|l)\b", lambda m: {"µg": "mcg", "μg": "mcg"}.get(m[0].lower(), m[0].lower()), value)
    value = re.sub(r"(\d)(mcg|mg|ml|iu|mmol|meq|g|l)\b", r"\1 \2", value)
    value = re.sub(r"\s*/\s*", "/", value)
    value = re.sub(r"\s*\+\s*", " + ", value)
    return value


def release(value):
    value = token(value).replace("_", " ").replace("-", " ")
    return {"sr": "EXTENDED", "xr": "EXTENDED", "er": "EXTENDED", "extended release": "EXTENDED", "sustained release": "EXTENDED", "modified release": "UNKNOWN", "ir": "IMMEDIATE", "immediate release": "IMMEDIATE", "dr": "DELAYED", "delayed release": "DELAYED", "enteric coated": "DELAYED", "not applicable": "NOT_APPLICABLE"}.get(value, value.upper() if value.upper() in RELEASES else "UNKNOWN")


def route(value):
    value = token(value)
    return {"po": "ORAL", "oral": "ORAL", "iv": "INJECTION", "im": "INJECTION", "injection": "INJECTION", "eye": "OPHTHALMIC", "ophthalmic": "OPHTHALMIC", "topical": "TOPICAL", "inhaled": "INHALATION"}.get(value, value.upper() if value.upper() in ROUTES else "UNKNOWN")


def ingredients(value, generic):
    if isinstance(value, str):
        if value.strip().startswith("["):
            value = json.loads(value)
        else:
            value = value.split("+")
    if value is None:
        value = generic.split("+") if generic else []
    if not isinstance(value, list) or not all(isinstance(x, str) for x in value):
        raise ValueError("active_ingredients must be an array or plus-separated names")
    return [clean(x) for x in value if clean(x)]


def formulation(p):
    return "|".join([" + ".join(sorted(token(x) for x in p["active_ingredients"])), token(p["dosage_form_normalized"]), p["route"], p["release_type"]])


def valid_url(value):
    try:
        p = urlsplit(value)
        return p.scheme == "https" and bool(p.hostname) and not p.username and not p.password and not any(c.isspace() for c in value)
    except (ValueError, TypeError):
        return False


def normalize(raw, source, retrieved_at, importer):
    # No salt aliasing, route inference, or generic inference from brand names.
    generic = clean(raw.get("generic_name"))
    p = {"brand_name": clean(raw.get("brand_name")), "generic_name": generic,
         "strength_raw": str(raw.get("strength_raw", raw.get("strength", ""))),
         "dosage_form_raw": str(raw.get("dosage_form_raw", raw.get("dosage_form", ""))),
         "manufacturer_raw": str(raw.get("manufacturer", "")),
         "manufacturer": clean(raw.get("manufacturer")),
         "registration_number": raw.get("registration_number") or None,
         "active_ingredients": ingredients(raw.get("active_ingredients"), generic),
         "route": route(raw.get("route")), "release_type": release(raw.get("release_type")),
         "source_id": source["id"], "source_url": raw.get("source_url", ""),
         "retrieved_at": retrieved_at, "verification_status": "NEEDS_REVIEW",
         "mapping_status": raw.get("mapping_status", "NEEDS_REVIEW"),
         "last_verified": raw.get("last_verified", ""),
         "source_section": raw.get("source_section", "Source identity table"),
         "source_name": raw.get("source_name", source["publisher"]),
         "high_risk": raw.get("high_risk") in (True, "true", "True", "1"),
         "legacy_id": raw.get("id"), "raw_values": raw.copy()}
    p["strength_normalized"] = strength(p["strength_raw"])
    p["dosage_form_normalized"] = FORMS.get(token(p["dosage_form_raw"]), clean(p["dosage_form_raw"]))
    if source.get("reviewed") and raw.get("mapping_status") == "VERIFIED" and raw.get("last_verified"):
        p["verification_status"] = "VERIFIED"
    key = "|".join([token(p["manufacturer"]), token(p["brand_name"]), token(p["strength_normalized"]), formulation(p)])
    p["product_key"] = key
    p["product_id"] = identity("product", key)
    p["generic_key"] = formulation(p)
    # Each raw field has attribution; derived fields explicitly identify their inputs/rule.
    p["field_provenance"] = {name: [{"source_id": source["id"], "publisher": source["publisher"], "source_url": p["source_url"], "retrieved_at": retrieved_at, "importer": importer, "verification_status": p["verification_status"], "raw_value": value, "source_section": p["source_section"], "source_checked_at": p["last_verified"]}] for name, value in raw.items()}
    for name, original, rule in [("strength_normalized", "strength_raw" if "strength_raw" in raw else "strength", "unit spelling/spacing"), ("dosage_form_normalized", "dosage_form_raw" if "dosage_form_raw" in raw else "dosage_form", "explicit form vocabulary"), ("manufacturer", "manufacturer", "Unicode/whitespace"), ("route", "route", "explicit route vocabulary"), ("release_type", "release_type", "explicit release vocabulary")]:
        entries = p["field_provenance"].get(original, [])
        p["field_provenance"][name] = [dict(e, normalization_rule=rule) for e in entries]
    return p


def issue(code, p, field, severity="ERROR", detail=""):
    return {"code": code, "product_id": p.get("product_id"), "source_id": p.get("source_id"), "field": field, "severity": severity, "detail": detail}


def validate(p):
    issues = []
    for field, code in [("brand_name", "MISSING_BRAND"), ("generic_name", "MISSING_GENERIC"), ("strength_normalized", "MISSING_STRENGTH"), ("manufacturer", "MISSING_MANUFACTURER"), ("dosage_form_raw", "MISSING_DOSAGE_FORM")]:
        if not p[field]:
            issues.append(issue(code, p, field))
    if not valid_url(p["source_url"]):
        issues.append(issue("MALFORMED_URL", p, "source_url"))
    if not p["source_id"] or not p["field_provenance"] or not p["retrieved_at"]:
        issues.append(issue("MISSING_PROVENANCE", p, "field_provenance"))
    if token(p["dosage_form_raw"]) not in FORMS:
        issues.append(issue("UNKNOWN_DOSAGE_FORM", p, "dosage_form_normalized", "WARNING"))
    # Ratios, percentages, labelled units and metered doses are allowed. Unparsed prose stays raw.
    residue = re.sub(r"(?i)(\d+(?:\.\d+)?|mcg|mg|ml|iu|mmol|meq|units?|g|l|%|/|\+|per|dose|actuation|puff|metered|each|\s)", "", p["strength_normalized"])
    if residue or (p["strength_normalized"] and (not re.search(r"\d", p["strength_normalized"]) or not re.search(r"(?i)\b(?:mcg|mg|ml|iu|mmol|meq|units?|g|l)\b|%", p["strength_normalized"]))):
        issues.append(issue("INVALID_UNITS", p, "strength_normalized", "WARNING", "Unparsed strength; preserve raw and review"))
    expected = sorted(token(x) for x in p["generic_name"].split("+") if token(x))
    actual = sorted(token(x) for x in p["active_ingredients"])
    if not actual or expected != actual or len(actual) != len(set(actual)):
        issues.append(issue("UNMAPPED_COMBINATION", p, "active_ingredients"))
    if p["route"] == "UNKNOWN" or p["release_type"] == "UNKNOWN":
        issues.append(issue("UNVERIFIED_FORMULATION", p, "route/release_type", "WARNING"))
    if p["mapping_status"] not in {"VERIFIED", "NEEDS_REVIEW"}:
        issues.append(issue("INVALID_MAPPING_STATUS", p, "mapping_status"))
    if p["verification_status"] == "VERIFIED" and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", p["last_verified"]):
        issues.append(issue("INVALID_REVIEW_DATE", p, "last_verified"))
    return issues


def reconcile(records):
    """Exact identities merge attribution. Disagreements remain visible and quarantined."""
    products, issues, packs = {}, [], {}
    for p in records:
        key = p["product_key"]
        if key in products:
            old = products[key]
            issues.append(issue("DUPLICATE_PRODUCT", p, "product_key", "INFO"))
            for field, entries in p["field_provenance"].items():
                existing = old["field_provenance"].setdefault(field, [])
                for entry in entries:
                    if entry not in existing:
                        existing.append(entry)
            old["source_records"].append(p)
            for field in ["registration_number"]:
                if old[field] and p[field] and old[field] != p[field]:
                    issues.append(issue("CONFLICTING_SOURCE_DATA", old, field, detail=f"{old[field]} versus {p[field]}"))
                    old["mapping_status"] = "NEEDS_REVIEW"
                    old["verification_status"] = "NEEDS_REVIEW"
            if old["legacy_id"] and p["legacy_id"] and old["legacy_id"] != p["legacy_id"]:
                old.setdefault("legacy_aliases", []).append(p["legacy_id"])
            continue
        p["source_records"] = [dict(p)]
        products[key] = p
        pack = "|".join(token(p[x]) for x in ["manufacturer", "brand_name", "strength_normalized", "dosage_form_normalized"])
        # Distinct formulations are not collapsed. Only cross-source disagreements are flagged.
        for previous in packs.get(pack, []):
            if previous["source_id"] != p["source_id"] and previous["generic_key"] != p["generic_key"]:
                issues.append(issue("CONFLICTING_SOURCE_DATA", p, "generic_key", detail=f"Also reported as {previous['generic_key']} ({previous['product_id']})"))
                for disputed in [p, previous]:
                    disputed["mapping_status"] = "NEEDS_REVIEW"
                    disputed["verification_status"] = "NEEDS_REVIEW"
        packs.setdefault(pack, []).append(p)
    return list(products.values()), issues


def app_product(p):
    return {"id": p["legacy_id"] or p["product_id"], "brand_name": p["brand_name"], "generic_name": p["generic_name"], "active_ingredients": p["active_ingredients"], "strength": p["strength_normalized"], "dosage_form": p["dosage_form_normalized"], "route": p["route"], "release_type": p["release_type"], "mapping_status": p["mapping_status"] if p["verification_status"] == "VERIFIED" else "NEEDS_REVIEW", "manufacturer": p["manufacturer"], "registration_number": p["registration_number"], "source": p["source_name"], "source_name": p["source_name"], "source_url": p["source_url"], "source_section": p["source_section"], "last_verified": p["last_verified"] or p["retrieved_at"][:10], "high_risk": p["high_risk"]}


def search_index(products):
    fields, postings = [], {}
    for i, p in enumerate(products):
        value = token(" ".join(p[x] for x in ["brand_name", "generic_name", "strength", "dosage_form", "manufacturer"]))
        fields.append(value)
        text = re.sub(r"(\d)(mg|ml|mcg)\b", r"\1 \2", value)
        tokens = re.findall(r"(?:[^\W_]|[%.])+", text, re.UNICODE)
        for word in dict.fromkeys(tokens):
            postings.setdefault(word, []).append(i)
    return {"version": 1, "count": len(products), "postings": postings, "fields": fields}
