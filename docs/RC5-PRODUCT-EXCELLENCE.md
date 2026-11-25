# RC5 Product Excellence — increment 1

## Live evidence from RC4

Staging commit cf27003 passed 127 unit/integration tests and nine browser tests. Upstash Redis build smoke allowed then denied the synthetic request. The operator configured Supabase Auth and Resend SMTP and demonstrated authenticated sign-in, cloud snapshot write/read/restore, logout, password recovery delivery and password update followed by sign-in. The live GitHub scan retrieved 23 files from main, not the audit branch. The operator's Gemini screenshot showed nine documents, 12 tasks, 12/12 requirement references, two open questions and an advisory 86/100 score. No customer content, credentials or reset links are included here. These observations are not a comprehensive release certification.

## RC5 increment

- Optional exact GitHub branch input, pinned branch reference and commit; filter up to 300 captured paths without another network call.
- Blueprint diagnostics identify unknown FR/NFR references and tasks with weak observable acceptance signals. Scores remain heuristic, not a release gate. The revised provider instruction asks for concrete positive/negative outcomes, test data and rollback verification.
- Optional text-only document reader with safe React text rendering. Markdown remains editable/exportable; full rich Markdown rendering is not implemented.
- Existing project storage format remains unchanged. No provider charges, database migrations, automatic approvals or production releases.

Remaining product excellence work: richer handoff, version history and autosave design (separate approval for persistence changes), brand email template design and further live provider and cross-account isolation tests. Verify the exact commit in CI before any staging deployment.

## Increment 2 — command center and handoff

The final increment 1 commit 09b7bfb passed [CI 45574467967](https://github.com/ferlin070/vibeforge/actions/runs/45574467967). Increment 2 adds an active-project command center using the existing mission board and readiness gates, with reviewed tasks separate from available, pending review and blocked tasks. The readiness counts are advisory and do not imply deployment permission. The handoff includes the scanned repository branch/commit, safe execution checklist and structured report expectations. ZIP exports include TASK_MANIFEST.json and REPORT_TEMPLATE.md, a blank template, never fabricated evidence. Mission Control reports a cancelled or failed update honestly. No persistence schema changes. Cloud autosave, broader visual redesign and branded email templates remain separate workstreams.

## Increment 3 — safe workspace recovery

Cloud saves now read the exact owner/project row first, request explicit confirmation, and use create-only POST or a conditional PATCH on the observed updated_at timestamp. Concurrent insertion fails instead of upserting, and a zero-row update is reported as a conflict. Invalid stored data is not overwritten. Checkpoint and cloud recovery can create a separate local draft with a new ID, resetting approval, review, assignment and release evidence. Checkpoint recovery does not reconstruct a full repository inventory from its historical summary. The source project remains untouched. Local storage is persisted before reporting a recovered draft. Cloud snapshots remain manual; no unattended cloud autosave, schema changes or full cloud version history are introduced. Test conditional writes against real PostgREST on a disposable project before release.

## Increment 5 — contextual prompts and open-source handoff targets

Prompt Lab now uses bounded, redacted project memory, repository target, approved stage-specific documents and task status. Generic Build prompts require a separate approved task-specific handoff. The shared registry now includes OpenCode, Hermes Agent, OpenClaw, OMP (oh-my-pi), DeepSeek Harness, Aider, Cline, Continue, Qwen Code, Pi, Goose and OpenHands, in addition to the existing nine targets. Project Studio, Prompt Lab, Context Manager and Mission Control use the same registry; existing project records and assignment labels are preserved.

These are manual prompt and context handoff targets, not installed agent runtimes, API integrations or execution services. Users must configure the external tool, review its permissions and paste or import the exported context themselves. No automatic memory import, credential migration, plugin installation or external messaging is authorized. Model and hosting costs remain separate. CI and staging verification are required before claiming release readiness.

## Local agent connector — offline handoff phase

Mission Control exports a task-scoped ZIP only for an approved, assigned task with reviewed dependencies and a pinned GitHub repository target. The package contains JOB.json, PROMPT.md, REPORT_TEMPLATE.md, README.md and a Node.js Git preflight script. Extract outside the worktree and review all content before sharing. Run the script only in a trusted local repository with Node.js and Git installed; it checks the configured origin, branch, exact HEAD and working-tree status. It does not start an agent, clone a repository, change Git refs, upload evidence or establish a network connection to VibeForge.

The manifest is an unsigned local snapshot, not proof of current authorization. Recheck current approval and task assignment before manual execution. No remote runner, device pairing, stored credentials, background execution, database migration or automatic review is introduced. The operator remains responsible for external agent permissions and costs. Tests exercise a disposable Git repository without using a remote server.

## Architecture and verification workbenches

Architecture Workbench offers three candidate deployment patterns, logical flow, project-aware read-only planning and an ADR candidate export. Database/API/security/infrastructure deliverables are instructions for the selected external agent, not generated schemas or a live architecture discovery. The existing AI blueprint provider form remains unchanged.

Quality Studio extends its existing log heuristics and bug tracker with a bounded project-aware debug investigation export and acceptance criteria linked to a selected task. Code review checks added lines in a pasted diff for a small set of patterns, reports counts rather than raw sensitive lines, and exports a read-only agent review prompt. Inputs remain temporary. Neither workbench executes code, calls a paid model, changes evidence, applies fixes, certifies security or grants deployment approval. Redaction is best effort. Verify findings against actual files, tests and authorization boundaries.

Release readiness remains subject to the gates in RELEASE-CANDIDATE.md. A staged build is not a public release.
