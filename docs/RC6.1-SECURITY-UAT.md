# RC6.1 — Security and stability evidence

## Baseline and scope

Staging baseline e750e486aa8bbfa43e41c0ef94503c733142e452 passed CI run 45592165981 (154 unit/integration tests, 14 Chromium tests and 18 responsive layout checks). Keep production and the main branch unchanged. No database schema migration or paid provider call is included.

## Live database verification — 2026-11-25

A single transactional SQL audit against the existing Supabase VibeForge database created two randomly generated synthetic auth identities and uniquely named synthetic project rows. It switched to the authenticated database role with synthetic JWT subject claims, then asserted owner-only reads, updates and deletes; rejection of forged owner inserts and owner transfer; isolation of identical project IDs across owners; successful matching-version writes and deletes; and rejection of stale-version writes and deletes. A deliberately caught subtransaction exception rolled back all fixture changes, and the query verified no synthetic users or projects remained. Result: PASS. No customer rows were selected or modified.

This is a live PostgreSQL/RLS test, not two real browser login sessions or a live PostgREST transport test. Keep the latter gates open. Supabase Security Advisor previously reported leaked password protection disabled; the performance advisor had no notices. Do not change plans or Auth settings without operator review.

## Client hardening

- Cloud deletion now requires explicit confirmation of the displayed snapshot version and matches owner ID, project ID and timestamp. A returned representation of exactly one validated row is required before the UI reports success. A zero-row response indicates a conflict; no retry or unconditional delete.
- Restoring an existing snapshot persists validated local data before updating UI state or reporting success. Storage recovery mode blocks the operation; unrelated projects are retained.
- Unit tests cover cancellation, conflict, conditional parameters and storage failure; the browser mock now returns a representation for deletion. CI is required for the exact final commit.

## Remaining release gates

Real two-account browser sign-in and PostgREST CRUD/conflict tests; live session refresh; password protection configuration; accessibility and load testing; validated backup recovery rehearsal; paid model and external agent tests with budget approval; privacy/terms and operator approval. The package remains a staging release candidate, not a public production release.
