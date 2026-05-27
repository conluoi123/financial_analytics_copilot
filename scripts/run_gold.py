import argparse

from finsight.pipeline.transforms.gold_builder import build_gold


def main() -> None:
    parser = argparse.ArgumentParser(description="Build gold layer from silver datasets")
    _ = parser.parse_args()

    outputs = build_gold()
    print(f"[OK] Gold full: {len(outputs['gold_full'])} rows")
    print(f"[OK] Gold fallback: {len(outputs['gold_fallback'])} rows")
    print(f"[OK] Gold latest snapshot: {len(outputs['gold_latest_snapshot'])} rows")


if __name__ == "__main__":
    main()
