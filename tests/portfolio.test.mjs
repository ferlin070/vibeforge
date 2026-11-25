import test from "node:test";
import assert from "node:assert/strict";
import { starterBlueprint } from "../lib/blueprint.mjs";
import { filterPortfolio, portfolioEntries } from "../lib/portfolio.mjs";

const draft = {
  id: "draft",
  name: "Booking",
  type: "Web application",
  agent: "OpenCode",
  createdAt: "2026-11-24T00:00:00Z",
  reviewed: [],
};
const approved = {
  ...draft,
  id: "approved",
  name: "Inventory",
  agent: "Gemini CLI",
  createdAt: "2026-11-25T00:00:00Z",
  blueprint: starterBlueprint({ name: "Inventory", idea: "Build" }),
  blueprintApproved: true,
  evidence: {},
};

test("portfolio derives task status and next action without modifying projects", () => {
  const projects = [draft, approved];
  const before = JSON.stringify(projects);
  const entries = portfolioEntries(projects);
  assert.equal(entries[0].status, "Planning");
  assert.equal(entries[0].next.view, "studio");
  assert.equal(entries[1].status, "Implementation");
  assert.equal(entries[1].next.view, "mission");
  assert.equal(JSON.stringify(projects), before);
});

test("portfolio filters by search and stage and orders pending evidence first", () => {
  const entries = portfolioEntries([draft, approved]);
  assert.deepEqual(
    filterPortfolio(entries, "gemini").map((entry) => entry.id),
    ["approved"],
  );
  assert.deepEqual(
    filterPortfolio(entries, "", "Planning").map((entry) => entry.id),
    ["draft"],
  );
  assert.deepEqual(
    filterPortfolio(entries).map((entry) => entry.id),
    ["approved", "draft"],
  );
  assert.equal(
    filterPortfolio([{ ...entries[0], pendingReview: 1 }, entries[1]])[0].id,
    "draft",
  );
});
