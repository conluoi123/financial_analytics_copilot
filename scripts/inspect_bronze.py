import argparse
from pathlib import Path

from finsight.pipeline.delta_writer import read_bronze


def inspect_source(source: str, sample_rows: int) -> None:
    base = Path("data/bronze") / source
    print(f"\n=== Bronze Source: {source} ===")
    print(f"Path: {base.resolve()}")

    if not base.exists():
        print("Status: NOT FOUND")
        return

    log_dir = base / "_delta_log"
    if log_dir.exists():
        commits = sorted(log_dir.glob("*.json"))
        print(f"Delta commits: {len(commits)}")
        if commits:
            print(f"Latest commit: {commits[-1].name}")
    else:
        print("Delta commits: _delta_log not found")

    df = read_bronze(source)
    print(f"Rows: {len(df)}")
    print(f"Columns ({len(df.columns)}): {list(df.columns)}")

    print("\nDtypes:")
    print(df.dtypes)

    if {"ticker", "trade_date"}.issubset(df.columns):
        dup = df.duplicated(subset=["ticker", "trade_date"]).sum()
        print(f"Potential duplicates by [ticker, trade_date]: {dup}")

    print(f"\nSample ({sample_rows} rows):")
    print(df.head(sample_rows))


def main() -> None:
    parser = argparse.ArgumentParser(description="Inspect Bronze Delta tables")
    parser.add_argument(
        "--source",
        default="all",
        help="Bronze source name (vn_stocks|vn_financials|world_bank|all)",
    )
    parser.add_argument("--rows", type=int, default=5, help="Sample rows to display")
    args = parser.parse_args()

    sources = ["vn_stocks", "vn_financials", "world_bank"]
    if args.source != "all":
        sources = [args.source]

    for source in sources:
        inspect_source(source, args.rows)


if __name__ == "__main__":
    main()
