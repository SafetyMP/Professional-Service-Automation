---
name: code-review
description: "Review PSA PRs for realization-kernel boundaries, Postgres RLS, and domain service.ts isolation. Use on pull requests that touch lib/time, lib/billing, lib/projects, lib/resources, or Prisma. Flag RLS bypass and cross-domain internals imports."
---

# Copilot code review — Professional-Service-Automation

Use this skill when reviewing a pull request in this repository.

This is a **consulting realization kernel**, not a generic time tracker.

- Reject imports of another domain's internals; use that module's `service.ts`.
- Reject RLS / `withOrgContext()` bypass.
- Reject deleting `lib/time`.
- Verify with `./scripts/verify.sh`.


## Always flag

- Secrets, `.env` values, private keys, or real personal data in the diff
- Weakened or skipped verify / lint / typecheck / adversarial gates
- Invented success (prose claiming a gate passed with no command output)
- Fail-open authorization, skipped human approval, or agents recording `--actor user`

## Never request

- Drive-by major upgrades, formatter churn, or unrelated refactors
- Softening honesty disclaimers or certification claims
