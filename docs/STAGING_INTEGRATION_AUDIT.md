# RC2 staging integration audit

The deployed staging baseline is b852cac, Vercel deployment dpl_CKk9tuC6P27g8BjAhMxqyJMVE945. Production remains unchanged. The existing Supabase project was checked read-only: owner-only RLS, anonymous SELECT and INSERT denied, composite primary key, JSON object and 1,500,000-byte constraint, no security advisor warnings. A synthetic authenticated identity in a read-only transaction saw zero snapshots. This does not verify a live login or two-account CRUD.

[CI run 45527220654](https://github.com/ferlin070/vibeforge/actions/runs/45527220654) passed 119 unit/integration tests, build, lint, format, production dependency audit (zero vulnerabilities reported), and nine Chromium tests (13.2 seconds). Additional tests mock cloud sign-in, backup, invalid snapshot exclusion, restore, delete, logout, AI malformed JSON, candidate review and application. All external browser traffic is intercepted or blocked. No real account or API charge.

Visual review used Chromium screenshots of the local production-mode build, not screenshots of the protected staging URL. Fifteen combinations of Overview, AI Blueprint, Cloud, Mission and Quality at 390, 768 and 1440 pixels had no document horizontal overflow. Screenshots showed unused horizontal space in the desktop quick-start grid and tall mobile provider cards. CSS refinements address those issues; the next CI run must verify the changed code. The new layout test asserts zero page overflow. A full accessibility audit and hosted browser interaction remain pending.

## Local test setup

Use only the synthetic configuration for browser integration testing. Never run these mocks against a real project.

```bash
export NEXT_PUBLIC_SUPABASE_URL=https://vibeforgefixture.supabase.co
export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_synthetic_fixture_only
npm ci
npm run build
npx --no-install playwright install chromium
npm run test:e2e
```

The CI workflow scopes these values to build and E2E steps. Optional VF_VISUAL_CAPTURE=1 emits screenshots of synthetic fixtures for local audit, not customer data. Temporary source-format extraction was removed. No live credentials were obtained. Redis and custom gateway allowlist are not configured on staging; actual provider calls, Auth email delivery, recovery, live snapshot access, comprehensive accessibility, and legal approval remain open release gates.
