FROM python:3.11-slim

# 環境設定
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# 安裝相依套件
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 複製專案
COPY . .

# Flask 服務 port
EXPOSE 5000

# 使用 gunicorn 啟動
CMD ["gunicorn", "-b", "0.0.0.0:5000", "app:app"]
