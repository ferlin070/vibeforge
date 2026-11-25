import test from "node:test";
import assert from "node:assert/strict";
import { editMemory, relevantMemory, searchMemory } from "../lib/memory.mjs";
import { impactOf } from "../lib/mission.mjs";
import { makePrompt } from "../lib/planner.mjs";

const note = (id, category, title, body = "Example") => ({
  id,
  category,
  title,
  body,
  createdAt: "2026-11-25T00:00:00Z",
});
const p = {
  name: "Fixture",
  agent: "Universal",
  blueprintApproved: true,
  memory: [
    ...Array.from({ length: 14 }, (_, i) =>
      note("k" + i, "Knowledge", "General note " + i),
    ),
    note("d", "Decision", "Database choice"),
    note("b", "Blocker", "Unresolved security concern"),
    note("c", "Constraint", "No public deployment"),
  ],
};

test("bounded prompt prioritizes older material notes and discloses omissions", () => {
  const ranked = relevantMemory(p, "architecture");
  assert.equal(ranked.included.length, 12);
  assert.equal(ranked.omitted, 5);
  assert.deepEqual(
    ranked.included.slice(0, 3).map((entry) => entry.id),
    ["b", "c", "d"],
  );
  const prompt = makePrompt(p, "architecture", "Plan");
  assert.match(prompt, /Unresolved security concern/);
  assert.match(prompt, /"omittedMemoryEntries": 5/);
  assert.match(prompt, /omitted entries may still matter/);
});

test("search is project-local and case insensitive", () => {
  assert.deepEqual(
    searchMemory(p, "DATABASE", "Decision").map((entry) => entry.id),
    ["d"],
  );
  assert.deepEqual(searchMemory(p, "DATABASE", "Knowledge"), []);
});

test("memory editing preserves identity, redacts secrets and uses impact policy", () => {
  const original = JSON.stringify(p);
  const knowledge = editMemory(p, "k0", {
    category: "Knowledge",
    title: "Updated note",
    body: "password=synthetic-secret-value",
  });
  assert.equal(knowledge.memory[0].id, "k0");
  assert.equal(knowledge.memory[0].createdAt, p.memory[0].createdAt);
  assert.doesNotMatch(JSON.stringify(knowledge), /synthetic-secret-value/);
  assert.equal(impactOf(p, knowledge).invalidates, false);
  const decision = editMemory(p, "d", {
    category: "Decision",
    title: "Changed decision",
    body: "Different architecture",
  });
  assert.equal(impactOf(p, decision).summary.scope, true);
  assert.throws(() => editMemory(p, "missing", {}), /no longer exists/);
  assert.equal(JSON.stringify(p), original);
});
