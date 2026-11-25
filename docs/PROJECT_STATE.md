# VibeForge — RC2 audit candidate

## Current implementation

Local-first Next.js workspace with a three-step wizard, editable project documents, workflow reviews, nine-document blueprints, seven AI provider choices, deterministic quality scoring, candidate review, stable task IDs, dependency-aware task evidence, read-only GitHub inventory and CI import, project memory and checkpoints, agent prompt and ZIP exports, Mission Control, bug tracking and advisory release checks.

Optional Supabase email/password authentication and explicit owner-isolated snapshots are implemented. Access and refresh tokens stay in memory. Local and cloud project data are validated; invalid local data pauses automatic writes and can be exported for recovery. Hosted AI/GitHub API requests require verified sessions. Custom gateway requests use HTTPS/DNS restrictions and hosted hostname allowlisting.

## Verified audit baseline

All ten audit phases have been implemented and verified at the runtime baseline below. Commit `7c01ab03ef4244da847d54866c4c1f734d373181`, [GitHub Actions run 45526037111](https://github.com/ferlin070/vibeforge/actions/runs/45526037111): 119 unit/integration tests and six Chromium smoke tests passed; production build, ESLint, Prettier and production dependency audit also passed (zero vulnerabilities reported). The package remains 1.0.0-rc.1 pending operator-approved release.

## Known limitations and blockers

- Six Chromium smoke tests passed, including mobile navigation and CSP hydration on loopback. Comprehensive accessibility, performance, additional browsers and actual hosted behavior still need verification.
- Live sign-up, email confirmation, password recovery, session refresh and two-user snapshot isolation through the browser need verification. Previously tested SQL RLS is not a substitute for browser tests.
- All seven provider configurations have mocked coverage; actual model and gateway compatibility, quotas and costs require operator-approved live tests.
- Distributed Redis rate limiting is mandatory for production API access; preview can use memory fallback, which is not a global limit. Live Redis is not configured.
- CSP permits inline scripts for static Next.js hydration. Recognized-secret redaction is best effort; emergency original backups intentionally preserve raw data after confirmation.
- Cloud snapshots are explicit backups, not real-time sync. Older invalid records may need manual repair; drafts in some modules may be lost on navigation.
- Context checkpoints are limited snapshots, not a general version-control/restore system. Release evidence is manually entered or imported metadata, not a certification.
- No autonomous agent runtime, team collaboration, billing, durable job queue, live research or automatic user-project deployment.

The remaining live-service and operator release gates require completion before any public release. No deployment or database mutation is authorized by this document.

## RC5 product excellence increment

See [RC5 product excellence](RC5-PRODUCT-EXCELLENCE.md). Branch selection, captured-file filtering, text-only document reading, and more specific blueprint quality diagnostics are implemented without changing stored project schema.

RC5 increment 2 adds the active-project dashboard command center and task handoff/report files, with existing approval and dependency gates preserved. No automatic agent execution or database changes.

RC5 increment 3 introduces non-destructive recovery drafts and optimistic concurrency for manual cloud saves. Background cloud autosave and server-side history remain deferred pending isolation and conflict testing.
