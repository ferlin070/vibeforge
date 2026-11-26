# API reference

These are same-origin JSON POST endpoints, not a supported public third-party API. Responses use Cache-Control: no-store. Hosted routes require the user's verified Supabase access token in `x-vibeforge-session`; local development exceptions are described in the developer guide. Cross-site and same-site cross-origin browser requests are rejected. Origin-less requests must include a session header.

## POST /api/blueprint

Header: `x-provider-key` contains the caller's own provider credential. Use a trusted provider, and never put the key in the body or URL.

Example body (synthetic project, no credential):

```json
{
  "provider": "openai",
  "model": "gpt-4.1-mini",
  "project": {
    "name": "Booking demo",
    "idea": "Create a booking website",
    "type": "Web application",
    "audience": "Small businesses",
    "agent": "Codex"
  }
}
```

Provider IDs: openai, anthropic, gemini, deepseek, openrouter, custom-openai, custom-anthropic. Model names are examples, not verified availability. Optional project.repositoryContext is limited to 8,000 characters. For custom-openai, provide custom.baseURL, custom.format (chat or responses) and optional boolean custom.jsonMode. For custom-anthropic, provide custom.baseURL and optional custom.auth (key or bearer). The base must be a trusted public HTTPS DNS hostname; no localhost/private IP, redirects or arbitrary port. In hosted deployments the exact hostname must be allowlisted. See the implementation for protocol-specific constraints.

Success returns `{ blueprint, provider, model }`. Gemini also returns `usage`, either null or an object containing available non-negative integer counts from its response metadata (`promptTokenCount`, `candidatesTokenCount`, `thoughtsTokenCount`, `totalTokenCount`). Counts are not estimated or persisted in project data. The candidate UI optionally calculates a flat-rate USD scenario from user-entered prices and reconciled counts. This estimate is not a bill, a preflight budget, or a hard spending limit; rates and estimates are not persisted. The Studio keeps up to 20 completed generation attempts in view-local memory, scoped to the initiating account. History contains provider, recognized example model (other IDs are labeled Other model), outcome, timestamp, elapsed time and sanitized Gemini counts only. It is not a durable audit log, does not retain estimates, and does not store keys, prompts, responses or raw errors. The blueprint contains documents, assumptions, questions and tasks. Each task has id, title, description, dependencies and acceptance. Generated output is validated and known secret patterns rejected. The client displays a candidate before explicit application.

Request limit: 24,000 bytes; upstream JSON envelope limit: 1,000,000 bytes; extracted text limit: 400,000 characters. Hosted normal provider fetch timeout: 50 seconds; route max duration: 60 seconds. Custom DNS/HTTPS requests have additional limits. No automatic retry.

## POST /api/repository

Optional header: `x-github-token` (read-only fine-grained token). Body: `{"repo":"owner/repository"}`. Returns `{ inventory }` including the default branch, commit SHA, bounded tree paths, signals and package dependency hints. No repository writes or code execution. The scan uses a 24-second shared timeout and a 30-second route limit.

## POST /api/ci

Optional header: `x-github-token` with Actions read permission where needed. Body: repo and exact 40-character commit sha. Returns `{ ci }` with at most 20 matching workflow runs from the fetched page. The request has a 24-second timeout and a 30-second route limit. Neither GitHub endpoint enumerates all history.

GitHub routes accept up to 4,000 request bytes. Repository responses are bounded per upstream fetch; CI response envelope limit is 1,000,000 bytes. Use least-privilege tokens, not write permissions.

## Error handling

Errors contain `error` and, for categorized AI failures, sometimes `code`. 400 invalid request/configuration; 401 missing/invalid session; 403 origin or custom host rejected; 413 oversized input; 422 invalid generated output; 429 local/provider/GitHub quota; 502 upstream failure or incomplete output; 503 unavailable session/rate-limit infrastructure; 504 provider timeout. Some upstream auth/model errors are intentionally mapped to 502 with safe error codes. Raw upstream response bodies are not returned. Review the cause before manually retrying.

## Rate limits

Verified-account limits: AI 6/minute, token-backed repository and CI 12/minute each, no-token GitHub 2/minute shared across both routes. GitHub enforces its own upstream quota. Redis uses shared fixed windows; production requires both variables, while preview may use per-instance memory. Partial Redis configuration or failure returns an error rather than bypassing the limiter. These controls are not a complete public abuse-prevention system.

### RC5 branch selection

`POST /api/repository` accepts optional `branch` (portable branch name, maximum 255 characters). Omit or pass an empty string for the default branch. The server resolves the exact `refs/heads/` reference, verifies the commit SHA and pins the manifest and tree to that commit. A missing branch returns 404. No tags, commits by user input, source execution or writes.

## Rootsys managed pilot

Rootsys uses the fixed `https://rootsys.cloud/v1/chat/completions` endpoint and `deepseek-v4-flash` model. The browser sends no provider key. Server-only `ROOTSYS_API_KEY`, `ROOTSYS_OWNER_ID` and `ROOTSYS_ENABLED=true` are required, in Vercel Preview only. The owner ID is checked against the verified Supabase user, not a client claim. Redis is mandatory and limits the pilot to five attempts per UTC day; this is a request cap, not a token or billing cap. No fallback or retry. The pilot remains disabled by default. Do not configure production or use Mod variants that replace the system prompt. Model availability, response compatibility and commercial permission remain unverified. Review provider privacy and usage terms before real customer data is sent.

### Rootsys owner inspection

`POST /api/rootsys/status` checks the same verified owner, Preview-only activation and distributed Redis as generation, but uses a separate six-per-minute request bucket. It sends no project data and calls only the fixed GET `/v1/models` and `/v1/quota` endpoints. No inference is requested. The response contains sanitized model IDs, pilot model availability and recognized token/expiry fields only. Unknown quota fields stay null; actual field names and compatibility need live verification. Inspection never enables a model for generation. Mod models are not eligible. No automatic polling, retry or storage.

### Rootsys admin readiness

`POST /api/rootsys/admin` is an owner-only, Preview-only configuration check that remains available when inference is disabled. It requires the verified Supabase owner and functioning distributed Redis (six checks per minute in a separate bucket). It returns only activation and key-format booleans, fixed pilot model and request limits. A valid key format is not proof of provider authentication. This route makes no Rootsys requests, returns no credentials and cannot change settings. Missing Redis or owner configuration prevents access; configure those in Vercel first. Generation and quota inspection remain disabled unless separately enabled by the server environment.
