# RC3 production readiness — unreleased increment

## Verified staging baseline

Commit ddfed137fc1fc9560f16c8e2a5db28d7c32f3b23 passed [CI 45527523966](https://github.com/ferlin070/vibeforge/actions/runs/45527523966): 119 unit/integration tests, nine Chromium tests, 15 viewport/module checks, build, lint, formatting and zero reported production dependency vulnerabilities.

Staging deployment dpl_7zrNLnSuUvShEURpNngsEtJNxcyp was READY with HTTP 200 for the landing page, five workspace deep links and all ten fetched JS/CSS assets. Security headers were present, the actual Supabase origin was bundled, and synthetic CI configuration was not found in the fetched assets. No error/fatal runtime logs were returned for the queried interval. This is HTTP and asset verification, not a live browser session.

## RC3 changes

- Pin Node.js to 22.x in package and lockfile root metadata, consistent with CI and .nvmrc. No resolved package changes.
- Require both Redis REST variables for authenticated production API access; missing, partial or failing configuration fails closed. Preview retains bounded per-instance fallback.
- Require an exact custom gateway hostname allowlist in hosted Vercel deployments, including preview. Custom gateway access stays disabled until the operator approves hosts. The existing session and public HTTPS/DNS restrictions remain.
- Add regression coverage for these release safeguards.

## Operator gates

Live Redis credentials and quota have not been provisioned. Auth Site URL, redirect allowlist, SMTP and live account lifecycle still need an authorized test account and configuration verification. Provider credentials and a test budget are not available. No real provider calls, signup emails, account creation, schema changes, or production deploy are authorized by this increment.

Keep the package at 1.0.0-rc.1 until final operator release approval. RC3 denotes a readiness workstream, not a published release. The existing protected staging deployment is the known-good rollback reference. Review the exact new commit's CI before deploying it to staging.
