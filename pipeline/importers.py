"""Adapters share one lifecycle; extraction never grants medical verification."""
from __future__ import annotations

import csv
import hashlib
import io
import json
import re
import time
from abc import ABC, abstractmethod
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlsplit
from urllib.request import Request, HTTPRedirectHandler, build_opener
from urllib.robotparser import RobotFileParser

from .core import normalize, validate, now, valid_url

USER_AGENT = "MediGuideDataPipeline/1.0 (permitted-source import; no production crawling)"


class NoRedirects(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise PermissionError("Redirects require a separately reviewed endpoint; refusing to follow")


def urlopen(request, timeout):
    return build_opener(NoRedirects()).open(request, timeout=timeout)


def write_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def load_manifest(root):
    # JSON syntax is valid YAML 1.2. This deliberately needs no YAML dependency.
    manifest = json.loads((Path(root) / "config/sources.yaml").read_text(encoding="utf-8-sig"))
    sources = manifest["sources"]
    ids = set()
    for source in sources:
        for field in ["id", "publisher", "source_type", "base_url", "enabled", "access_method", "license_or_permission_note", "last_checked", "adapter", "input"]:
            if field not in source:
                raise ValueError(f"Missing source manifest field: {field}")
        if source["id"] in ids:
            raise ValueError("Duplicate source ID")
        if not re.fullmatch(r"[a-z0-9][a-z0-9_-]*", source["id"]) or not isinstance(source["enabled"], bool):
            raise ValueError("Source ID must be a safe slug and enabled must be boolean")
        if not valid_url(source["base_url"]) or not source["license_or_permission_note"].strip():
            raise ValueError("Source needs a publisher HTTPS URL and access/permission note")
        ids.add(source["id"])
    return {s["id"]: s for s in sources}


class Importer(ABC):
    def __init__(self, root, source):
        self.root, self.source = Path(root).resolve(), source
        self.retrieved_at = now()

    def fetch(self):
        s = self.source
        if not s["enabled"]:
            raise PermissionError(f"Source {s['id']} is disabled: {s['license_or_permission_note']}")
        if s["access_method"] == "local_reviewed_file":
            path = (self.root / s["input"]).resolve()
            if not path.is_relative_to(self.root):
                raise ValueError("Input must stay within project root")
            return path.read_bytes()
        if s["access_method"] != "permitted_https" or not s.get("automated_access_allowed") or not s.get("redistribution_allowed") or not s.get("permission_reference"):
            raise PermissionError("Remote fetching requires explicit access AND redistribution permission")
        url = s["input"]
        if not valid_url(url) or urlsplit(url).hostname != urlsplit(s["base_url"]).hostname:
            raise ValueError("Remote input must be HTTPS on the declared source host")
        robots_url = s["base_url"].rstrip("/") + "/robots.txt"
        # Fail closed on unavailable/ambiguous robots, even with a manifest permission note.
        with urlopen(Request(robots_url, headers={"User-Agent": USER_AGENT}), timeout=20) as response:
            if not valid_url(response.url) or urlsplit(response.url).hostname != urlsplit(robots_url).hostname:
                raise PermissionError("Robots redirect outside source host")
            policy = response.read(256_001)
            if len(policy) > 256_000 or b"<html" in policy.lower():
                raise PermissionError("Ambiguous robots policy")
        robots = RobotFileParser(robots_url)
        robots.parse(policy.decode("utf-8").splitlines())
        if not robots.can_fetch(USER_AGENT, url):
            raise PermissionError("robots.txt disallows this importer")
        delay = max(2, s.get("throttle_seconds", 2), robots.crawl_delay(USER_AGENT) or 0)
        for attempt in range(4):
            time.sleep(delay * (attempt + 1))
            try:
                with urlopen(Request(url, headers={"User-Agent": USER_AGENT}), timeout=30) as response:
                    if urlsplit(response.url).hostname != urlsplit(url).hostname or not valid_url(response.url):
                        raise PermissionError("Redirect outside permitted source")
                    data = response.read(20_000_001)
                    if len(data) > 20_000_000:
                        raise ValueError("Source exceeds the 20 MB import limit; configure paginated adapter")
                    return data
            except HTTPError as error:
                if error.code not in {429, 500, 502, 503, 504} or attempt == 3:
                    raise
                try:
                    retry_after = float(error.headers.get("Retry-After", "0"))
                except ValueError:
                    retry_after = 0
                time.sleep(min(60, max(0, retry_after)))
        raise RuntimeError("Fetch exhausted")

    @abstractmethod
    def parse(self, payload):
        """Return source facts, never invented identities or medical guidance."""

    def normalize(self, row):
        columns = self.source.get("columns", {})
        row = {columns.get(k, k): v for k, v in row.items()}
        for key, value in self.source.get("defaults", {}).items():
            row.setdefault(key, value)
        return normalize(row, self.source, self.retrieved_at, type(self).__name__)

    def validate(self, product):
        return validate(product)

    def export(self, payload, rows, issues):
        run = {"source_id": self.source["id"], "publisher": self.source["publisher"], "importer": type(self).__name__, "retrieved_at": self.retrieved_at, "input_sha256": hashlib.sha256(payload).hexdigest(), "records": len(rows), "validation_errors": sum(i["severity"] == "ERROR" for i in issues), "permission_note": self.source["license_or_permission_note"]}
        run["source_config_sha256"] = hashlib.sha256(json.dumps(self.source, sort_keys=True).encode()).hexdigest()
        write_json(self.root / f"data/ingested/{self.source['id']}.json", {"run": run, "products": rows, "validation_issues": issues})
        log = self.root / "data/ingested/runs.jsonl"
        log.parent.mkdir(parents=True, exist_ok=True)
        with log.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(run, ensure_ascii=False) + "\n")
        return run

    def run(self):
        payload = self.fetch()
        rows, issues = [], []
        for number, raw in enumerate(self.parse(payload), 1):
            try:
                row = self.normalize(raw)
                found = self.validate(row)
                rows.append(row)
                issues.extend(dict(i, row=number) for i in found)
            except (ValueError, TypeError, KeyError) as error:
                issues.append({"code": "PARSE_ERROR", "severity": "ERROR", "source_id": self.source["id"], "row": number, "detail": str(error)})
        return self.export(payload, rows, issues)


