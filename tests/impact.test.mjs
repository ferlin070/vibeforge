import test from "node:test";
import assert from "node:assert/strict";
import { starterBlueprint } from "../lib/blueprint.mjs";
import { newMemory } from "../lib/context.mjs";
import { addBug, changeBug, readiness } from "../lib/quality.mjs";
import { impactOf, impactMessage, applyProjectPatch } from "../lib/mission.mjs";

const p = {
  name: "Fixture",
  idea: "Build a website",
  type: "Website",
  audience: "Users",
  agent: "Codex",
  document: "Approved brief",
  blueprint: starterBlueprint({ name: "Fixture", idea: "Build a website" }),
  blueprintApproved: true,
  repository: { repo: "owner/repo", sha: "a".repeat(40) },
  evidence: { "TASK-001": { report: "Actual tests", reviewed: true } },
  mission: {
    assignments: { "TASK-001": { role: "pm", agent: "Codex", handedOff: true } },
    history: [{ action: "Assigned" }],
  },
  quality: {
    checks: { functional: { evidence: "Actual acceptance tests" }, security: { evidence: "Reviewed" } },
    ci: { repo: "owner/repo", sha: "a".repeat(40), runs: [] },
    rollback: "Restore known-good commit",
    bugs: [],
  },
  memory: [],
};
function preserved(next) {
  for (const key of ["blueprintApproved", "evidence", "mission"])
    assert.deepEqual(next[key], p[key]);
  assert.deepEqual(next.quality.checks, p.quality.checks);
  assert.deepEqual(next.quality.ci, p.quality.ci);
}
test("agent preference only changes future prompts and preserves assigned agent", () => {
  const patch = { agent: "Cursor" };
  assert.equal(impactOf(p, patch).invalidates, false);
  const next = applyProjectPatch(p, patch);
  preserved(next);
  assert.equal(next.agent, "Cursor");
  assert.equal(next.mission.assignments["TASK-001"].agent, "Codex");
});
test("Knowledge addition and removal preserve approval, assignments, evidence and CI", () => {
  const patch = newMemory(p, { category: "Knowledge", title: "Reference", body: "A note" }, "k", "now");
  assert.equal(impactOf(p, patch).invalidates, false);
  const next = applyProjectPatch(p, patch);
  preserved(next);
  assert.equal(next.memory.length, 1);
  const remove = { memory: [] };
  assert.equal(impactOf(next, remove).invalidates, false);
  preserved(applyProjectPatch(next, remove));
});
for (const category of ["Decision", "Constraint", "Blocker"])
  test(category + " requires exact impact confirmation and still invalidates", () => {
    const patch = newMemory(p, { category, title: "Scope", body: "Changed scope" }, "id", "now");
    const impact = impactOf(p, patch);
    assert.equal(impact.invalidates, true);
    assert.equal(impact.summary.approval, true);
    assert.equal(impact.summary.reviewedTasks, 1);
    assert.equal(impact.summary.reports, 1);
    assert.equal(impact.summary.assignments, 1);
    assert.equal(impact.summary.history, 1);
    assert.deepEqual(impact.summary.releaseChecks, ["functional", "security"]);
    assert.equal(impact.summary.ci, true);
    assert.match(impactMessage(impact), /Reviewed tasks reset: 1/);
    const next = applyProjectPatch(p, patch);
    assert.equal(next.blueprintApproved, false);
    assert.deepEqual(next.evidence, {});
    assert.deepEqual(next.mission.assignments, {});
    assert.deepEqual(next.quality.checks, {});
    assert.equal(next.quality.ci, null);
    assert.equal(next.quality.rollback, p.quality.rollback);
    assert.equal(p.blueprintApproved, true);
    assert.equal(impactOf({ ...p, ...patch }, { memory: [] }).invalidates, true);
  });
for (const [key, value] of Object.entries({
  blueprint: { ...p.blueprint, documents: { ...p.blueprint.documents, brief: "Changed" } },
  repository: { ...p.repository, sha: "b".repeat(40) },
  document: "Changed",
  name: "Renamed",
  idea: "New idea",
  type: "SaaS",
  audience: "Different users",
}))
  test("real scope change invalidates: " + key, () => {
    const patch = { [key]: value };
    assert.equal(impactOf(p, patch).invalidates, true);
    const next = applyProjectPatch(p, patch);
    assert.equal(next.blueprintApproved, false);
    assert.deepEqual(next.evidence, {});
    assert.deepEqual(next.mission.assignments, {});
    assert.equal(next[key], value);
  });
test("unchanged scope and approving a draft do not discard work", () => {
  const patch = { blueprint: JSON.parse(JSON.stringify(p.blueprint)), document: p.document };
  assert.equal(impactOf(p, patch).invalidates, false);
  preserved(applyProjectPatch(p, patch));
  assert.equal(impactOf({ ...p, blueprintApproved: false }, { blueprintApproved: true }).invalidates, false);
  assert.equal(impactOf(p, { blueprintApproved: false }).invalidates, true);
});
for (const severity of ["Low", "Medium"])
  test(severity + " bug creation, investigation and resolution preserve all checks", () => {
    let next = p;
    for (const status of ["Open", "Investigating", "Resolved"]) {
      const quality = status === "Open"
        ? addBug(next, { title: "Bug", details: "Repro", severity }, "bug", "now")
        : changeBug(next, "bug", status, "Retest", "now");
      assert.equal(impactOf(next, { quality }).invalidates, false);
      next = applyProjectPatch(next, { quality });
      preserved(next);
    }
  });
for (const severity of ["Critical", "High"])
  test(severity + " creation and resolution report release check impact only", () => {
    const quality = addBug(p, { title: "Bug", details: "Repro", severity }, "bug", "now");
    const impact = impactOf(p, { quality });
    assert.equal(impact.invalidates, true);
    assert.equal(impact.summary.approval, false);
    assert.deepEqual(impact.summary.releaseChecks, ["functional", "security"]);
    const next = applyProjectPatch(p, { quality });
    assert.deepEqual(next.evidence, p.evidence);
    assert.deepEqual(next.mission, p.mission);
    assert.deepEqual(next.quality.ci, p.quality.ci);
    assert.deepEqual(readiness(next).blocking, ["bug"]);
    const rechecked = { ...next, quality: { ...next.quality, checks: p.quality.checks } };
    const investigating = changeBug(rechecked, "bug", "Investigating", "", "now");
    assert.equal(impactOf(rechecked, { quality: investigating }).invalidates, false);
    const resolved = changeBug(rechecked, "bug", "Resolved", "Retest passed", "now");
    assert.equal(impactOf(rechecked, { quality: resolved }).invalidates, true);
    assert.deepEqual(readiness({ ...rechecked, quality: resolved }).blocking, []);
  });
test("impact preview is pure and a cancelled operation leaves the original unchanged", () => {
  const before = JSON.stringify(p);
  const impact = impactOf(p, { document: "changed" });
  assert.equal(impact.invalidates, true);
  assert.match(impactMessage(impact), /Cancel to keep your existing work/);
  assert.equal(JSON.stringify(p), before);
});
