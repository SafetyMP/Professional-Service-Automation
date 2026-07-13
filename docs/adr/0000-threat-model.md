# ADR 0000: Threat Model — Caller, Trust Boundary, Authentication

**Status:** Accepted  
**Date:** 2026-07-13  
**Product:** Professional Service Automation

## Context

PSA integrates billing and accounting APIs behind session-authenticated Next.js routes. Cooperative Playwright E2E validates signed-in flows. Tier-3 adversarial tests unauthenticated access to protected integration routes.

See `specs/threat-model.yaml` and `scripts/adversarial.sh`.

## Decision

### Principals

| Principal | Access |
|-----------|--------|
| `anonymous` | public pages only |
| `authenticated_user` | tenant-scoped invoice/integration APIs |

### Trust boundary

Integration connect routes (`/api/integrations/*/connect`) require authenticated session. Missing session → `401 Unauthorized`.

### Authentication

Next.js session validation on API routes before OAuth redirect or invoice export.

## References

- `specs/threat-model.yaml`, `scripts/adversarial.sh`
