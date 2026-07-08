#!/usr/bin/env bash
# Shared Postgres bootstrap for GitHub Actions (migrate + RLS + optional seed).
set -euo pipefail

PGHOST="${PGHOST:-localhost}"
PGUSER="${PGUSER:-postgres}"
PGPASSWORD="${PGPASSWORD:-postgres}"
export PGPASSWORD

echo "Creating psa_app role..."
psql -h "$PGHOST" -U "$PGUSER" -d psa -c "CREATE ROLE psa_app WITH LOGIN PASSWORD 'psa_app_dev' NOSUPERUSER;" || true
psql -h "$PGHOST" -U "$PGUSER" -d psa -c "GRANT CONNECT ON DATABASE psa TO psa_app;"
psql -h "$PGHOST" -U "$PGUSER" -d psa -c "GRANT ALL ON SCHEMA public TO psa_app;"

echo "Applying migrations..."
npx prisma migrate deploy

echo "Applying RLS..."
psql -h "$PGHOST" -U "$PGUSER" -d psa -f prisma/rls.sql

if [[ "${SEED_DEMO:-false}" == "true" ]]; then
  echo "Seeding demo data..."
  npm run db:seed
fi
