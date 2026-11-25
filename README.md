# VibeForge v1.0.0-rc.1 — From idea to production
A Ghazwah Group product. Release candidate; staging only.

## Run
Node 22 recommended. npm install; npm test; npm run dev; npm run build. A reviewed lockfile remains a release prerequisite.

## Workflow
Create a project → Blueprint Studio (7 provider choices or manual draft) → GitHub inventory → Context Manager → Mission Control → Quality Studio → review release evidence. Export agent instructions and context ZIP. No autonomous code execution or deployment.

## Cloud and security
Local projects remain on the browser after logout. Optional manual cloud snapshots using Supabase email/password and owner-only RLS. See docs/CLOUD_SETUP.md. All hosted API operations (preview and production) require a verified Supabase session, including repository/CI and AI generation. Only plain local development with NODE_ENV=development and no VERCEL_ENV can skip server auth for non-custom endpoints; custom gateways always require sign-in. Local manual planning needs no account. Production custom gateway hostnames must be explicitly allowlisted via VIBEFORGE_CUSTOM_HOSTS (comma-separated exact hostnames). Localhost/private IP prohibited. For distributed rate limiting configure both UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN (server-only). When neither is configured, a one-time warning indicates the bounded per-instance fallback; partial configuration/backend failure fails closed. GitHub without a read-only token shares a 2/minute per-account application limit across scan and CI plus GitHub’s own 60/hour/IP quota. No automatic retry. Keys are not persisted by application. Provider requests may incur charges.

## Release
See docs/RELEASE-CANDIDATE.md. Live provider/authentication, browser UAT, production abuse controls, legal review, lockfile and authorization are required before public release. No production rollout implied.
