import { categories, memoryOf } from "./context.mjs";
import { redactText } from "./redact.mjs";

const stageTerms = {
  discovery: ["scope", "audience", "problem", "user"],
  research: ["research", "source", "evidence", "assumption"],
  requirements: ["requirement", "acceptance", "scope", "user"],
  architecture: ["architecture", "database", "api", "stack", "security"],
  design: ["design", "ui", "ux", "accessibility", "screen"],
  implementation: ["task", "implementation", "dependency", "code"],
  verification: ["test", "bug", "security", "review", "evidence"],
  deployment: ["deploy", "rollback", "hosting", "release", "environment"],
};

const categoryPriority = {
  Blocker: 400,
  Constraint: 300,
  Decision: 200,
  Knowledge: 0,
};

export function searchMemory(project, query = "", category = "All") {
  const term = query.trim().toLowerCase();
  return memoryOf(project).filter(
    (entry) =>
      (category === "All" || category === entry.category) &&
      (entry.title + " " + entry.body).toLowerCase().includes(term),
  );
}

export function relevantMemory(project, stage) {
  const entries = memoryOf(project);
  const terms = Object.hasOwn(stageTerms, stage) ? stageTerms[stage] : [];
  const ranked = entries
    .map((entry, index) => {
      const searchable = (entry.title + " " + entry.body).toLowerCase();
      const score =
        categoryPriority[entry.category] +
        terms.filter((term) => searchable.includes(term)).length * 10;
      return { entry, index, score };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index);
  return {
    included: ranked.slice(0, 12).map(({ entry }) => entry),
    omitted: Math.max(0, entries.length - 12),
  };
}

export function editMemory(project, id, input) {
  const current = memoryOf(project);
  if (!current.some((entry) => entry.id === id))
    throw Error("Memory entry no longer exists.");
  const title = redactText(input.title).slice(0, 160).trim();
  const body = redactText(input.body).slice(0, 2400).trim();
  if (!title || !body || !categories.includes(input.category))
    throw Error("Add a category, title and note.");
  return {
    memory: current.map((entry) =>
      entry.id === id
        ? { ...entry, category: input.category, title, body }
        : entry,
    ),
  };
}
