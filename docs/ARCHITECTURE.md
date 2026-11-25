# Architecture

## Implemented stack

Next.js 16 App Router, React 19, JavaScript modules, CSS, Node.js 22 CI, browser localStorage, Supabase Auth and PostgREST, optional Upstash Redis REST. Dependencies are pinned by the npm lockfile. The root application is statically prerendered, with client-managed workspace views and allowlisted query-string routing. Three Node.js route handlers perform external API work.

## Data flow

```text
Browser workspace
  |-- localStorage: vibeforge-v2 (validated project records)
  |-- export: Markdown / JSON / ZIP
  |-- Supabase Auth + PostgREST (manual snapshots)
  |
  +-- same-origin POST /api/blueprint --> selected AI provider
  +-- same-origin POST /api/repository --> GitHub read-only inventory
  +-- same-origin POST /api/ci --> GitHub workflow metadata
            |
            +-- session verification via Supabase Auth
            +-- optional Redis REST rate limit / memory fallback
```

The browser holds credentials in memory. External AI and GitHub calls go through server routes; cloud auth and snapshot requests go directly to the configured Supabase origin. No service-role credential belongs in the browser or repository.

## Module responsibilities

- `app/page.jsx`: workspace shell, routing, project CRUD, local hydration/recovery, central project update confirmation and session refresh.
- `app/studio.jsx`: provider forms, candidate review, nine documents, blueprint approval and task evidence.
- `app/repository.jsx`, `lib/repository.mjs`: default-branch commit-bound inventory and stack signals, not arbitrary repository execution.
- `app/context.jsx`, `lib/context.mjs`: project memory, checkpoints, context export and external agent adapters.
- `app/mission.jsx`, `lib/mission.mjs`: assignments, manual handoffs, report reviews and impact calculation.
- `app/quality.jsx`, `lib/quality.mjs`: bug tracking, acceptance-derived test plans, CI import and release readiness.
- `app/cloud.jsx`, `lib/cloud-auth.mjs`: account, recovery links, token refresh and manual snapshot operations.
- `lib/project-schema.mjs`, `lib/blueprint.mjs`, `lib/blueprint-quality.mjs`: validated persisted shape, dependency graph and advisory score.
- `lib/ai-adapters.mjs`, `lib/custom-endpoint.mjs`, `lib/request-guard.mjs`, `lib/rate-limit.mjs`: protocol adaptation, bounded I/O, authenticated API guard and gateway restrictions.
- `lib/redact.mjs`, `lib/zip.mjs`, `lib/navigation.mjs`: best-effort secret filtering, portable export and route logic.

## Data model and trust boundaries

Local projects include identity, idea, audience, agent preference, workflow review flags, editable documents, blueprint/approval, task evidence, memory, checkpoints, repository inventory, mission assignments/history and quality evidence. Project validation rejects unsafe property names, invalid nested shapes and payloads over 1,200,000 UTF-8 bytes. A blueprint has nine nonempty approved documents, 1–40 tasks, unique TASK-### IDs, existing dependency IDs and no cycles. Incomplete document drafts may remain local until approval.

Supabase stores one JSON snapshot per owner and project ID in `public.vibeforge_projects`. The composite primary key is `(owner_id, id)`. Owner-only RLS governs authenticated CRUD; anonymous access is revoked. SQL limits the JSON object to 1,500,000 bytes in its database text representation. Client-side validation is additional protection, not a replacement for RLS.

Approvals and evidence are local user assertions. The quality score is a heuristic, and the CI import is a bounded metadata snapshot of the selected commit, not an exhaustive live attestation. Scope changes may reset reviews after confirmation. Agent preference and Knowledge notes preserve existing work. No server-side project approval authority, real-time sync, automatic merge or execution exists.

See [security policy](../SECURITY.md) and [API reference](API_REFERENCE.md) for operational constraints.
