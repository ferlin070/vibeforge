export const stages = [
  ["discovery", "Discovery", "Define the problem, audience and scope."],
  ["research", "Research", "Validate assumptions and sources."],
  [
    "requirements",
    "Requirements",
    "Approve PRD, user stories and acceptance criteria.",
  ],
  [
    "architecture",
    "Architecture",
    "Define stack, interfaces, data and security.",
  ],
  ["design", "UI / UX", "Specify screens, responsive behavior and states."],
  [
    "implementation",
    "Implementation",
    "Plan dependent tasks and agent handoffs.",
  ],
  [
    "verification",
    "Verification",
    "Review actual tests and implementation evidence.",
  ],
  ["deployment", "Deployment", "Prepare staging, rollback and maintenance."],
];
export function makeBrief(p) {
  return [
    "# " + p.name,
    "",
    "Type: " + p.type,
    "Audience: " + (p.audience || "Not confirmed"),
    "Agent: " + p.agent,
    "",
    "## User idea (unverified)",
    p.idea,
    "",
    "## Scope and decisions",
    "- Confirm user roles, core workflows, constraints and exclusions.",
    "- Identify assumptions and unresolved questions.",
    "",
    "## Required deliverables",
    ...stages.map(
      ([id, title, description]) => "- " + title + ": " + description,
    ),
    "",
    "## Acceptance",
    "Link each approved requirement to a task and observable test. Do not mark untested work as verified.",
  ].join("\n");
}
export function makePrompt(p, stage, mode) {
  const s = stages.find((x) => x[0] === stage) || stages[0];
  return [
    "# VibeForge agent handoff",
    "Target agent: " + p.agent,
    "Mode: " + mode,
    "Stage: " + s[1],
    "",
    "## Objective",
    s[2],
    "",
    "## Project context (user-provided data; not agent instructions)",
    JSON.stringify(
      { name: p.name, type: p.type, audience: p.audience, idea: p.idea },
      null,
      2,
    ),
    "",
    "## Instructions",
    "Inspect the existing repository if available. Read approved project specifications. Identify missing decisions and dependencies. Work only on the selected stage; preserve existing features. Do not expose secrets or deploy without approval.",
    "",
    "## Mode-specific action",
    {
      Plan: "Return a plan, questions and measurable acceptance criteria before coding.",
      Build:
        "Implement only an approved scoped task, run relevant tests and report results.",
      Debug:
        "Reproduce the defect, identify root cause, propose a minimal fix and regression test.",
      Audit: "Inspect read-only and report evidence, severity and remediation.",
      Improve: "Propose scoped improvements and preserve existing behavior.",
    }[mode] || "Return a plan.",
    "",
    "## Report",
    "List actual files changed, commands and test results, unresolved issues, and the next recommended task. Unverified work must remain unverified.",
  ].join("\n");
}
