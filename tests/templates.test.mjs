import test from "node:test";
import assert from "node:assert/strict";
import { findTemplates, templateDraft, templates } from "../lib/templates.mjs";
import { validateProject } from "../lib/project-schema.mjs";

test("curated templates create valid unapproved project drafts", () => {
  assert.equal(
    new Set(templates.map((item) => item.id)).size,
    templates.length,
  );
  for (const item of templates) {
    const draft = templateDraft(item.id);
    const project = validateProject({
      ...draft,
      id: "template-fixture",
      createdAt: "2026-11-25T00:00:00Z",
      reviewed: [],
    });
    assert.equal(project.blueprintApproved, undefined);
    assert.equal(project.mission, undefined);
    assert.equal(project.repository, undefined);
    draft.name = "Edited";
    assert.equal(templateDraft(item.id).name, item.name);
  }
  assert.throws(() => templateDraft("missing"));
});

test("template search and category filter work together", () => {
  assert.deepEqual(
    findTemplates("HOMESTAY", "Hospitality").map((item) => item.id),
    ["homestay"],
  );
  assert.deepEqual(findTemplates("HOMESTAY", "Education"), []);
});
