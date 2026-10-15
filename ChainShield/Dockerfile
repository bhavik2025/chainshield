# ChainShield Transportation System — production image
# Pinned to 3.10 to match the local dev venv (Python 3.10.x) so "works locally" == "works in Docker".
FROM python:3.10-slim

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

# On start: create tables and seed demo data (both safe to re-run, they skip what
# already exists), then serve. eventlet worker so Flask-SocketIO's websockets work
# under Gunicorn. Binds to $PORT when the host sets one (Render does), else 5000.
CMD flask init-db && flask seed-db && \
    exec gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:${PORT:-5000} wsgi:app
