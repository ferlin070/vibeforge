# RC2 Phase 7 — blueprint quality and AI reliability

Blueprint quality scoring is deterministic and advisory: document depth 45 points, requirement-ID traceability 25, observable acceptance signals 20 and structural/dependency validity 10. It is not semantic validation, a guarantee of correctness or a release gate. Open questions remain visible; users must review all content.

Provider errors use stable safe categories for authentication, billing, quota, model/endpoint, configuration, unavailable, blocked/refused, truncated, empty, malformed output and timeout. No automatic retry, no upstream body returned. Custom gateway protocol settings are validated; existing HTTPS/DNS/auth restrictions remain. Recognizable credentials are redacted from outbound project data and generated output containing recognized credentials is rejected. Strict generated JSON rejects unexpected and unsafe fields. Failed generation cannot modify project data. Successful results remain an in-memory candidate for review, export, discard or explicit application through the existing impact confirmation. Candidates from changed projects cannot overwrite newer work.

Tests use mocked responses and pure provider adapters; no paid API requests, real API keys or deployments. Real provider compatibility and browser UI interactions remain unverified.
