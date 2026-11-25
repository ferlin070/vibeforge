import test from "node:test";
import assert from "node:assert/strict";
import { starterBlueprint } from "../lib/blueprint.mjs";
import {
  memoryOf,
  newMemory,
  checkpoint,
  compareContext,
  resume,
  agentPrompt,
  agentFiles,
  reportTemplate,
} from "../lib/context.mjs";
const p = {
  id: "fixture",
  name: "Sample",
  idea: "Build a website",
  agent: "Codex",
  blueprintApproved: true,
  blueprint: starterBlueprint({ name: "Sample", idea: "Build a website" }),
  evidence: {},
};
test("memory patch contains only memory; central impact policy owns invalidation", () => {
  const patch = newMemory(
    p,
    { category: "Decision", title: "Stack", body: "Use approved stack" },
    "id",
    "2026-01-01",
  );
  assert.equal(Object.hasOwn(patch, "blueprintApproved"), false);
  assert.equal(Object.hasOwn(patch, "evidence"), false);
  assert.equal(memoryOf(patch)[0].title, "Stack");
  assert.throws(() =>
    newMemory(p, { category: "bad", title: "t", body: "x" }, "id", "now"),
  );
});
test("checkpoint comparison identifies changed docs and conservative affected tasks", () => {
  const v = checkpoint(p, "Baseline", "id", "now")[0];
  const updated = {
    ...p,
    blueprint: {
      ...p.blueprint,
      documents: { ...p.blueprint.documents, brief: "Changed" },
    },
  };
  const d = compareContext(updated, v);
  assert.deepEqual(d.documents, ["brief"]);
  assert.equal(d.affectedTasks.length, 4);
  assert.equal(compareContext(p, v).affectedTasks.length, 0);
  assert.throws(() =>
    checkpoint({ ...p, contextVersions: [v, v, v] }, "four", "4", "now"),
  );
});
test("resume only permits approved dependency-ready tasks", () => {
  assert.equal(resume(p).ready[0].id, "TASK-001");
  assert.equal(resume({ ...p, blueprintApproved: false }).ready.length, 0);
  assert.match(
    agentPrompt(p, "Codex", "Build", "TASK-001"),
    /Implement only the selected approved ready task/,
  );
  assert.match(
    agentPrompt(p, "Codex", "Build", "TASK-002"),
    /Do not implement/,
  );
  assert.match(
    agentPrompt(
      { ...p, blueprintApproved: false },
      "Cursor",
      "Build",
      "TASK-001",
    ),
    /Do not implement/,
  );
});
test("portable agent context contains instructions and documents but excludes arbitrary project secrets", () => {
  const files = agentFiles({ ...p, apiKey: "do-not-export" });
  for (const key of [
    "AGENTS.md",
    "CLAUDE.md",
    "GEMINI.md",
    ".cursor/rules/vibeforge.mdc",
    ".github/copilot-instructions.md",
    "RESUME.md",
    "context.json",
    "docs/prd.md",
  ])
    assert.ok(files[key]);
  assert.ok(!files["context.json"].includes("do-not-export"));
});

test("agent handoff identifies target commit and includes blank evidence template", () => {
  const project = {
    ...p,
    repository: {
      repo: "owner/repo",
      branch: "feature/test",
      sha: "a".repeat(40),
    },
  };
  const prompt = agentPrompt(project, "Codex", "Build", "TASK-001");
  assert.match(prompt, /feature\/test/);
  assert.match(prompt, /Before any edit/);
  assert.match(prompt, /exit codes/);
  const files = agentFiles(project);
  const manifest = JSON.parse(files["TASK_MANIFEST.json"]);
  assert.equal(manifest.repository.branch, "feature/test");
  assert.equal(manifest.tasks[0].status, "Ready");
  assert.equal(manifest.tasks[1].status, "Blocked");
  assert.match(files["REPORT_TEMPLATE.md"], /Not verified/);
  assert.equal(files["REPORT_TEMPLATE.md"], reportTemplate());
  const draft = JSON.parse(
    agentFiles({ ...project, blueprintApproved: false })["TASK_MANIFEST.json"],
  );
  assert.ok(draft.tasks.every((task) => task.status === "Awaiting approval"));
});
