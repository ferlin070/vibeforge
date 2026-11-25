import { makePrompt } from "./planner.mjs";
import { redactText } from "./redact.mjs";

export const architectureOptions = [
  {
    id: "managed",
    title: "Managed web application",
    stack: "Next.js + managed PostgreSQL + managed hosting",
    fit: "Small teams, web portals and SaaS MVPs",
    tradeoff: "Lower operations effort; verify platform limits and costs.",
  },
  {
    id: "selfhosted",
    title: "Self-hosted application",
    stack: "Web frontend + API service + PostgreSQL + containers",
    fit: "Private infrastructure and stronger deployment control",
    tradeoff: "You own patching, monitoring, backups and recovery.",
  },
  {
    id: "mobile",
    title: "Mobile-first application",
    stack: "Cross-platform mobile client + authenticated API + database",
    fit: "Mobile workflows, device features and offline requirements",
    tradeoff: "Plan device testing, offline sync and app-store release.",
  },
];

export function architecturePlan(project, optionId) {
  const option = architectureOptions.find((item) => item.id === optionId);
  if (!project || !option) throw Error("Select a project and architecture option.");
  return redactText(
    [
      "# Architecture decision candidate (ADR-001)",
      "Status: Proposed — not an approved architecture or implementation task.",
      "## Candidate stack",
      option.title,
      option.stack,
      "Fit: " + option.fit,
      "Trade-off: " + option.tradeoff,
      "## Required architecture deliverables",
      "- Compare at least two viable options, including existing repository stack. Explain cost, skills, maintenance and migration impact.",
      "- Provide a system context and component diagram with trust boundaries. Distinguish proposed services from existing services.",
      "- Propose entities, keys, constraints, retention, access policies and reversible migrations. Do not run SQL.",
      "- Define API routes, authentication, authorization, request/response schemas, validation and error contracts.",
      "- Identify threats, least privilege, secrets handling, abuse limits, privacy and recovery.",
      "- Specify environments, observability, backups, rollback, performance budgets and acceptance checks.",
      "- Record assumptions, alternatives, consequences and questions requiring approval.",
      "## Project-aware planning handoff",
      makePrompt(project, "architecture", "Plan"),
      "Return a proposal only. Do not change files, databases, deployments or approvals.",
    ].join("\n\n"),
  );
}
