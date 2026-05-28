import duckdb
import pandas as pd
from backend.db.warehouse import get_connection

def run_query(sql: str) -> pd.DataFrame:
    """
    Thực thi SQL query và trả về Pandas DataFrame.
    """
    con = get_connection()
    try:
        # LOAD delta để đảm bảo query vào các view Delta không bị lỗi
        con.execute("LOAD delta;")
        df = con.execute(sql).df()
        return df
    finally:
        con.close()

def validate_sql(sql: str) -> tuple[bool, str]:
    """
    Dry-run SQL để kiểm tra xem query có hợp lệ không trước khi chạy thật.
    Dùng cho AI Agent để kiểm tra SQL do LLM sinh ra.
    """
    con = get_connection()
    try:
        con.execute("LOAD delta;")
        # explain sẽ compile query nhưng không tốn thời gian chạy data
        con.execute(f"EXPLAIN {sql}")
        return True, ""
    except Exception as e:
        return False, str(e)
    finally:
        con.close()
