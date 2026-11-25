# VibeForge — RC2 audit candidate

## Current implementation

Local-first Next.js workspace with a three-step wizard, editable project documents, workflow reviews, nine-document blueprints, seven AI provider choices, deterministic quality scoring, candidate review, stable task IDs, dependency-aware task evidence, read-only GitHub inventory and CI import, project memory and checkpoints, agent prompt and ZIP exports, Mission Control, bug tracking and advisory release checks.

Optional Supabase email/password authentication and explicit owner-isolated snapshots are implemented. Access and refresh tokens stay in memory. Local and cloud project data are validated; invalid local data pauses automatic writes and can be exported for recovery. Hosted AI/GitHub API requests require verified sessions. Custom gateway requests use HTTPS/DNS restrictions and production hostname allowlisting.

## Verified audit baseline

Phases 1–8 completed at commit `62d4e5013fe5eed06782c49c28b3ea2b98e3beca`. [GitHub Actions run 45523782522](https://github.com/ferlin070/vibeforge/actions/runs/45523782522) completed successfully with 118 tests, build, lint, format check and production dependency audit. Phase 9 is the documentation update; see [release gate](RELEASE-CANDIDATE.md) for remaining work. The package version remains 1.0.0-rc.1 pending final release review.

## Known limitations and blockers

- Real browser E2E, viewport, accessibility and CSP compatibility still need verification.
- Live sign-up, email confirmation, password recovery, session refresh and two-user snapshot isolation through the browser need verification. Previously tested SQL RLS is not a substitute for browser tests.
- All seven provider configurations have mocked coverage; actual model and gateway compatibility, quotas and costs require operator-approved live tests.
- Distributed Redis rate limiting is optional and not confirmed connected in the deployed environment; memory fallback is not a global limit.
- CSP permits inline scripts for static Next.js hydration. Recognized-secret redaction is best effort; emergency original backups intentionally preserve raw data after confirmation.
- Cloud snapshots are explicit backups, not real-time sync. Older invalid records may need manual repair; drafts in some modules may be lost on navigation.
- Context checkpoints are limited snapshots, not a general version-control/restore system. Release evidence is manually entered or imported metadata, not a certification.
- No autonomous agent runtime, team collaboration, billing, durable job queue, live research or automatic user-project deployment.

Phase 10 and owner authorization are required before any public release. No deployment or database mutation is authorized by this document.
