# RC2 Phase 10 — browser smoke tests

Playwright Chromium runs against a production-mode Next.js build on the GitHub Actions runner's loopback address, not against Vercel. Browser smoke tests use synthetic project data and block external browser requests. No real provider keys, cloud account, email, paid API or deployment is used.

Coverage: project wizard, blueprint approval and reload persistence, actual Markdown/JSON/ZIP downloads including unzip validation, manual mission handoff and review, dependency unlocking, Knowledge preservation, document draft cancellation, deep links and history, corrupted localStorage backup/recovery, mobile dialog and Escape focus, horizontal layout, served CSP/security headers and hosted API rejection.

Results must be checked on the exact CI commit. Browser tests do not establish full accessibility conformance or live Supabase/AI/provider compatibility. Public release remains blocked until operator-approved live integrations, legal and deployment gates are met.
