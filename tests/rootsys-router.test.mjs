import test from "node:test";
import assert from "node:assert/strict";
import { rootsysRoutePlan } from "../lib/rootsys-router.mjs";

test("Rootsys routing keeps the approved model for every context", () => {
  const standard = rootsysRoutePlan({ idea: "Small app" });
  assert.equal(standard.model, "deepseek-v4-flash");
  assert.equal(standard.contextClass, "standard");
  assert.equal(standard.evaluationCandidate, null);
  for (const context of [
    { idea: "x".repeat(2000) },
    { repositoryContext: "x".repeat(1500) },
    { idea: "x".repeat(12000), model: "unapproved-model" },
  ]) {
    const route = rootsysRoutePlan(context);
    assert.equal(route.model, standard.model);
    assert.equal(route.contextClass, "extended");
    assert.equal(route.outputLimit, 8000);
    assert.equal(route.evaluationCandidate, "DeepSeek V4 Pro");
  }
});

test("routing metadata excludes source context and user model overrides", () => {
  const marker = "fixture-private-context";
  const route = rootsysRoutePlan({
    idea: marker,
    repositoryContext: marker,
    model: "deepseek-v4-pro",
  });
  assert.equal(route.model, "deepseek-v4-flash");
  assert.ok(!JSON.stringify(route).includes(marker));
});
