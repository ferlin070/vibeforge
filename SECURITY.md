# Security policy

## Supported status

VibeForge is a release candidate under audit, not an approved public production service. See [release gates](docs/RELEASE-CANDIDATE.md). Do not assume a successful CI run eliminates security risk.

## Reporting

A verified private security reporting channel and responsible operator contact must be established before public launch. Until then, report suspected vulnerabilities privately to the project maintainer using an already established contact. Do not post credentials, private project data or exploitable details in public GitHub issues. Include affected version/commit, minimal synthetic reproduction, impact and any proposed mitigation. No response-time SLA or bug bounty is promised.

## Controls and limitations

- Verified Supabase sessions for hosted APIs, owner-only snapshot RLS and bounded request/response bodies.
- Same-origin checks, restricted custom gateway DNS/HTTPS egress, exact production allowlist and no redirects.
- Best-effort secret redaction on selected writes and exports; do not rely on it to detect all credential formats. Emergency original backup is intentionally unredacted after confirmation.
- CSP with inline hydration exception, HSTS over HTTPS, COOP, frame denial, nosniff and referrer/permissions restrictions. Inline script execution is not fully prohibited.
- Optional distributed rate limiting; fallback is instance-local. Configure production abuse controls and verify real Redis before launch.
- No persisted provider keys or GitHub tokens by the application; access/refresh tokens stay in browser memory. Never use a Supabase service-role key client-side.
- Lockfile, read-only CI permissions, pinned actions, weekly Dependabot and production dependency audit.

If a secret is exposed, revoke or rotate it at the issuer, check relevant logs and notify the operator. Redacting an export does not revoke the credential or remove older copies. Treat repository contents and pasted reports as untrusted. Run tests with synthetic data. Obtain written authorization before testing live systems, modifying schemas or using paid APIs.
