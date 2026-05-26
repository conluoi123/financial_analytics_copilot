import sys
import io
# Bỏ qua lỗi encode utf-8 trên windows console
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from vnstock import Vnstock

try:
    stock = Vnstock().stock(symbol='VCB', source='VCI')
    ratios = stock.finance.ratio(period="quarter", lang="en")
    print(ratios.head(20).to_string())
    print(list(ratios.columns))
except Exception as e:
    import traceback
    traceback.print_exc()
