# Contributing

Thank you for your interest in contributing to Professional Service Automation (PSA). This project welcomes bug reports, documentation improvements, and pull requests.

## Before you start

1. Read [`README.md`](README.md) for setup and environment variables.
2. Skim [`AGENTS.md`](AGENTS.md) for the developer contract, module boundaries, and verification gate.
3. Review [`specs/product/mvp-scope.md`](specs/product/mvp-scope.md) to see what is in scope for Phase 1 vs Phase 2.

## Development setup

```bash
git clone https://github.com/SafetyMP/Professional-Service-Automation.git
cd Professional-Service-Automation

cp .env.example .env
# Set AUTH_SECRET: openssl rand -base64 32

docker compose up -d
npm install
npm run db:migrate
npm run db:seed
npm run dev -- -p 3005
```

Demo login: organization `demo-firm`, `admin@demo.com` / `password123`. Local dev uses port **3005** (see `.env.example` `AUTH_URL`); Docker stack quick start uses port 3000.

## Making changes

### Branching

- Branch from `main`.
- Use descriptive branch names, e.g. `fix/invoice-rounding`, `feat/milestone-billing`.

### Code conventions

- Domain logic belongs in `lib/<domain>/service.ts`.
- Cross-domain imports must go through public service files only (see `scripts/check-boundaries.ts`).
- Match existing TypeScript, React, and Tailwind patterns in the surrounding code.
- Keep diffs focused; avoid unrelated refactors.

### Domain specs

When changing billing, profitability, or accounting behavior, update the relevant spec under `specs/domain/` and add or adjust unit tests in `tests/`.

## Verification

Before opening a pull request, run:

```bash
./scripts/verify.sh
```

This runs lint, typecheck, unit tests, module boundary checks, and Prisma validation. CI runs the same gate on every push and pull request.

Individual commands:

| Command | Purpose |
|---------|---------|
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm run test` | Vitest unit tests |
| `npm run check:boundaries` | Module import boundaries |

## Pull requests

1. Fill out the pull request template.
2. Link related issues when applicable.
3. Ensure CI is green.
4. Describe user-visible behavior changes and any migration or env var updates.

### Review priorities

Reviewers block on P0/P1 issues:

- Auth bypass or session flaws
- Cross-tenant data leaks
- Billing math errors
- Data loss or destructive migrations without a safe path

## Reporting bugs

Use the [bug report issue template](.github/ISSUE_TEMPLATE/bug_report.yml). Do **not** file public issues for security vulnerabilities — see [`SECURITY.md`](SECURITY.md).

## Feature requests

Use the [feature request issue template](.github/ISSUE_TEMPLATE/feature_request.yml). Check the Phase 2 list in `specs/product/mvp-scope.md` before proposing net-new scope.

## Code of conduct

This project follows the [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold it.

## Questions

Open a [GitHub Discussion](https://github.com/SafetyMP/Professional-Service-Automation/discussions) for questions that are not bugs or feature requests. If Discussions are not enabled on the repository, open a feature request or documentation issue instead.
