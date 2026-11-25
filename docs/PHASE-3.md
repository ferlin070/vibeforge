# RC2 Phase 3 — browser security headers

## Implemented

All Next.js paths receive an enforced Content-Security-Policy, Strict-Transport-Security (two years, includeSubDomains), and Cross-Origin-Opener-Policy (same-origin). Existing nosniff, frame denial, referrer and permissions headers remain unchanged. The CSP permits same-origin assets, data images, and exactly the configured HTTPS Supabase project origin (matching the existing cloud client URL format). Absent or malformed Supabase configuration adds no external origin. AI and GitHub calls remain server-side; no provider or arbitrary gateway browser origins are permitted.

## CSP trade-off

Next.js App Router emits inline hydration scripts in the prerendered application shell. A request-specific nonce requires dynamic rendering rather than preserving the current static shell; see https://nextjs.org/docs/app/guides/content-security-policy. For this phase we retain static rendering and deliberately permit script-src 'unsafe-inline'. Inline event-handler attributes are explicitly forbidden with script-src-attr 'none'. Styles permit inline CSS for existing UI compatibility. The script policy is not a strong inline-script XSS defense: arbitrary injected script blocks could still execute. Migrate to a nonce-based policy with dynamic rendering, or a verified hash strategy, before claiming strict XSS protection. The local development-only unsafe-eval exception is disabled whenever VERCEL_ENV is set; hosted policy does not permit eval or wildcard origins.

HSTS is honored only on HTTPS and applies to subdomains of the serving hostname. Confirm HTTPS coverage before using a production custom domain. COOP isolates cross-origin windows; current app uses same-origin navigation and Supabase REST, not a popup OAuth flow. Revisit COOP when adding popup-based authentication.

## Verification

Unit tests assert generated header values and rejected origin injection, without real credentials or network calls. Browser CSP/hydration, local downloads, cloud REST and actual served headers still need runtime smoke testing in Phase 10; a successful build alone does not prove browser compatibility. No deployment or database changes.
