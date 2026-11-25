import { dashboardSummary } from "./dashboard.mjs";
import { qualityOf } from "./quality.mjs";

export function workspaceOperations(projects) {
  const rows = projects.map((project) => {
    const summary = dashboardSummary(project);
    const critical = qualityOf(project).bugs.filter(
      (bug) =>
        bug.status !== "Resolved" &&
        ["Critical", "High"].includes(bug.severity),
    ).length;
    return {
      id: project.id,
      name: project.name,
      reviewed: summary.reviewed,
      total: summary.total,
      blocked: summary.blocked,
      pendingReview: summary.pendingReview,
      critical,
      missingGates: summary.gates.filter((gate) => !gate.ok).length,
      next: summary.next.view,
    };
  });
  rows.sort(
    (a, b) =>
      b.critical - a.critical ||
      b.pendingReview - a.pendingReview ||
      b.blocked - a.blocked ||
      a.name.localeCompare(b.name),
  );
  return {
    rows,
    projects: rows.length,
    critical: rows.reduce((sum, row) => sum + row.critical, 0),
    blocked: rows.reduce((sum, row) => sum + row.blocked, 0),
    awaitingReview: rows.reduce((sum, row) => sum + row.pendingReview, 0),
    missingGates: rows.reduce((sum, row) => sum + row.missingGates, 0),
  };
}

export function operationsExport(summary) {
  // Aggregate counts only: no project names, IDs, briefs or credentials.
  const { projects, critical, blocked, awaitingReview, missingGates } = summary;
  return JSON.stringify(
    { schema: 1, projects, critical, blocked, awaitingReview, missingGates },
    null,
    2,
  );
}
