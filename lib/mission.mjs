import { redactReport } from "./redact.mjs";
import {
  validateBlueprint,
  taskState,
  invalidateReviews,
} from "./blueprint.mjs";
import { agents, agentPrompt } from "./context.mjs";
export const roles = [
  {
    id: "pm",
    name: "Project Manager",
    scope: "Requirements, scope, dependencies and delivery planning.",
    keywords: /scope|requirement|project|planning|prd/i,
  },
  {
    id: "architect",
    name: "Software Architect",
    scope: "Architecture decisions, interfaces and system boundaries.",
    keywords: /architect|system design|interface/i,
  },
  {
    id: "design",
    name: "UI/UX Designer",
    scope: "User flows, accessibility and design specifications.",
    keywords: /design|ui\/ux|ux|wireframe/i,
  },
  {
    id: "frontend",
    name: "Frontend Developer",
    scope: "UI components, responsive screens and client state.",
    keywords: /frontend|component|react|screen|client/i,
  },
  {
    id: "backend",
    name: "Backend Developer",
    scope: "Server logic, APIs and integrations.",
    keywords: /backend|api|server|integration/i,
  },
  {
    id: "database",
    name: "Database Engineer",
    scope: "Data model, migrations, constraints and query performance.",
    keywords: /database|schema|sql|migration/i,
  },
  {
    id: "security",
    name: "Security Auditor",
    scope: "Threat analysis, authentication, authorization and secrets.",
    keywords: /security|auth|privacy|rls/i,
  },
  {
    id: "qa",
    name: "QA Engineer",
    scope: "Reproducible test cases, regression and verification evidence.",
    keywords: /test|verification|regression|qa/i,
  },
  {
    id: "devops",
    name: "DevOps Engineer",
    scope: "Build, deployment readiness, monitoring and rollback.",
    keywords: /deploy|release|ci\/cd|hosting|rollback/i,
  },
];
const roleById = (id) => roles.find((r) => r.id === id);
const tasksOf = (p) => {
  try {
    return validateBlueprint(p.blueprint).tasks;
  } catch {
    return [];
  }
};
const taskOf = (p, id) => {
  const t = tasksOf(p).find((x) => x.id === id);
  if (!t) throw Error("Select a valid blueprint task.");
  return t;
};
const assignmentOf = (p, id) => {
  const a = p.mission?.assignments?.[id];
  return a && roleById(a.role) && agents.includes(a.agent) ? a : null;
};
export function recommendRole(t) {
  return (
    roles.slice(1).find((r) => r.keywords.test(t.title + " " + t.description))
      ?.id || "pm"
  );
}
export function missionBoard(p) {
  const tasks = tasksOf(p),
    e = p.evidence || {};
  return tasks.map((t) => {
    const a = assignmentOf(p, t.id),
      state = taskState(t, e, tasks);
    const status = !p.blueprintApproved
      ? "Awaiting approval"
      : state === "Blocked"
        ? "Blocked"
        : state === "Reviewed"
          ? "Reviewed"
          : state === "Evidence pending review"
            ? "In review"
            : a?.handedOff
              ? "Handed off"
              : a
                ? "Assigned"
                : "Ready";
    return { ...t, assignment: a, status, suggestedRole: recommendRole(t) };
  });
}
function record(p, assignments, action, id, now) {
  return {
    assignments,
    history: [
      { action, task: id, at: now },
      ...(Array.isArray(p.mission?.history) ? p.mission.history : []),
    ].slice(0, 60),
  };
}
function approvedReady(p, id) {
  const t = taskOf(p, id);
  if (
    !p.blueprintApproved ||
    taskState(t, p.evidence || {}, tasksOf(p)) === "Blocked"
  )
    throw Error("Blueprint approval and reviewed dependencies are required.");
  return t;
}
export function assignTask(p, id, role, agent, now) {
  const t = approvedReady(p, id);
  if (!roleById(role) || !agents.includes(agent))
    throw Error("Invalid role or agent.");
  if (p.evidence?.[id]?.report)
    throw Error("Resolve existing evidence before changing assignment.");
  return {
    mission: record(
      p,
      {
        ...p.mission?.assignments,
        [id]: { role, agent, handedOff: false, assignedAt: now },
      },
      "Assigned",
      t.id,
      now,
    ),
  };
}
export function handoffTask(p, id, now) {
  approvedReady(p, id);
  const a = assignmentOf(p, id);
  if (!a || p.evidence?.[id]?.report)
    throw Error("Assign a role and resolve existing evidence first.");
  return {
    mission: record(
      p,
      {
        ...p.mission.assignments,
        [id]: { ...a, handedOff: true, handoffAt: now },
      },
      "Handoff recorded",
      id,
      now,
    ),
  };
}
export function missionPrompt(p, id) {
  const t = approvedReady(p, id),
    a = assignmentOf(p, id);
  if (!a || p.evidence?.[id]?.report)
    throw Error("Assign a ready task before preparing a handoff.");
  const role = roleById(a.role);
  return (
    "# Assigned role: " +
    role.name +
    "\nScope: " +
    role.scope +
    "\n\n" +
    agentPrompt(p, a.agent, "Build", t.id) +
    "\n\nDo not treat a handoff as proof of execution. Return a report for human review."
  );
}
export function submitMissionReport(p, id, report, now) {
  approvedReady(p, id);
  const a = assignmentOf(p, id);
  if (!a?.handedOff) throw Error("Record the manual handoff first.");
  if (p.evidence?.[id]?.reviewed)
    throw Error("Reopen review before replacing evidence.");
  const raw = typeof report === "string" ? report.trim() : "";
  const value = redactReport(raw);
  if (!value || raw.length > 5000)
    throw Error("Report is required (maximum 5,000 characters).");
  const evidence = invalidateReviews(tasksOf(p), {
    ...p.evidence,
    [id]: { report: value, reviewed: false },
  });
  return {
    evidence,
    mission: record(p, p.mission.assignments, "Report submitted", id, now),
  };
}
export function reviewMission(p, id, accept, now) {
  approvedReady(p, id);
  const e = p.evidence?.[id];
  if (!e?.report) throw Error("No report to review.");
  if (accept && e.reviewed) throw Error("Already reviewed.");
  const evidence = invalidateReviews(tasksOf(p), {
    ...p.evidence,
    [id]: { ...e, reviewed: !!accept },
  });
  const assignments = { ...p.mission?.assignments };
  if (!accept) {
    // Reopen the selected task and invalidate downstream dispatch markers.
    delete evidence[id];
    const invalidated = new Set([id]);
    let changed = true;
    const tasks = tasksOf(p);
    while (changed) {
      changed = false;
      for (const t of tasks)
        if (
          t.dependencies.some((d) => invalidated.has(d)) &&
          !invalidated.has(t.id)
        ) {
          invalidated.add(t.id);
          changed = true;
        }
    }
    for (const taskId of invalidated) {
      delete evidence[taskId];
      if (assignments[taskId])
        assignments[taskId] = {
          ...assignments[taskId],
          handedOff: false,
          handoffAt: null,
        };
    }
  }
  return {
    evidence,
    mission: record(
      p,
      assignments,
      accept
        ? "Human review accepted"
        : "Review reopened; downstream evidence invalidated",
      id,
      now,
    ),
  };
}
const scopeKeys = [
  "blueprint",
  "repository",
  "document",
  "name",
  "idea",
  "type",
  "audience",
];
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const materialMemory = (value) =>
  (Array.isArray(value) ? value : []).filter((m) => m.category !== "Knowledge");
