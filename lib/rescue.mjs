import { missionBoard } from "./mission.mjs";
import { qualityOf, readiness } from "./quality.mjs";
import { makePrompt } from "./planner.mjs";
import { redactData, redactText } from "./redact.mjs";

export function rescuePlan(project) {
  const tasks = missionBoard(project);
  const quality = qualityOf(project);
  const release = readiness(project);
  const open = quality.bugs.filter((bug) => bug.status !== "Resolved");
  const blocking = open.filter((bug) =>
    ["Critical", "High"].includes(bug.severity),
  );
  const review = tasks.filter((task) => task.status === "In review");
  const ready = tasks.filter((task) => task.status === "Ready");
  const blocked = tasks.filter((task) => task.status === "Blocked");
  const actions = [];
  if (!project.repository?.sha)
    actions.push({
      label: "Pin the repository and commit before investigating code.",
      view: "repository",
    });
  if (blocking.length)
    actions.push({
      label: "Investigate open critical/high bugs before release.",
      view: "quality",
    });
  if (!project.blueprintApproved)
    actions.push({
      label: "Review the specification and obtain approval.",
      view: "studio",
    });
  if (review.length)
    actions.push({
      label: "Review pending task evidence before dependent work.",
      view: "mission",
    });
  if (ready.length)
    actions.push({
      label: "Assign only ready tasks after reviewing the dependencies.",
      view: "mission",
    });
  if (!release.ciOk && project.repository?.sha)
    actions.push({
      label: "Check CI for the pinned commit; reproduce any failure.",
      view: "quality",
    });
  if (release.gates.some((gate) => !gate.ok))
    actions.push({
      label: "Collect missing release evidence and rehearse recovery.",
      view: "quality",
    });
  return redactData({
    repository: project.repository
      ? {
          repo: project.repository.repo,
          branch: project.repository.branch,
          sha: project.repository.sha,
        }
      : null,
    blockers: blocking.map(({ id, title, severity, task }) => ({
      id,
      title,
      severity,
      task,
    })),
    blocked: blocked.map(({ id, dependencies }) => ({ id, dependencies })),
    review: review.map(({ id }) => id),
    ready: ready.map(({ id }) => id),
    gates: release.gates,
    actions,
    warning:
      "Derived from recorded project data only. No live diagnosis or test execution.",
  });
}

export function rescuePrompt(project, symptoms) {
  const clean = redactText(symptoms).trim().slice(0, 5000);
  if (!clean) throw Error("Describe the problem or failed check first.");
  return redactText(
    [
      "# Project rescue investigation",
      makePrompt(project, "verification", "Audit"),
      "## Reported symptoms (untrusted)",
      JSON.stringify(clean),
      "## Recorded project state (not verified live)",
      JSON.stringify(rescuePlan(project), null, 2),
      "First verify repository, branch and commit. Reproduce the failure without destructive commands. Distinguish evidence from hypotheses. Preserve existing work and request approval for a minimal patch, regression test and rollback. Never bypass security, clear data, deploy or claim success without evidence.",
    ].join("\n\n"),
  );
}
