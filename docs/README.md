# Documentation map

Start at the root [README](../README.md).

- [DESIGN-PIVOT.md](./DESIGN-PIVOT.md) — what this repository is for
- [development.md](./development.md)
- [deploy.md](./deploy.md)
- [phase-2-complete.md](./phase-2-complete.md) — what the billing slice contains
- [adr/](./adr/)

## Repository layout

| Path | What it is |
| --- | --- |
| `src/` | Next.js app |
| `lib/` | Domain services (billing, dashboard, reporting) |
| `prisma/` | Schema and migrations |
| `tests/` | Unit tests |
| `e2e/` | Playwright |
| `specs/` | Product scope notes |
| `docker/` | Compose helpers |
| `_archives/` | Not the application path |

Community files: root [CONTRIBUTING.md](../CONTRIBUTING.md), [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md), [SECURITY.md](../SECURITY.md).


## Canonical community files

`CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and `SECURITY.md` are at the repository root. This repository does not keep a second copy under `.github/`, because GitHub would show that copy instead of the root file.
