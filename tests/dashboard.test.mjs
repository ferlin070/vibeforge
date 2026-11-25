import test from "node:test";
import assert from "node:assert/strict";
import { starterBlueprint } from "../lib/blueprint.mjs";
import { dashboardSummary } from "../lib/dashboard.mjs";

const p = {
  name: "Fixture",
  idea: "Build a booking site",
  blueprint: starterBlueprint({
    name: "Fixture",
    idea: "Build a booking site",
  }),
  blueprintApproved: true,
  evidence: {},
};

test("dashboard separates reviewed, available and unapproved tasks", () => {
  assert.equal(dashboardSummary(null).next.view, "new");
  const draft = dashboardSummary({ ...p, blueprintApproved: false });
  assert.equal(draft.blocked, 4);
  assert.equal(draft.ready, 0);
  assert.equal(draft.next.view, "studio");
  const approved = dashboardSummary(p);
  assert.equal(approved.ready, 1);
  assert.equal(approved.blocked, 3);
  assert.equal(approved.reviewed, 0);
  assert.equal(approved.next.view, "mission");
});

test("dashboard prioritizes pending evidence and does not treat it as reviewed", () => {
  const pending = dashboardSummary({
    ...p,
    evidence: { "TASK-001": { report: "Fixture report", reviewed: false } },
  });
  assert.equal(pending.pendingReview, 1);
  assert.equal(pending.percent, 0);
  assert.equal(pending.next.label, "Review submitted evidence");
  const reviewed = dashboardSummary({
    ...p,
    evidence: { "TASK-001": { report: "Fixture report", reviewed: true } },
  });
  assert.equal(reviewed.reviewed, 1);
  assert.equal(reviewed.percent, 25);
  assert.equal(reviewed.ready, 1);
});
