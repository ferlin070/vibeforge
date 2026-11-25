# VibeForge RC2 release gates

## Audit status

- Phases 1–8: CI passed, exact baseline commit `62d4e5013fe5eed06782c49c28b3ea2b98e3beca`, [run 45523782522](https://github.com/ferlin070/vibeforge/actions/runs/45523782522), 118 tests.
- Phase 9: documentation and project hygiene passed [run 45525056061](https://github.com/ferlin070/vibeforge/actions/runs/45525056061).
- Phase 10: Commit `7c01ab03ef4244da847d54866c4c1f734d373181`, [GitHub Actions run 45526037111](https://github.com/ferlin070/vibeforge/actions/runs/45526037111): 119 unit/integration tests and six Chromium smoke tests passed; production build, ESLint, Prettier and production dependency audit also passed (zero vulnerabilities reported).

## Required before a public launch

- [ ] All ten audit phases reviewed; exact release commit passes install, tests, build, lint, format and dependency audit.
- [x] Local production-mode Chromium smoke tests: project creation, routing/history, mobile keyboard navigation, drafts, reload, local recovery, downloads and CSP/hydration. Hosted staging verification is still required.
- [ ] Authorized live Supabase testing: sign-up, confirmation, sign-in/out, refresh, password reset, resend, snapshot save/list/restore/delete, and two-account isolation.
- [ ] Auth Site URL, allowed redirects, SMTP, signup abuse controls and backup/restore process confirmed.
- [ ] Authorized live tests of the seven AI options and intended custom gateway configurations with compatible models and controlled budget. Review GitHub live scan and CI import.
- [ ] Production Redis and additional abuse controls verified; intended custom hosts explicitly allowlisted; secret handling and egress reviewed.
- [ ] Browser accessibility and performance reviewed; no critical/high unresolved defects without an explicit documented risk decision.
- [ ] Formal legal/operator review of privacy, terms, data retention, support, account deletion and applicable jurisdiction. Verified contact and security reporting channel established.
- [ ] Known-good rollback deployment recorded; environment and schema compatibility reviewed. No blind SQL replay.
- [ ] Explicit owner approval for production deployment, domain, metadata/robots configuration and final package release version.

The package remains 1.0.0-rc.1 during the audit. A passing CI check is not an authorization to merge or deploy. Never mark unrun tests as passed. See [runbook](DEPLOYMENT_RUNBOOK.md).

## RC3 readiness increment

See [RC3 readiness](RC3-READINESS.md). The new candidate pins Node.js 22.x and requires distributed rate limiting for production API access. Hosted custom gateways require explicit hostname approval. Production remains blocked until live integration and operator gates are satisfied.
