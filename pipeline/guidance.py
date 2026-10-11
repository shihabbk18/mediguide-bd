"""Retain reviewed clinical evidence separately; never derive instructions from brands."""
import re

from .core import token, valid_url, ROUTES, RELEASES

FOOD = {"BEFORE_FOOD", "WITH_FOOD", "AFTER_FOOD", "WITH_OR_WITHOUT_FOOD", "EMPTY_STOMACH", "NO_SPECIFIC_REQUIREMENT", "VARIABLE_BY_INDICATION_OR_FORMULATION", "NOT_APPLICABLE", "UNKNOWN"}
TIMING = {"MORNING", "EVENING", "BEDTIME", "EVENLY_SPACED", "CONSISTENT_TIME", "NO_SPECIFIC_TIME", "PRESCRIPTION_DEPENDENT", "UNKNOWN", "NOT_APPLICABLE"}
STATUS = {"VERIFIED", "PARTIALLY_VERIFIED", "NOT_AVAILABLE", "NEEDS_REVIEW"}
CLAIM_ARRAYS = ["common_uses", "administration_notes", "food_drink_notes", "warnings"]
DOSING = re.compile(r"\b(?:take|give|use)\s+\d|\b\d+\s*(?:mg|ml|tablets?|capsules?|days?|weeks?)\b|\b(?:once|twice|three times)\s+(?:a |per )?day|\b(?:start|stop|replace|increase|decrease|switch)\s+(?:taking|your (?:dose|medicine)|the dose|this medicine)\b", re.I)


def validate_guidance(guidance, sources):
    source_map = {s["id"]: s for s in sources}
    if len(source_map) != len(sources) or any(not valid_url(s["url"]) for s in sources):
        raise ValueError("Invalid guidance source register")
    seen, provenance = set(), []
    for g in guidance:
        key = "|".join([" + ".join(sorted(token(x) for x in g["generic_name"].split("+"))), token(g["dosage_form"]), g["route"], g["release_type"]])
        if key != g["generic_key"] or key in seen:
            raise ValueError("Invalid/duplicate generic guidance key")
        seen.add(key)
        if g["route"] not in ROUTES or g["release_type"] not in RELEASES or g["food_relation"] not in FOOD or g["timing_type"] not in TIMING or g["verification_status"] not in STATUS:
            raise ValueError("Invalid guidance state")
        if g["food_relation"] == "NOT_APPLICABLE" and (g["route"] in {"ORAL", "UNKNOWN"} or g["meal_relevance"] != "NOT_APPLICABLE"):
            raise ValueError("Non-oral evidence required for meal irrelevance")
        if g["food_relation"] != "UNKNOWN" and not g["food_guidance"]:
            raise ValueError("Food state needs cited evidence")
        if g["verification_status"] == "VERIFIED" and g["food_relation"] == "UNKNOWN":
            raise ValueError("UNKNOWN food guidance cannot be VERIFIED")
        if g["timing_type"] not in {"UNKNOWN", "PRESCRIPTION_DEPENDENT", "NOT_APPLICABLE"} and not g["timing_guidance"]:
            raise ValueError("Timing state needs cited evidence")
        field_provenance = {}
        for field in ["food_guidance", "timing_guidance", *CLAIM_ARRAYS]:
            claims = g[field] if field in CLAIM_ARRAYS else [g[field]] if g[field] else []
            field_provenance[field] = []
            for claim in claims:
                if not claim["en"].strip() or not claim["bn"].strip() or not claim["source_section"].strip() or not claim["source_ids"] or DOSING.search(claim["en"]):
                    raise ValueError("Uncited/unsafe administration claim")
                for source_id in claim["source_ids"]:
                    if source_id not in source_map:
                        raise ValueError("Unknown guidance citation")
                    source = source_map[source_id]
                    field_provenance[field].append({"source_id": source_id, "publisher": source["name"], "source_url": source["url"], "source_section": claim["source_section"], "source_checked_at": g["last_verified"], "verification_status": g["verification_status"], "raw_value": claim})
        provenance.append({"generic_key": key, "review_input": "data/inputs/generic_guidance.json", "field_provenance": field_provenance})
    return provenance
