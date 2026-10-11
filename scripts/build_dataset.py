"""Build normalized entities, reports, and the static application's dataset."""
import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from pipeline.build import build_dataset


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--refresh", action="store_true", help="Reimport all enabled sources; otherwise reuse checkpoints")
    args = parser.parse_args()
    try:
        print(json.dumps(build_dataset(ROOT, args.refresh), ensure_ascii=False, indent=2))
    except (ValueError, PermissionError, OSError, KeyError) as error:
        print(f"Dataset build failed: {error}", file=sys.stderr)
        sys.exit(1)
