# Deployment Guide

This guide covers running PSA in production-like environments: Docker Compose (recommended for self-hosting), container platforms, and manual Node deployment.

## Prerequisites

- **AUTH_SECRET** — at least 32 characters (`openssl rand -base64 32`)
- **AUTH_URL** — public URL users reach (e.g. `https://psa.example.com`)
- **PostgreSQL 16** with the `psa_app` RLS role (created automatically in Docker setups below)

## Docker Compose (full stack)

The fastest way to run Postgres + the app together:

```bash
export AUTH_SECRET="$(openssl rand -base64 32)"
docker compose -f docker-compose.stack.yml up --build -d
```

Open [http://localhost:3000](http://localhost:3000) and sign in:

| Field | Value |
|-------|-------|
| Organization | `demo-firm` |
| Email | `admin@demo.com` |
| Password | `password123` |

The stack automatically runs migrations, applies RLS policies, and seeds demo data on first start (`SEED_DEMO=true` by default).

### Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `AUTH_SECRET` | *(required)* | Session signing secret |
| `AUTH_URL` | `http://localhost:3000` | Public app URL |
| `APP_PORT` | `3000` | Host port mapped to the container |
| `SEED_DEMO` | `true` | Seed demo org/users on startup |

To disable demo seeding in production:

```bash
SEED_DEMO=false AUTH_SECRET="..." docker compose -f docker-compose.stack.yml up -d
```

### Logs and teardown

```bash
docker compose -f docker-compose.stack.yml logs -f app
docker compose -f docker-compose.stack.yml down        # keep data volume
docker compose -f docker-compose.stack.yml down -v   # delete data
```

## Docker image only

Build and run against an existing Postgres instance:

```bash
docker build -t psa-platform .

docker run --rm -p 3000:3000 \
  -e DATABASE_URL="postgresql://psa_app:PASSWORD@db-host:5432/psa?schema=public" \
  -e DIRECT_URL="postgresql://postgres:PASSWORD@db-host:5432/psa?schema=public" \
  -e AUTH_SECRET="$(openssl rand -base64 32)" \
  -e AUTH_URL="https://psa.example.com" \
  -e PGHOST=db-host \
  psa-platform
```

Ensure the `psa_app` role exists and RLS policies are applied (`prisma/rls.sql`) before serving traffic.

### Pre-built image (GitHub Container Registry)

Each [GitHub release](https://github.com/SafetyMP/Professional-Service-Automation/releases) publishes:

```text
ghcr.io/safetymp/professional-service-automation:<version>
```

```bash
docker pull ghcr.io/safetymp/professional-service-automation:0.1.3

docker run --rm -p 3000:3000 \
  -e DATABASE_URL="postgresql://psa_app:PASSWORD@db-host:5432/psa?schema=public" \
  -e DIRECT_URL="postgresql://postgres:PASSWORD@db-host:5432/psa?schema=public" \
  -e AUTH_SECRET="$(openssl rand -base64 32)" \
  -e AUTH_URL="http://localhost:3000" \
  -e PGHOST=db-host \
  ghcr.io/safetymp/professional-service-automation:0.1.3
```

Make the package public under **Packages** in the repo settings if pulls fail with 403.

## Railway

1. Create a **PostgreSQL** plugin and a **GitHub repo** service.
2. Set service variables:

   | Variable | Value |
   |----------|-------|
   | `DATABASE_URL` | RLS app URL (create `psa_app` role — see `docker/init-db.sql`) |
   | `DIRECT_URL` | Railway Postgres URL (superuser) |
   | `AUTH_SECRET` | Random 32+ char secret |
   | `AUTH_URL` | `https://${{RAILWAY_PUBLIC_DOMAIN}}` |
   | `SEED_DEMO` | `false` in production |

3. Set **Build Command**: `npm run build`
4. Set **Start Command**: `npx prisma migrate deploy && node .next/standalone/server.js`  
   *(Or deploy via Dockerfile for migrate + RLS in the entrypoint.)*
5. Run RLS once: `psql $DIRECT_URL -f prisma/rls.sql`

## Fly.io

```bash
fly launch --no-deploy
fly postgres create
fly postgres attach <pg-app-name>
```

Set secrets:

```bash
fly secrets set AUTH_SECRET="$(openssl rand -base64 32)"
fly secrets set AUTH_URL="https://<your-app>.fly.dev"
fly secrets set SEED_DEMO=false
```

Deploy with the included `Dockerfile`:

```bash
fly deploy
```

Apply RLS after first deploy:

```bash
fly ssh console -C "psql \$DIRECT_URL -f prisma/rls.sql"
```

## Manual Node deployment

```bash
npm ci
cp .env.example .env   # configure production values
npx prisma migrate deploy
psql "$DIRECT_URL" -f prisma/rls.sql
npm run build
npm start              # listens on PORT (default 3000)
```

Use a process manager (systemd, PM2) and a reverse proxy (nginx, Caddy) for TLS termination.

## Production checklist

- [ ] Rotate `AUTH_SECRET` and all demo passwords
- [ ] Set `SEED_DEMO=false`
- [ ] Use TLS (`AUTH_URL` must match the public HTTPS URL)
- [ ] Back up Postgres regularly
- [ ] Restrict database access to the app network
- [ ] Review [`SECURITY.md`](../SECURITY.md) before exposing to the internet

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| 500 after deploy | Check `AUTH_SECRET` is set and migrations ran |
| Login fails after reseed | Sign out and back in (session validation) |
| RLS errors | Confirm `DATABASE_URL` uses `psa_app`, not superuser |
| Prisma client stale | Run `npx prisma generate` after schema changes |

See also [`docs/development.md`](development.md) for local development workflows.
