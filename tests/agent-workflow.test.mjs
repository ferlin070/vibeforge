import test from "node:test";
import assert from "node:assert/strict";
import { starterBlueprint } from "../lib/blueprint.mjs";
import {
  assignTask,
  handoffTask,
  submitMissionReport,
  reviewMission,
} from "../lib/mission.mjs";
import {
  assignWorkflowSuggestion,
  workflowLanes,
  workflowPreview,
  orchestrationQueue,
} from "../lib/agent-workflow.mjs";

const project = {
  name: "Workflow test",
  idea: "Build a website",
  agent: "Codex",
  blueprintApproved: true,
  blueprint: starterBlueprint({ name: "Workflow test", idea: "Build" }),
  evidence: {},
};

test("workflow preview is read-only and keeps dependency gates", () => {
  const before = JSON.stringify(project);
  const plan = workflowPreview(project, { pm: "OpenCode" });
  assert.equal(plan.approved, true);
  assert.equal(plan.tasks[0].status, "Ready");
  assert.equal(plan.tasks[1].status, "Blocked");
  assert.deepEqual(plan.tasks[1].dependencies, ["TASK-001"]);
  assert.equal(JSON.stringify(project), before);
});

test("existing assignments take priority over temporary preferences", () => {
  const assigned = {
    ...project,
    ...assignTask(project, "TASK-001", "pm", "Aider", "2026-11-25"),
  };
  const plan = workflowPreview(assigned, { pm: "OpenCode" });
  assert.equal(plan.tasks[0].agent, "Aider");
  assert.equal(plan.tasks[0].existingAssignment, true);
  assert.equal(plan.tasks[0].status, "Assigned");
});

test("unapproved, absent and invalid agent selections remain safe", () => {
  const plan = workflowPreview(
    { ...project, blueprintApproved: false },
    { pm: "Unknown" },
  );
  assert.equal(plan.approved, false);
  assert.ok(plan.tasks.every((task) => task.status === "Awaiting approval"));
  assert.ok(plan.tasks.every((task) => task.agent === "Codex"));
  assert.deepEqual(workflowPreview(null).tasks, []);
});

test("workflow waves respect dependencies even when task order is reversed", () => {
  const tasks = workflowPreview(project).tasks.reverse();
  const waves = workflowLanes(tasks);
  const index = new Map();
  for (const wave of waves)
    for (const task of wave.tasks) index.set(task.id, wave.level);
  for (const task of tasks)
    for (const dependency of task.dependencies)
      assert.ok(index.get(dependency) < index.get(task.id));
  assert.throws(() => workflowLanes([{ id: "a", dependencies: ["a"] }]));
});

test("workflow suggestions assign only ready unassigned tasks", () => {
  const before = JSON.stringify(project);
  const patch = assignWorkflowSuggestion(
    project,
    "TASK-001",
    { pm: "OpenCode" },
    "2026-11-25",
  );
  const next = { ...project, ...patch };
  assert.equal(workflowPreview(next).tasks[0].status, "Assigned");
  assert.equal(next.mission.assignments["TASK-001"].handedOff, false);
  assert.throws(() =>
    assignWorkflowSuggestion(next, "TASK-001", {}, "2026-11-25"),
  );
  assert.throws(() =>
    assignWorkflowSuggestion(project, "TASK-002", {}, "2026-11-25"),
  );
  assert.throws(() =>
    assignWorkflowSuggestion(
      { ...project, blueprintApproved: false },
      "TASK-001",
      {},
      "2026-11-25",
    ),
  );
  assert.equal(JSON.stringify(project), before);
});

test("coordination queue never advances blocked or unapproved tasks", () => {
  const before = JSON.stringify(project);
  const queue = orchestrationQueue(project);
  assert.deepEqual(
    queue.actionable.map((task) => task.id),
    ["TASK-001"],
  );
  assert.equal(queue.actionable[0].nextAction, "Assign role");
  assert.deepEqual(queue.blocked[0].waitingFor, ["TASK-001"]);
  const draft = orchestrationQueue({ ...project, blueprintApproved: false });
  assert.equal(draft.actionable.length, 0);
  assert.equal(draft.awaitingApproval, project.blueprint.tasks.length);
  assert.equal(JSON.stringify(project), before);
});

test("coordination follows human handoff and review without changing state", () => {
  const id = "TASK-001";
  const now = "2026-11-25";
  let next = { ...project, ...assignTask(project, id, "qa", "Codex", now) };
  assert.equal(orchestrationQueue(next).actionable[0].role, "QA Engineer");
  next = { ...next, ...handoffTask(next, id, now) };
  assert.equal(
    orchestrationQueue(next).actionable[0].nextAction,
    "Collect implementation evidence",
  );
  next = { ...next, ...submitMissionReport(next, id, "Evidence", now) };
  assert.equal(
    orchestrationQueue(next).actionable[0].nextAction,
    "Review evidence",
  );
  next = { ...next, ...reviewMission(next, id, true, now) };
  assert.equal(orchestrationQueue(next).actionable[0].id, "TASK-002");
  next = { ...next, ...reviewMission(next, id, false, now) };
  assert.equal(orchestrationQueue(next).blocked[0].id, "TASK-002");
});
