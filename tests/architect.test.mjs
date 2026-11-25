import test from "node:test";
import assert from "node:assert/strict";
import { architectureOptions, architecturePlan } from "../lib/architect.mjs";
import { starterBlueprint } from "../lib/blueprint.mjs";

const project = {
  id: "fixture",
  name: "Architecture fixture",
  type: "Web application",
  idea: "Build a booking portal",
  agent: "Gemini CLI",
  blueprintApproved: true,
  blueprint: starterBlueprint({ name: "Fixture", idea: "Build" }),
};

test("architecture options generate distinct proposals without changing approval", () => {
  const before = JSON.stringify(project);
  const plans = architectureOptions.map((item) =>
    architecturePlan(project, item.id),
  );
  assert.equal(new Set(plans).size, architectureOptions.length);
  for (const plan of plans) {
    assert.match(plan, /Status: Proposed/);
    assert.match(plan, /Target agent: Gemini CLI/);
    assert.match(plan, /Mode: Plan/);
    assert.match(plan, /Return a proposal only/);
    assert.match(plan, /Do not run SQL/);
  }
  assert.equal(JSON.stringify(project), before);
});

test("architecture proposal rejects unknown options and redacts credentials", () => {
  assert.throws(() => architecturePlan(project, "unknown"));
  const plan = architecturePlan(
    { ...project, idea: "password=fixture-secret-value" },
    "managed",
  );
  assert.doesNotMatch(plan, /fixture-secret-value/);
  assert.match(plan, /REDACTED/);
});
