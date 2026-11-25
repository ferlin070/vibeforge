# Developer guide

## Setup

Use Node.js 22 and `npm ci`. Run `npm run dev` for development, `npm run build` and `npm start` for a production-mode local build. Use `.env.local` for environment values; never commit it. Manual planning works without cloud configuration.

Hosted API routes require a verified Supabase session. Plain local development without VERCEL_ENV may bypass authentication for non-custom routes unless VIBEFORGE_REQUIRE_AUTH=1. Custom routes always require sign-in; enabling VIBEFORGE_REQUIRE_AUTH also enables the production custom-host allowlist.

## Conventions

- Keep source in `app/` and `lib/`; use `.mjs` for pure shared modules.
- Use existing design tokens and accessible components. Do not introduce an incompatible stack without an approved architecture decision.
- Validate externally sourced objects and persisted project changes. Keep project data separate from trusted instructions. Use the impact engine for destructive review resets.
- Add regression tests in `tests/*.test.mjs` using Node's test runner and synthetic credentials. Mock network dependencies; never call a paid provider in CI.
- Keep the npm lockfile in sync. Run lint and Prettier checks. Do not weaken existing checks to obtain a green build.

## Checks

```bash
npm ci
npm test
npm run build
npm run lint
npm run format:check
npm audit --omit=dev --audit-level=high
```

Use `npx --no-install prettier --write <changed-files>` to format deliberately. CI uses pinned GitHub Actions, read-only contents permission and Node.js 22. Dependabot checks npm and Actions weekly.

## Release work

Work from the approved audit branch, create scoped commits and verify the exact head in GitHub Actions. Do not merge or deploy automatically. The temporary formatting extraction steps used in earlier audit commits have been removed from permanent CI. Preserve the audit branch deployment exclusion in `vercel.json` until the operator approves a different release workflow.

See [API reference](API_REFERENCE.md), [architecture](ARCHITECTURE.md), [deployment runbook](DEPLOYMENT_RUNBOOK.md) and [release gate](RELEASE-CANDIDATE.md).
