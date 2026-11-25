# RC2 Phase 4 — supply chain and CI

Node 22+ is required; .nvmrc selects 22. The npm-generated lockfile was obtained from the GitHub Actions runner because local DNS resolution of registry.npmjs.org was unavailable. The bootstrap runner emitted 106 numbered chunks and SHA-256 0f31041c9a3047710f0cba7587dd827b3c02e4aa7aac85a3edc65f43cfc0649b; CI checks the reconstructed bytes before installing. The temporary bootstrap/extraction steps must be removed before final review.

ESLint uses the Next.js Core Web Vitals flat config. Three existing effects in app/page.jsx have narrowly scoped, documented rule exceptions: browser-only hydration, persistence-error notices, and resetting the draft editor only when selected project or saved document changes. The editor effect retains its intentional dependencies to avoid discarding unsaved work. No global hooks rule is disabled. The JSX apostrophe is escaped.

Prettier uses a dedicated formatting commit. The generated lockfile is deliberately excluded from Prettier to preserve npm's exact output. Dependabot checks npm and GitHub Actions weekly. CI must use npm ci, strict lint, format check, npm test, build and production dependency audit; action refs remain pinned and permissions read-only.

The previous setup-node SHA failed runner resolution; v6 SHA was obtained from the official actions/setup-node tag and verified by the runner. The temporary bootstrap audit returned zero production dependency vulnerabilities. This is time-dependent, not a guarantee against undisclosed vulnerabilities. No deployment, real credentials, accounts or database changes.
