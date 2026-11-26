import { recoverLocal, validateProject } from "./project-schema.mjs";
import { snapshotDraft } from "./workspace.mjs";

export const backupLimit = 5 * 1024 * 1024;

export function prepareBackup(raw) {
  if (
    typeof raw !== "string" ||
    new TextEncoder().encode(raw).length > backupLimit
  )
    throw Error("Backup must be a JSON file of at most 5 MiB.");
  const result = recoverLocal(raw);
  if (
    result.recovery ||
    !result.projects.length ||
    result.projects.length > 200
  )
    throw Error(
      "Backup must contain 1–200 valid, uniquely identified projects.",
    );
  return result.projects;
}

export function restoreBackupAsDrafts(raw, existing, makeId, now, persist) {
  const source = prepareBackup(raw);
  const used = new Set(existing.map((project) => project.id));
  // Reserve source IDs too: imported projects must never reuse those IDs.
  for (const project of source) used.add(project.id);
  const drafts = source.map((project) => {
    const id = makeId();
    if (used.has(id)) throw Error("Duplicate recovery ID. Nothing imported.");
    used.add(id);
    const draft = snapshotDraft(
      { id: project.id, project, updated_at: project.createdAt },
      id,
      now,
    );
    return validateProject(draft);
  });
  const next = [...drafts, ...existing];
  // Write all copies in a single operation before reporting success.
  persist(next);
  return { projects: next, imported: drafts.length };
}
