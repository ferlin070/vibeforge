import test from "node:test";
import assert from "node:assert/strict";
import { starterBlueprint } from "../lib/blueprint.mjs";
import { assignTask } from "../lib/mission.mjs";
import { workflowPreview } from "../lib/agent-workflow.mjs";

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
