import test from "node:test";
import assert from "node:assert/strict";
import { stages, makeBrief, makePrompt } from "../lib/planner.mjs";
import { starterBlueprint } from "../lib/blueprint.mjs";
const p = {
  name: "Demo",
  type: "Website",
  audience: "Owners",
  agent: "Codex",
  idea: "Test idea",
};
test("brief retains user context and all eight stages", () => {
  const b = makeBrief(p);
  assert.ok(b.includes(p.idea));
  for (const s of stages) assert.ok(b.includes(s[1]));
});
test("audit mode is read-only and requires evidence", () => {
  const b = makePrompt(p, "verification", "Audit");
  assert.match(b, /Inspect read-only/);
  assert.match(b, /Unverified work/);
});
test("all workflow stages and prompt modes produce a handoff", () => {
  for (const s of stages)
    for (const m of ["Plan", "Build", "Debug", "Audit", "Improve"])
      assert.ok(makePrompt(p, s[0], m).includes(s[1]));
});

test("stage prompts include agent guidance and only relevant approved documents", () => {
  const project = {
    ...p,
    blueprint: starterBlueprint(p),
    blueprintApproved: true,
    repository: {
      repo: "example/demo",
      branch: "audit",
      sha: "a".repeat(40),
    },
  };
  const result = makePrompt(project, "architecture", "Plan");
  assert.match(result, /AGENTS\.md/);
  assert.match(result, /"branch": "audit"/);
  assert.match(result, /"architecture":/);
  assert.match(result, /"database":/);
  assert.doesNotMatch(result, /"deployment":/);
  assert.match(result, /"status": "Blocked"/);
});

test("unapproved blueprints and generic Build prompts do not authorize edits", () => {
  const project = {
    ...p,
    blueprint: starterBlueprint(p),
    blueprintApproved: false,
  };
  const result = makePrompt(project, "implementation", "Build");
  assert.match(result, /does not authorize implementation/);
  assert.match(result, /"documents": \{\}/);
  assert.match(result, /Awaiting approval/);
});

test("prompt redacts recognized credentials before displaying project context", () => {
  const project = {
    ...p,
    idea: "api_key=synthetic-secret-value",
    memory: [
      {
        id: "memory-1",
        category: "Constraint",
        title: "Credential example",
        body: "password=synthetic-password-value",
      },
    ],
  };
  const result = makePrompt(project, "discovery", "Plan");
  assert.doesNotMatch(result, /synthetic-secret-value|synthetic-password-value/);
  assert.match(result, /\[REDACTED\]/);
  assert.match(result, /Credential example/);
});

test("unknown agent, mode and stage fall back to safe planning defaults", () => {
  const result = makePrompt({ ...p, agent: "Unknown" }, "bad", "__proto__");
  assert.match(result, /Target agent: Universal/);
  assert.match(result, /Mode: Plan/);
  assert.match(result, /Stage: Discovery/);
});
