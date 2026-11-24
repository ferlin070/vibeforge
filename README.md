# VibeForge v1.0.0-rc.1 — From idea to production
A Ghazwah Group product. Release candidate; staging only.

## Run
Node 22 recommended. npm install; npm test; npm run dev; npm run build. A reviewed lockfile remains a release prerequisite.

## Workflow
Create a project → Blueprint Studio (7 provider choices or manual draft) → GitHub inventory → Context Manager → Mission Control → Quality Studio → review release evidence. Export agent instructions and context ZIP. No autonomous code execution or deployment.

## Cloud and security
Local projects remain on the browser after logout. Optional manual cloud snapshots using Supabase email/password and owner-only RLS. See docs/CLOUD_SETUP.md. Custom AI gateway requests require a verified cloud session; production API operations require verified cloud session. Production custom gateway hostnames must be explicitly allowlisted via VIBEFORGE_CUSTOM_HOSTS (comma-separated exact hostnames). Localhost/private IP prohibited. Per-instance rate limits are best effort, not distributed protection. Keys are not persisted by application. Provider requests may incur charges.

## Release
See docs/RELEASE-CANDIDATE.md. Live provider/authentication, browser UAT, production abuse controls, legal review, lockfile and authorization are required before public release. No production rollout implied.
