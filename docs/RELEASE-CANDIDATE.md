# VibeForge v1.0 RC1 release checklist

## Implemented
- Seven AI providers/protocols including two custom gateways; verified Supabase account required for custom requests; production external API requests authenticated and custom production hosts allowlisted.
- Bounded request and response bodies, cross-origin rejection, exact production host matching, best-effort per-instance request caps, TLS/DNS restrictions. No automatic billing retries.
- Browser security headers, favicon, accurate English page language, metadata and noindex during staging.
- Guided onboarding and truthful product data-handling notes; local JSON backup and explicit clear-local-data action.

## Required before public production
- Verify auth registration, confirmation redirect, login, expiry/logout and cloud save/restore with two test users; configure Auth Site URL, approved redirect URLs, SMTP and anti-abuse settings. Do not create test accounts without consent.
- Live validation of each provider and selected custom gateway using test credentials supplied by the operator. Set production VIBEFORGE_CUSTOM_HOSTS to approved domains; review egress restrictions, abuse controls and durable rate limiting. No custom host enabled in production by default.
- Run browser UAT across desktop/mobile, accessibility and performance; review dependency audit and commit lockfile; review release runbook and rollback.
- Approve formal Terms and Privacy Policy (legal/operator contact, retention, data requests, fees, jurisdiction); in-product privacy notes are not finalized legal documents.
- Obtain owner approval for production deployment and domain; update auth redirects, production robots metadata and environment. Do not promote staging automatically.

## Known constraints
No autonomous code execution, background jobs, automatic cloud sync, permanent login session or independent verification of manually entered reports. No live provider credentials used for RC testing. Preview is protected. No other projects or schema changes.
