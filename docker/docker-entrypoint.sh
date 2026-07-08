#!/bin/sh
set -e

PGHOST="${PGHOST:-postgres}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-postgres}"

echo "Waiting for Postgres at ${PGHOST}:${PGPORT}..."
until pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" >/dev/null 2>&1; do
  sleep 1
done

echo "Applying migrations..."
npx prisma migrate deploy

echo "Applying RLS policies..."
PGPASSWORD="${POSTGRES_PASSWORD:-postgres}" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d psa -f prisma/rls.sql

if [ "${SEED_DEMO:-false}" = "true" ]; then
  echo "Seeding demo data..."
  su-exec nextjs node ./node_modules/tsx/dist/cli.mjs scripts/seed-demo.ts
fi

echo "Starting application..."
exec su-exec nextjs "$@"
