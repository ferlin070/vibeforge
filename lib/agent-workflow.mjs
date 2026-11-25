import { agents } from "./context.mjs";
import { missionBoard, roles } from "./mission.mjs";
import { redactData } from "./redact.mjs";

export function workflowPreview(project, preferences = {}) {
  const board = missionBoard(project || {});
  const fallback = agents.includes(project?.agent)
    ? project.agent
    : "Universal";
  return redactData({
    project: project?.name || "",
    approved: Boolean(project?.blueprintApproved && board.length),
    tasks: board.map((task) => {
      const role = task.assignment?.role || task.suggestedRole;
      const preferred = preferences[role];
      const agent =
        task.assignment?.agent ||
        (agents.includes(preferred) ? preferred : fallback);
      return {
        id: task.id,
        title: task.title,
        dependencies: task.dependencies,
        role: roles.find((item) => item.id === role)?.name || role,
        agent,
        status: task.status,
        existingAssignment: Boolean(task.assignment),
      };
    }),
    note: "Planning preview only. Assign ready tasks in Mission Control. Existing assignments take precedence. No automatic execution or approval.",
  });
}
