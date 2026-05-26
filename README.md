# scene_text_recognition

## Luu y vnstock migration (2026)

- Du an da chuyen sang `vnstock.api` de tranh deprecation cua lop `Vnstock`.
- Mau moi:
  - `from vnstock.api.quote import Quote`
  - `from vnstock.api.finance import Finance`
- Khong dung pattern cu: `Vnstock().stock(...)`.
- Dependency da cap nhat: `vnstock>=4.0.0` trong `requirements.txt`.
