import test from "node:test";
import assert from "node:assert/strict";
import { starterBlueprint } from "../lib/blueprint.mjs";
import {
  debugInvestigation,
  inspectDiff,
  reviewCandidate,
} from "../lib/review-workbench.mjs";

const project = {
  name: "Synthetic booking project",
  agent: "OpenCode",
  blueprintApproved: true,
  blueprint: starterBlueprint({ name: "Fixture", idea: "Build" }),
  evidence: {},
};

test("debug investigation links acceptance criteria and redacts log secrets", () => {
  const before = JSON.stringify(project);
  const prompt = debugInvestigation(
    project,
    "TypeError: invalid input password=fixture-secret",
    "TASK-001",
  );
  assert.match(prompt, /Runtime/);
  assert.match(prompt, /TASK-001-TC-01/);
  assert.match(prompt, /not executed/i);
  assert.doesNotMatch(prompt, /fixture-secret/);
  assert.equal(JSON.stringify(project), before);
});

test("review signals concern added diff lines and remain unverified", () => {
  const diff = "--- a/file.js\n+++ b/file.js\n-eval(input)\n+eval(input)\n+password=fixture-secret";
  const result = inspectDiff(diff);
  assert.equal(result.addedLines, 2);
  assert.equal(result.signals.length, 2);
  assert.equal(result.signals[0].count, 1);
  const prompt = reviewCandidate(project, diff, "Check permissions");
  assert.match(prompt, /Read-only code review/);
  assert.match(prompt, /unverified/);
  assert.doesNotMatch(prompt, /fixture-secret/);
  assert.throws(() => reviewCandidate(project, " "));
});

test("review input is bounded and a clean pattern scan is not certification", () => {
  const result = inspectDiff("+safe\n".repeat(4000));
  assert.equal(result.truncated, true);
  assert.deepEqual(result.signals, []);
  assert.match(result.warning, /not|No source execution/);
});
