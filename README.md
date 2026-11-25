# VibeForge

**From idea to production — build with direction, ship with confidence.**

A local-first AI development planning workspace by Ghazwah Group. VibeForge turns an idea into editable software specifications, dependency-aware tasks and portable instructions for external coding agents.

> Release status: RC2 audit candidate on the isolated audit branch. The application package remains version 1.0.0-rc.1 until the final release gate. This is not a public production release.

## What you can do

- Create projects using a guided discovery wizard.
- Generate nine specification documents and a task plan with your own AI provider key, or start from a manual draft.
- Review quality signals, questions and candidate output before applying or approving a blueprint.
- Inspect GitHub repository metadata, file inventory and commit-specific CI results without writing to the repository.
- Record project decisions, knowledge, constraints, blockers and checkpoints.
- Assign tasks to specialist roles and export prompts for external coding agents.
- Track bugs, evidence, release checks and rollback plans.
- Export Markdown, JSON and ZIP handoff kits, and optionally save cloud snapshots.

VibeForge does not execute agents, run repository code, independently certify reports, or deploy your applications. The user remains the product owner and release decision-maker.

## Quick start

Requirements: Node.js 22 (recommended), npm, and a modern browser. No account is required for manual local planning.

```bash
nvm use
npm ci
npm run dev
```

Open http://localhost:3000. Choose **Get started**, create a project and open AI Blueprint Studio. Use the manual template if no provider credential is available. See the [user guide](docs/USER_GUIDE.md).

## Development checks

```bash
npm test
npm run build
npm run lint
npm run format:check
npm audit --omit=dev --audit-level=high
npx --no-install playwright install chromium
npm run test:e2e
```

The committed npm lockfile is required. CI runs these checks and the Chromium browser suite using Node.js 22 on Ubuntu 24.04. Browser tests use a local production build, not a deployed service. Live-service verification remains necessary.

## Architecture and configuration

The application uses Next.js App Router, React, JavaScript, CSS, Node.js route handlers, browser localStorage and optional Supabase Auth/PostgREST snapshots. No TypeScript, Tailwind, agent execution service or durable job queue is implemented.

Copy `.env.example` to `.env.local` for optional cloud configuration. Use the public Supabase publishable key, never a service-role key. Do not commit credentials. Hosted API calls require verified sessions; custom production hosts require an explicit allowlist. Configure both Upstash Redis variables for distributed rate limiting; otherwise the fallback is per-instance only.

- [Architecture and data flows](docs/ARCHITECTURE.md)
- [Developer guide](docs/DEVELOPER_GUIDE.md)
- [API reference](docs/API_REFERENCE.md)
- [Cloud setup](docs/CLOUD_SETUP.md)
- [Security policy](SECURITY.md)
- [Deployment and rollback](docs/DEPLOYMENT_RUNBOOK.md)
- [Release gate](docs/RELEASE-CANDIDATE.md)
- [Browser smoke-test evidence](docs/PHASE-10.md)
- [Current project state](docs/PROJECT_STATE.md)
- [Changelog](CHANGELOG.md)
- [Privacy policy draft](docs/PRIVACY_DRAFT.md)
- [Terms of service draft](docs/TERMS_DRAFT.md)

## Project hygiene

Read [AGENTS.md](AGENTS.md) before making changes. The historical [product blueprint](docs/BLUEPRINT.md), legacy `index.html` and version notes are retained as reference, not the current application or a source of release status. Use `app/page.jsx` as the Next.js application entry point.

Do not merge or deploy this audit branch without explicit release authorization. The legal drafts are for operator review only and are not published terms. No open-source license is granted by this README.
