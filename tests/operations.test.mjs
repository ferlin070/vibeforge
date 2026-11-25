import test from "node:test";
import assert from "node:assert/strict";
import { workspaceOperations, operationsExport } from "../lib/operations.mjs";
import { normalizeLanguage, translate } from "../lib/language.mjs";
import { readRoute, routeURL } from "../lib/navigation.mjs";
import { starterBlueprint } from "../lib/blueprint.mjs";

test("operations summarizes local project evidence and prioritizes open high bugs", () => {
  const project = {
    id: "private-id",
    name: "Private project",
    idea: "Build a site",
    agent: "Universal",
    reviewed: [],
    blueprint: starterBlueprint({ name: "Private project", idea: "Build" }),
    blueprintApproved: false,
    quality: {
      bugs: [
        { severity: "High", status: "Open" },
        { severity: "Critical", status: "Resolved" },
      ],
    },
  };
  const other = {
    ...project,
    id: "other",
    name: "Another project",
    quality: { bugs: [] },
  };
  const input = [other, project];
  const before = JSON.stringify(input);
  const result = workspaceOperations(input);
  assert.equal(result.projects, 2);
  assert.equal(result.critical, 1);
  assert.equal(result.rows[0].id, "private-id");
  assert.ok(result.blocked > 0);
  assert.equal(JSON.stringify(input), before);
  assert.equal(workspaceOperations([]).projects, 0);
  const report = operationsExport(result);
  assert.doesNotMatch(report, /private-id|Private project|Another project/);
  assert.equal(JSON.parse(report).critical, 1);
});

test("language selection is bounded and preserves stable route IDs", () => {
  assert.equal(normalizeLanguage("ms"), "ms");
  assert.equal(normalizeLanguage("other"), "en");
  assert.equal(translate("ms", "Workspace operations"), "Operasi ruang kerja");
  assert.equal(translate("en", "Workspace operations"), "Workspace operations");
  assert.equal(translate("ms", "constructor"), "constructor");
  assert.equal(readRoute("?view=operations", []).view, "operations");
  assert.equal(routeURL("operations", "private-id"), "/?view=operations");
});
