# Deployment and rollback runbook

## Current restriction

This audit does not authorize deployment. Work stays on `audit/rc2-phase1`, excluded from Vercel Git auto-deploy by `vercel.json`. Do not modify other projects, merge to preview/main or promote a deployment without explicit owner approval.

## Preflight

1. Identify the approved VibeForge repository, commit, Vercel project/team and dedicated Supabase project. Confirm account and environment scope.
2. Check the [release gates](RELEASE-CANDIDATE.md). Run npm ci, tests, build, lint, formatting and dependency audit on the exact commit. Complete browser smoke tests and authorized live integrations.
3. Record the currently running known-good deployment ID and commit, environment configuration names (not values), database compatibility and rollback owner.
4. Configure public Supabase URL and publishable key for the intended environment, approved Auth Site URL and redirect URLs, email delivery and abuse settings. Confirm RLS isolation. Never run the initial schema SQL against an existing database blindly.
5. Configure server-only Redis credentials and approved custom hostnames if enabled. Keep unapproved hosts disabled. Review CSP, HTTPS and metadata/noindex. Formal privacy and terms require approval.

## Authorized staging and production

Only after separate approval, create a protected preview/staging deployment for the exact reviewed commit with Node.js 22. Verify the effective HTTP headers, hydration, local storage, download, navigation, auth/recovery and external API behavior. Save screenshots and actual evidence without exposing credentials. Obtain release owner approval before any production promotion or domain change. Verify the final production alias and commit only after approval.

## Rollback

If critical failures occur, stop further promotion. Record symptoms and affected commit. With owner approval, restore the recorded known-good Vercel deployment or redeploy its reviewed commit. Check environment compatibility and schema changes first; rolling back application code does not roll back Supabase data or auth configuration. Do not run destructive SQL rollback commands automatically.

Verify HTTP health, auth, data access, manual planning and critical workflows after rollback. Communicate the incident, protect affected data, and reopen release checks. Document recovery evidence and follow-up regression tests.

## Operator record

Record environment, commit, CI URL, deployment ID, known-good deployment, rollback steps, incident owner, live integration evidence and approval decision. Never include secret values in the record.
