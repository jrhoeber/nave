#!/bin/sh
set -e

echo "Running database migrations..."
alembic upgrade head

echo "Running seed files..."
for f in /app/seeds/*.sql; do
  echo "  Seeding $f..."
  psql "$DATABASE_URL" -f "$f"
done

echo "Starting API..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --reload-dir /app/app
