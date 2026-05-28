import duckdb
from pathlib import Path

DB_PATH    = "data/finsight.duckdb"
BRONZE_DIR = Path("data/bronze").resolve().as_posix()

def get_connection() -> duckdb.DuckDBPyConnection:
    return duckdb.connect(DB_PATH)

def init_warehouse():
    """
    Tạo DuckDB views trỏ thẳng vào Delta tables ở Bronze.
    dbt sẽ dùng các views này làm sources khi chạy models.
    """
    con = get_connection()

    # Cài và load extension delta để DuckDB đọc được format Delta Lake
    con.execute("INSTALL delta; LOAD delta;")

    # Tạo các Bronze views
    # delta_scan() là hàm đặc biệt của DuckDB để quét thư mục Delta
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
    print("✅ DuckDB warehouse initialized — Bronze views ready for dbt")

if __name__ == "__main__":
    init_warehouse()
