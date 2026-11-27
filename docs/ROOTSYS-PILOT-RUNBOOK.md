# Rootsys private pilot activation

This runbook is for the protected VibeForge Preview branch `beta/rc12-hardening` on the second Vercel account, team `kaihara070s-projects`. No production or customer access is approved. No new paid resources or database migrations are needed for this private pilot. Existing service quotas still apply.

## Evidence and prerequisites

- CI #474 passed 203 unit tests and 27 browser tests at commit 30fd58a9858b519da46612251ad0773b5bbcc6a0.
- CI #500 passed 209 unit tests, build, lint and dependency audit at commit 8612bd0f6d4da0e3137a00843412af1c43ffd6a3; format failed and browser tests were skipped.
- The exact #500 commit was deployed to protected Preview and GET /api/health returned HTTP 200. This only establishes liveness.
- On 2026-11-27 Vercel environment metadata listed Supabase URL and publishable key and encrypted KV REST URL/token in Preview. No Rootsys variables were listed. The Redis smoke opt-in and email redirect variables were scoped to the older audit branch; do not assume they apply to this branch.
- Require successful CI for the exact new candidate and explicit owner authorization before real provider calls. Verify Rootsys account terms, permitted data processing, model availability, billing and key scope independently. No live key or compatibility evidence exists yet.

## Stage A: configure while disabled

In Vercel project Settings > Environment Variables, target Preview **only**, Git branch `beta/rc12-hardening`. Do not use Development, Production or a public variable prefix.

| Variable | Initial value |
| --- | --- |
| ROOTSYS_API_KEY | Owner enters directly in Vercel as a sensitive server secret |
| ROOTSYS_OWNER_ID | Exact UUID of the owner's existing Supabase Auth user |
| ROOTSYS_ENABLED | false |
| ROOTSYS_DAILY_OUTPUT_BUDGET | 0 |

Do not paste keys, passwords, tokens or recovery links into chat or source control. Confirm the account UUID in the dedicated Supabase Auth dashboard; never substitute an email or guess. Keep deployment protection enabled. Redeploy the reviewed commit to the intended branch with the new environment and record its ID.

Sign in to the exact protected Preview with the owner account. Open an existing synthetic project in Blueprint Studio, select Rootsys and choose Check admin readiness. Expect owner and Redis verified, key format valid, activation disabled and zero daily attempts. Key format is not API authentication. Confirm another test account cannot access admin status. Do not alter user data or auth settings merely to make this check pass.

## Stage B: inspect only

With explicit approval, change ROOTSYS_ENABLED to true while keeping ROOTSYS_DAILY_OUTPUT_BUDGET at 0. Redeploy the exact reviewed branch and verify readiness again. Check Rootsys status once. The endpoint requests only the fixed model catalogue and quota; no generation is allowed. Record only sanitized metadata, model presence, expiry and available quota. Unknown quota fields remain unknown. Confirm actual schema, quota units and provider terms before any inference. If inspection fails, stop; do not retry automatically.

## Stage C: single synthetic generation

Only after owner approval of a real call, set ROOTSYS_DAILY_OUTPUT_BUDGET to 8000 and redeploy. The shared UTC-day generation bucket allows one requested output reservation per day, including failed attempts. Input tokens, provider behavior and fees are not covered by this reservation. Do not treat it as a hard billing cap. Use a non-confidential synthetic project, one explicit blueprint generation or one advisory task plan, not both in the same quota window. Record provider result, output validity, elapsed time and quota change if available. Never auto-apply output or run agent commands. No customer data.

## Stop and recovery

Set ROOTSYS_ENABLED=false and ROOTSYS_DAILY_OUTPUT_BUDGET=0 for future deployments. Existing immutable deployments may retain earlier environment values. Identify all enabled Preview deployments; remove access or retire them with owner approval and revoke the pilot key at its issuer if necessary. Already-started calls may finish. Do not rely on redeploy alone to disable older deployment URLs. Review logs without recording secrets. Preserve the existing production deployment and database.

Public launch requires separately approved commercial terms, privacy and retention policy, hard budget and multi-user isolation design, real browser Auth and RLS tests, model quality evaluation, support and rollback plan. The pilot is not a commercial release.