export function impactOf(p, patch) {
  const reasons = scopeKeys.filter(
    (key) => Object.hasOwn(patch, key) && !same(p[key], patch[key]),
  );
  if (
    Object.hasOwn(patch, "memory") &&
    !same(materialMemory(p.memory), materialMemory(patch.memory))
  )
    reasons.push("scope-affecting memory");
  if (p.blueprintApproved && patch.blueprintApproved === false)
    reasons.push("reopen approval");
  const scope = reasons.length > 0;
  const checks = p.quality?.checks || {};
  const clearedChecks = Object.keys(checks).filter(
    (key) =>
      scope ||
      (Object.hasOwn(patch, "quality") && !patch.quality?.checks?.[key]),
  );
  const evidence = Object.values(p.evidence || {});
  const summary = {
    reasons,
    scope,
    approval: scope && !!p.blueprintApproved,
    reviewedTasks: scope ? evidence.filter((e) => e?.reviewed).length : 0,
    reports: scope ? evidence.filter((e) => e?.report).length : 0,
    assignments: scope ? Object.keys(p.mission?.assignments || {}).length : 0,
    history: scope ? (p.mission?.history || []).length : 0,
    releaseChecks: clearedChecks,
    ci: scope && !!p.quality?.ci,
  };
  return { invalidates: scope || clearedChecks.length > 0, summary };
}
export function impactMessage(impact) {
  const s = impact.summary;
  return [
    "Apply this change?",
    "Reason: " + (s.reasons.join(", ") || "release evidence affected"),
    "Blueprint approval: " + (s.approval ? "reset" : "unchanged"),
    "Reviewed tasks reset: " + s.reviewedTasks,
    "Task reports cleared: " + s.reports,
    "Assignments cleared: " + s.assignments,
    "Mission history entries cleared: " + s.history,
    "Release checks cleared (" + s.releaseChecks.length + "): " +
      (s.releaseChecks.join(", ") || "none"),
    "Imported CI: " + (s.ci ? "cleared" : "unchanged"),
    "Cancel to keep your existing work.",
  ].join("\n");
}
export function applyProjectPatch(p, patch) {
  const { summary } = impactOf(p, patch);
  if (summary.scope)
    return {
      ...p,
      ...patch,
      blueprintApproved: false,
      evidence: {},
      mission: { assignments: {}, history: [] },
      quality: { ...p.quality, ...patch.quality, checks: {}, ci: null },
    };
  // Evidence is shared across Studio and Mission Control. Clear any handoff whose dependency is no longer reviewed.
  const next = { ...p, ...patch };
  if (Object.hasOwn(patch, "evidence") && next.mission) {
    const assignments = { ...next.mission.assignments };
    for (const t of missionBoard(next))
      if (t.status === "Blocked" && assignments[t.id])
        assignments[t.id] = {
          ...assignments[t.id],
          handedOff: false,
          handoffAt: null,
        };
    next.mission = { ...next.mission, assignments };
  }
  return next;
}
