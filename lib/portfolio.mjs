import { dashboardSummary } from "./dashboard.mjs";

export function portfolioEntries(projects) {
  return projects.map((project) => {
    const summary = dashboardSummary(project);
    const status = !project.blueprintApproved
      ? "Planning"
      : summary.total > 0 && summary.reviewed === summary.total
        ? "Review release"
        : "Implementation";
    return {
      id: project.id,
      name: project.name,
      type: project.type,
      agent: project.agent,
      status,
      createdAt: project.createdAt,
      total: summary.total,
      reviewed: summary.reviewed,
      pendingReview: summary.pendingReview,
      next: summary.next,
    };
  });
}

export function filterPortfolio(entries, query = "", status = "All") {
  const term = query.trim().toLowerCase();
  return entries
    .filter(
      (entry) =>
        (status === "All" || entry.status === status) &&
        [entry.name, entry.type, entry.agent].some((value) =>
          String(value || "").toLowerCase().includes(term),
        ),
    )
    .sort(
      (a, b) =>
        (b.pendingReview > 0) - (a.pendingReview > 0) ||
        Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );
}
