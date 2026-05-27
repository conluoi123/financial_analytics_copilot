import argparse

from finsight.pipeline.transforms.silver_builder import run_silver, summarize_coverage


def main() -> None:
    parser = argparse.ArgumentParser(description="Build silver layer from bronze Delta tables")
    _ = parser.parse_args()

    outputs = run_silver()
    print(f"[OK] Silver market_daily: {len(outputs['market_daily'])} rows")
    print(f"[OK] Silver financials_quarterly: {len(outputs['financials_quarterly'])} rows")
    print(f"[OK] Silver macro_yearly: {len(outputs['macro_yearly'])} rows")
    print(f"[OK] Silver silver_features: {len(outputs['silver_features'])} rows")

    coverage = summarize_coverage(outputs["silver_features"])
    print("\nCoverage check:")
    print(f"- Financial coverage (any metric present): {coverage['financial_coverage']:.2f}%")
    print(f"- Macro coverage (any metric present): {coverage['macro_coverage']:.2f}%")


if __name__ == "__main__":
    main()
