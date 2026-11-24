# VibeForge v0.3.0 — MVP candidate
A Ghazwah Group product. From idea to production.
## Run
Node 20.9+; npm install; npm test; npm run dev. Open http://localhost:3000. Run npm run build before release. Lockfile not yet generated; commit a reviewed lockfile after installing.
## Workflow
Create a project → AI Blueprint Studio → use your own OpenAI API key or manual draft → review nine documents and assumptions → approve → dependency-aware tasks → copy context prompts → record agent reports and review → export Markdown development kit and JSON.
AI generation uses OpenAI Responses API through server route; key is not persisted; usage is charged to the key owner. Only enter your own key in the app when using a trusted deployment. No shared server key. Local mode needs no cloud account.
## Cloud
Optional Supabase email/password and explicit snapshots. See docs/CLOUD_SETUP.md. No live project configured.
## Limits
Manual review is not automated verification. Live provider, authentication, RLS, browser and production build checks are still required. No production deployment yet.
