# VibeForge beta hardening

Billing and payments are deferred.

## Collaboration

Received drafts are rechecked by exact share ID and recipient identity immediately before import, rather than by the capped 50-row list. The existing RLS and sender-only revocation are retained. Unit and browser fixtures cover the exact lookup. A revoked share cannot recall an already imported copy. Actual two-account browser testing and server-side abuse controls remain required.

## Architecture drafts

The editor supports explicit save, restore, clear and JSON import using a browser-local storage key scoped to the project ID. JSON is bounded and rebuilt through the existing entity, relation and endpoint validators. It never applies a specification or executes SQL. Existing approved blueprints and cloud snapshot schemas are unchanged, including compatibility with earlier production builds.

Storage is local to this browser origin, not synchronized or account-isolated. It survives sign-out and may remain after project deletion until cleared. Export before changing devices or clearing storage; do not store sensitive data on shared devices. Saving over a previous draft and replacing the editor require confirmation. Unit tests exercise import validation and project isolation; browser regression covers save and restore after reload.

## Release

Use the beta branch and the exact CI result before deploying. Keep production protected and do not interpret HTTP liveness or mocked API tests as end-to-end live verification. No paid services are included. The group collaboration schema is additive; the personal snapshot schema is unchanged.

## Project Rescue and Model Control Center

Quality Studio includes a read-only rescue plan derived from the project’s recorded bugs, dependencies, reviews and release evidence. The exported prompt asks for reproduction, evidence, minimal changes, regression tests and rollback. It does not invoke AI or execute repairs. Blueprint Studio now displays the exact redacted project context and model ID format status and requires explicit cost consent on every generation request. Provider availability, prices and model responses still require actual account testing.

## Team workspaces

The additive migration beta_team_spaces creates separate team spaces, memberships and immutable brief publications. Owners may rename and manage all non-owner memberships; admins manage editors/viewers; editors publish and revoke their own briefs; viewers read and import independent local drafts. All members can leave; membership revocation blocks subsequent reads. The owner is implicit and cannot be replaced through the member table. The database enforces roles, not UI visibility. See docs/sql/beta_team_spaces.sql and docs/sql/beta_team_authorization_audit.sql.

The live SQL audit passed five synthetic identities, including outsider exclusion, failed escalation, viewer write denial, owner-only rename, revoked-member exclusion and rollback verification. A separate self-leave transaction verified returned identity, loss of access and rollback. All three tables have RLS enabled and no anonymous SELECT privilege. The Security Advisor still reports the pre-existing disabled leaked-password protection warning.

No real team accounts or customer records were modified. Membership grants immediately expose existing and future publications; account IDs must be independently verified. No automatic invitations, shared editing, ownership transfer, workspace deletion UI, or organization-wide project sync. Owner account deletion cascades owned spaces; collaborators' account deletion removes membership and clears authorship on retained publications. Direct API rate limits and quotas, privacy and retention review, and real two-account browser/PostgREST UAT are required before public access. Lists are capped; the exact own-membership and brief lookup avoid relying on those caps.
