import duckdb
from pathlib import Path

DB_PATH    = "data/finsight.duckdb"
BRONZE_DIR = Path("data/bronze").resolve().as_posix()

def get_connection() -> duckdb.DuckDBPyConnection:
    return duckdb.connect(DB_PATH)

def init_warehouse():
    """
    Tao DuckDB views tro thang vao Delta tables o Bronze.
    dbt se dung cac views nay lam sources khi chay models.
    """
    con = get_connection()

    # Cai va load extension delta de DuckDB doc duoc format Delta Lake
    con.execute("INSTALL delta; LOAD delta;")

    # Tao cac Bronze views
    # delta_scan() la ham dac biet cua DuckDB de quet thu muc Delta
    con.execute(f"""
        CREATE OR REPLACE VIEW vn_stocks AS
        SELECT * FROM delta_scan('{BRONZE_DIR}/vn_stocks')
    """)
    con.execute(f"""
        CREATE OR REPLACE VIEW vn_financials AS
        SELECT * FROM delta_scan('{BRONZE_DIR}/vn_financials')
    """)
    con.execute(f"""
        CREATE OR REPLACE VIEW world_bank AS
        SELECT * FROM delta_scan('{BRONZE_DIR}/world_bank')
    """)

    con.close()
    print("[OK] DuckDB warehouse initialized -- Bronze views ready for dbt")

if __name__ == "__main__":
    init_warehouse()
