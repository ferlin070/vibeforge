import test from "node:test";
import assert from "node:assert/strict";
import { rescuePlan, rescuePrompt } from "../lib/rescue.mjs";
import { starterBlueprint } from "../lib/blueprint.mjs";

const project = {
  id: "fixture",
  name: "Fixture",
  idea: "Build an app",
  type: "Website",
  audience: "",
  agent: "Universal",
  blueprint: starterBlueprint({ name: "Fixture", idea: "Build an app" }),
  blueprintApproved: true,
  evidence: {},
  quality: {
    bugs: [
      {
        id: "bug",
        title: "Permission failure",
        severity: "High",
        status: "Open",
        task: "TASK-001",
      },
    ],
  },
};

test("rescue prioritizes recorded blockers without changing project", () => {
  const before = JSON.stringify(project);
  const plan = rescuePlan(project);
  assert.equal(plan.blockers.length, 1);
  assert.ok(plan.blocked.length > 0);
  assert.ok(plan.ready.length > 0);
  assert.ok(plan.actions.some((action) => action.view === "quality"));
  assert.match(plan.warning, /No live diagnosis/);
  assert.equal(JSON.stringify(project), before);
});

test("rescue prompt redacts symptoms and requires approval for changes", () => {
  const prompt = rescuePrompt(project, "password=synthetic-secret-value");
  assert.doesNotMatch(prompt, /synthetic-secret-value/);
  assert.match(prompt, /request approval for a minimal patch/);
  assert.match(prompt, /not verified live/);
  assert.throws(() => rescuePrompt(project, ""));
});
