# Privacy policy — draft for operator review

**Not effective or approved.** This draft describes current implementation and decisions the operator must finalize before launch. It is not legal advice or a statement of compliance.

## Service and data

VibeForge is a Ghazwah Group product for software planning. Project names, ideas, documents, notes, evidence and repository metadata are stored locally in the user's browser. Optional cloud snapshots store a validated copy with the authenticated owner's ID and update time in Supabase. Authentication processes email and password through Supabase Auth. Access and refresh tokens are held in memory by VibeForge; sign-out does not erase local projects.

When the user requests AI generation, selected project context and the user's provider credential are transmitted to the selected provider through the application server. GitHub inventory and CI requests transmit a repository reference and optional read-only credential to GitHub. Custom gateways are separate third-party endpoints selected by the user and subject to configured restrictions. Optional Redis rate limiting processes hashed bucket identities and counters. Hosting and upstream services may process request metadata according to their own practices; actual logs and retention must be verified by the operator.

Provider keys and GitHub tokens are not intentionally persisted by VibeForge. Recognized secrets in selected content are redacted on a best-effort basis. Do not enter credentials in notes. An emergency original backup can contain unredacted data after explicit confirmation.

## User choices and retention

Manual planning can be used locally without an account. Users can export or clear local projects and manually delete cloud snapshots through the cloud account interface. Clearing local data does not delete cloud snapshots or the account. Account deletion and data requests need an operator-supported process. Upstream retention, backup retention, logs and lawful deletion exceptions are not yet confirmed.

## Required operator decisions

Before publication, confirm the legal data controller/entity name and contact, applicable laws and lawful bases, purposes and actual processors, international transfer arrangements, retention periods, account deletion and data access/correction procedures, security incident process, children/age policy, any analytics/cookies, and effective date. Provide accurate contact and response procedures. Review Malaysia's applicable personal data obligations and any other relevant jurisdictions with qualified counsel.

No claim of PDPA, GDPR or other legal compliance is made by this draft.
