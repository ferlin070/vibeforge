# User guide

## Start a new project

Open VibeForge and select Get started. Enter the project name and type, describe the idea and users, then choose a preferred coding agent. The project is saved in this browser. Avoid passwords, API keys and confidential information in project notes.

## Plan and approve

Open AI Blueprint Studio. Use the manual template without an account, or sign in to Cloud account for AI generation on hosted deployments. Choose a provider, supply your own key and a compatible model ID. For custom gateways use a trusted public HTTPS endpoint; production hosts must be approved by the administrator. Provider charges and availability depend on your account.

Generation returns a candidate for review, not an automatic replacement. Read all nine documents, assumptions, questions and tasks. Review quality warnings. Apply only when ready and approve the blueprint explicitly. The score is advisory. Do not mark unknown facts as verified.

## Work with an existing repository

In GitHub Intelligence, enter owner/repository or a GitHub repository URL. An optional fine-grained read-only token is needed for private repositories or higher quota. The scan imports default-branch metadata, pinned commit, tree inventory and package signals; it does not read all source files or change GitHub. Review any impact confirmation before replacing inventory.

## Hand off work to a coding agent

Use Context Manager to record Knowledge, Decision, Constraint and Blocker notes. Save a checkpoint and export the agent kit. Choose your external agent and mode; Build is only appropriate for an approved ready task. Open the exported instructions in that coding tool yourself.

Mission Control assigns a specialist role and agent to a task. Copy the handoff, send it manually, mark it handed off, then paste the actual implementation report. Review the report and verify changes in the external repository before accepting. VibeForge cannot run the agent or independently certify its work.

## Test and release

Quality Studio generates test-plan templates from acceptance criteria. Execute the tests externally. Record bugs and evidence, import GitHub Actions metadata for the selected commit, complete manual release checks and record rollback instructions. Treat release readiness as advisory, not authorization to deploy.

## Protect your work

Changing agent preference or Knowledge notes preserves approved work. Material specification changes can reset reviews and assignments after confirmation. Low and Medium bugs preserve release checks; High or Critical changes may invalidate checks. Cancel an impact dialog to keep the existing project.

The wizard, documentation draft and AI candidate/report have navigation warnings; not all module forms are guarded. Export work before leaving or closing the page. Use deep links such as `/?view=studio&project=LOCAL_ID` only on the browser containing that project.

## Cloud and recovery

Cloud account offers email/password sign-in, registration, recovery and resend confirmation. Email delivery depends on the operator's Supabase configuration. Sessions refresh in memory and are lost on reload or refresh failure. Sign-out does not remove local data.

Save and list cloud snapshots manually, then restore or delete the selected snapshot. Review overwrite confirmation. There is no background synchronization. If local records fail validation, automatic writes pause; export the emergency original backup before choosing to keep validated records. The emergency backup can contain raw secrets and must be kept private.

To export all local projects or clear local data, open Help & privacy. Clearing local projects does not delete cloud snapshots or your account. Account deletion and privacy requests require an operator-supported process, not an in-app account deletion button.
