# RC4 launch infrastructure — unreleased

## Baseline

RC3 commit f051d5ff87796a1090684d57fe33da0a15305bb1 passed [CI 45558151893](https://github.com/ferlin070/vibeforge/actions/runs/45558151893), 122 unit/integration tests and nine Chromium tests. Protected staging deployment dpl_3yoWAnUcAy7ssFvYVgiZjLqrwUBL is the known-good rollback reference.

## Infrastructure changes

- GET /api/health returns only an uncached liveness status. It performs no external calls and exposes no configuration or credentials. HTTP 200 does not establish dependency readiness.
- Email signup, recovery and resend require an exact configured root callback URL. Empty configuration fails closed for email operations. Sign-in and local mode are unaffected. Supabase Auth must independently authorize those same redirects and deliver mail.
- Guide presents a local-first onboarding path and a separate optional cloud path, with BYOK cost and private release notices.

## External configuration still required

The second Vercel account has no installed Upstash integration. Marketplace returned a Free resource plan with 500,000 monthly commands, one database per account and no required payment method. No resource was provisioned; confirm current limits, region and commercial terms in the Marketplace before connecting. Configure the server-only UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Preview initially, verify atomic rate limits and fail-closed behavior, then approve production separately. Never paste tokens into source, chat or CI logs.

Supabase Auth URL Configuration, SMTP, signup abuse controls and live test users remain unverified. Set the exact stable staging root in both the application environment and Supabase; validate email templates and test account confirmation/recovery before enabling email operations. Do not change the production Site URL without release approval. See [official redirect documentation](https://supabase.com/docs/guides/auth/redirect-urls).

## Monitoring and launch runbook

Use protected staging liveness requests and Vercel runtime logs. A failed liveness request is an availability signal; a successful response does not certify external dependencies. Actual scheduled monitoring, alert destinations and escalation remain unconfigured. Before production, record the approved monitoring identity, alert owner, rate-limit quota, known-good deployment and live Auth/provider test evidence. Keep production blocked until the [release gates](RELEASE-CANDIDATE.md) are approved.

No database mutation, provider charge, account creation, paid service or production deployment is authorized by this increment. Read exact CI evidence before deploying the new candidate.
