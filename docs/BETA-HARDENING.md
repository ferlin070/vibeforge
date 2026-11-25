# VibeForge beta hardening

Billing and payments are deferred.

## Collaboration

Received drafts are rechecked by exact share ID and recipient identity immediately before import, rather than by the capped 50-row list. The existing RLS and sender-only revocation are retained. Unit and browser fixtures cover the exact lookup. A revoked share cannot recall an already imported copy. Actual two-account browser testing and server-side abuse controls remain required.

## Architecture drafts

The editor supports explicit save, restore, clear and JSON import using a browser-local storage key scoped to the project ID. JSON is bounded and rebuilt through the existing entity, relation and endpoint validators. It never applies a specification or executes SQL. Existing approved blueprints and cloud snapshot schemas are unchanged, including compatibility with earlier production builds.

Storage is local to this browser origin, not synchronized or account-isolated. It survives sign-out and may remain after project deletion until cleared. Export before changing devices or clearing storage; do not store sensitive data on shared devices. Saving over a previous draft and replacing the editor require confirmation. Unit tests exercise import validation and project isolation; browser regression covers save and restore after reload.

## Release

Use the beta branch and the exact CI result before deploying. Keep production protected and do not interpret HTTP liveness or mocked API tests as end-to-end live verification. No paid services or database migrations are included in this increment.
