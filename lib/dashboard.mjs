import { missionBoard } from "./mission.mjs";
import { readiness } from "./quality.mjs";

export function dashboardSummary(project) {
  const p = project || {};
  const tasks = missionBoard(p);
  const count = (statuses) =>
    tasks.filter((task) => statuses.includes(task.status)).length;
  const gates = readiness(p).gates;
  const reviewed = count(["Reviewed"]);
  const ready = count(["Ready", "Assigned", "Handed off"]);
  const pendingReview = count(["In review"]);
  const blocked = count(["Blocked", "Awaiting approval"]);
  const next = !project
    ? { view: "new", label: "Create your first project" }
    : !tasks.length
      ? { view: "studio", label: "Prepare a blueprint" }
      : !p.blueprintApproved
        ? { view: "studio", label: "Review blueprint for approval" }
        : pendingReview
          ? { view: "mission", label: "Review submitted evidence" }
          : ready
            ? { view: "mission", label: "Continue implementation handoff" }
            : { view: "quality", label: "Inspect release readiness" };
  return {
    total: tasks.length,
    reviewed,
    ready,
    pendingReview,
    blocked,
    gates,
    next,
    percent: tasks.length ? Math.round((100 * reviewed) / tasks.length) : 0,
  };
}
