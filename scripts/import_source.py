"""Import one allowed source, or all enabled sources, into checkpointed fact snapshots."""
import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from pipeline.importers import import_source, load_manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", help="manifest source ID or --all", nargs="?", default="all")
    parser.add_argument("--all", action="store_true", dest="all_sources")
    args = parser.parse_args()
    ids = [s["id"] for s in load_manifest(ROOT).values() if s["enabled"]] if args.all_sources or args.source == "all" else [args.source]
    for source_id in ids:
        print(json.dumps(import_source(ROOT, source_id), ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except (KeyError, ValueError, PermissionError, OSError) as error:
        print(f"Import failed: {error}", file=sys.stderr)
        sys.exit(1)
