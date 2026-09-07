# ChainShield Transportation System — MCA Sem 3 rebuild
FROM python:3.11-slim

# Prevent .pyc files and enable unbuffered logging (useful in `docker logs`)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FLASK_APP=wsgi.py \
    FLASK_CONFIG=production

WORKDIR /app

# System deps kept minimal — SQLite ships with the Python base image already.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN mkdir -p instance

EXPOSE 5000

# eventlet worker so Flask-SocketIO's websocket support works under Gunicorn.
CMD ["gunicorn", "--worker-class", "eventlet", "-w", "1", "--bind", "0.0.0.0:5000", "wsgi:app"]
