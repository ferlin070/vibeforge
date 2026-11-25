import { agents } from "./context.mjs";
import { assignTask, missionBoard, roles } from "./mission.mjs";
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

export function workflowLanes(tasks) {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const depths = new Map();
  const visiting = new Set();
  function depth(id) {
    if (depths.has(id)) return depths.get(id);
    if (visiting.has(id) || !byId.has(id))
      throw Error("Invalid workflow dependency graph.");
    visiting.add(id);
    const dependencies = byId.get(id).dependencies;
    const value = dependencies.length
      ? 1 + Math.max(...dependencies.map(depth))
      : 0;
    visiting.delete(id);
    depths.set(id, value);
    return value;
  }
  const lanes = [];
  for (const task of tasks) {
    const level = depth(task.id);
    (lanes[level] ||= []).push(task);
  }
  return lanes.map((items, index) => ({ level: index + 1, tasks: items }));
}

export function assignWorkflowSuggestion(project, id, preferences, now) {
  const task = missionBoard(project || {}).find((item) => item.id === id);
  if (!task || task.status !== "Ready" || task.assignment)
    throw Error("Only unassigned ready tasks can be assigned here.");
  const preferred = preferences?.[task.suggestedRole];
  const fallback = agents.includes(project.agent) ? project.agent : "Universal";
  return assignTask(
    project,
    id,
    task.suggestedRole,
    agents.includes(preferred) ? preferred : fallback,
    now,
  );
}