class JSONImporter(Importer):
    def parse(self, payload):
        data = json.loads(payload.decode("utf-8-sig"))
        if self.source.get("records_key"):
            data = data[self.source["records_key"]]
        if not isinstance(data, list) or not all(isinstance(x, dict) for x in data):
            raise ValueError("JSON source must contain an array of fact objects")
        return data


class ManufacturerJSONImporter(JSONImporter):
    """Manufacturer adapter: declarative filter, no scattered brand-specific logic."""
    def parse(self, payload):
        manufacturer = self.source["manufacturer"]
        return [row for row in super().parse(payload) if row.get("manufacturer") == manufacturer]


class CSVImporter(Importer):
    def parse(self, payload):
        reader = csv.DictReader(io.StringIO(payload.decode("utf-8-sig")))
        if not reader.fieldnames or len(reader.fieldnames) != len(set(reader.fieldnames)):
            raise ValueError("CSV needs unique column headers")
        rows = list(reader)
        if any(None in row or None in row.values() for row in rows):
            raise ValueError("CSV rows must match column count")
        return rows


class ManualVerifiedCSVImporter(CSVImporter):
    def normalize(self, row):
        if not row.get("reviewed_by") or not row.get("last_verified") or not row.get("source_url"):
            raise ValueError("Manual verified rows require reviewer, date, and publisher URL")
        return super().normalize(row)


class TableParser(HTMLParser):
    def __init__(self, table_id):
        super().__init__(convert_charrefs=True)
        self.table_id, self.depth, self.rows, self.row, self.cell = table_id, 0, [], None, None

    def handle_starttag(self, tag, attrs):
        if tag == "table" and (self.depth or dict(attrs).get("id") == self.table_id):
            self.depth += 1
        if self.depth == 1 and tag == "tr":
            self.row = []
        if self.depth == 1 and tag in {"td", "th"} and self.row is not None:
            self.cell = []

    def handle_data(self, data):
        if self.cell is not None:
            self.cell.append(data)

    def handle_endtag(self, tag):
        if tag in {"td", "th"} and self.cell is not None:
            self.row.append(" ".join("".join(self.cell).split()))
            self.cell = None
        if tag == "tr" and self.row is not None:
            self.rows.append(self.row)
            self.row = None
        if tag == "table" and self.depth:
            self.depth -= 1


def table_records(rows):
    if len(rows) < 2 or not rows[0] or len(set(rows[0])) != len(rows[0]):
        raise ValueError("Reliable table extraction requires unique headers and data rows")
    for row in rows[1:]:
        if len(row) != len(rows[0]) or any(x is None for x in row):
            raise ValueError("Unreliable table: ragged/merged cells require manual review")
        yield dict(zip(rows[0], row))


class HTMLImporter(Importer):
    def parse(self, payload):
        parser = TableParser(self.source["table_id"])
        parser.feed(payload.decode("utf-8"))
        return list(table_records(parser.rows))


class PDFTableImporter(Importer):
    def parse(self, payload):
        # Explicit reviewed page/table coordinates; no OCR, prose regex, or automatic verification.
        if not self.source.get("table_extraction_reviewed") or not self.source.get("tables"):
            raise ValueError("PDF tables require reviewed page/table selection")
        try:
            import pdfplumber
        except ImportError as error:
            raise RuntimeError("PDF adapter requires optional requirements-pdf.txt") from error
        rows = []
        with pdfplumber.open(io.BytesIO(payload)) as document:
            for selection in self.source["tables"]:
                page = document.pages[selection["page"] - 1]
                tables = page.extract_tables()
                rows.extend(table_records(tables[selection["table"]]))
        return rows


ADAPTERS = {"json": JSONImporter, "manufacturer_json": ManufacturerJSONImporter, "csv": CSVImporter, "manual_verified_csv": ManualVerifiedCSVImporter, "html_table": HTMLImporter, "pdf_table": PDFTableImporter}


def import_source(root, source_id):
    source = load_manifest(root)[source_id]
    return ADAPTERS[source["adapter"]](root, source).run()
