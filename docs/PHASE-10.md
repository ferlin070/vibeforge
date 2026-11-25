# RC2 Phase 10 — browser smoke tests

Playwright Chromium runs against a production-mode Next.js build on the GitHub Actions runner's loopback address, not against Vercel. Browser smoke tests use synthetic project data and block external browser requests. No real provider keys, cloud account, email, paid API or deployment is used.

Coverage: project wizard, blueprint approval and reload persistence, actual Markdown/JSON/ZIP downloads including unzip validation, manual mission handoff and review, dependency unlocking, Knowledge preservation, document draft cancellation, deep links and history, corrupted localStorage backup/recovery, mobile dialog and Escape focus, horizontal layout, served CSP/security headers and hosted API rejection.

Results must be checked on the exact CI commit. Browser tests do not establish full accessibility conformance or live Supabase/AI/provider compatibility. Public release remains blocked until operator-approved live integrations, legal and deployment gates are met.

## Verified result

Commit `7c01ab03ef4244da847d54866c4c1f734d373181`, [GitHub Actions run 45526037111](https://github.com/ferlin070/vibeforge/actions/runs/45526037111): 119 unit/integration tests and six Chromium smoke tests passed; production build, ESLint, Prettier and production dependency audit also passed (zero vulnerabilities reported).

Ubuntu 26.04 was incompatible with the pinned Playwright version; CI now uses Ubuntu 24.04. The first browser execution passed four of six cases. The accessible Knowledge category label and loopback-only request-origin normalization were corrected; a regression test ensures a different host, port, protocol or external origin remains rejected. The subsequent execution passed all six cases in 7.1 seconds. The lockfile was generated with npm and verified against its original SHA-256 before the temporary bootstrap check was removed.

## Remaining release gates

Live cloud/account and provider tests, production configuration, comprehensive accessibility/performance review, legal approval, and authorized staging/production deployment remain outstanding. See [release gates](RELEASE-CANDIDATE.md). No deployment or database changes were made.
