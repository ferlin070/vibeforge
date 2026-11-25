# VibeForge — product blueprint

## Goal

Help beginner and advanced vibe coders convert ideas into verified, portable software development specifications for any coding agent.

## Workflow

Discovery → research (source-backed) → PRD → requirements → architecture → UI/UX → database/API → security → dependency-aware tasks → context packs → agent prompts → evidence review → deployment planning → maintenance.

## Proposed architecture (not implemented)

TypeScript, React, Next.js, PostgreSQL, server-side AI provider abstraction, durable queue if required. Validate JSON with schemas. Store versioned documents, stable requirement IDs, task dependencies, context snapshots and evidence. Enforce workspace isolation. Keep secrets server-side.

## Implementation order

1. Initialize application, CI and tests.
2. Authentication and isolated project workspaces.
3. Discovery wizard and editable project brief.
4. AI generation with validated structured outputs, retry and explicit approval.
5. Versioned documents, architecture and task dependency graph.
6. Context pack and universal agent prompt export (Markdown/JSON/ZIP).
7. Agent report import, verification and corrective prompts.
8. Staging, security review, rollback and deployment documentation.

## Acceptance gates

Each requirement maps to tasks and measurable tests. Invalid generation must not be marked complete. Dependency cycles are rejected. Missing evidence stays unverified. Never deploy automatically. No cross-workspace access. Exported prompts contain no secrets. AI-generated assumptions are explicitly labelled.
