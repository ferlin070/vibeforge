import { redactData } from "./redact.mjs";
import { validateProject, validateSnapshot } from "./project-schema.mjs";

function draftCopy(source, id, now) {
  const suffix = " (recovered draft)";
  return validateProject(
    redactData({
      ...source,
      id,
      name: source.name.slice(0, 200 - suffix.length) + suffix,
      createdAt: now,
      reviewed: [],
      blueprintApproved: false,
      evidence: {},
      mission: { assignments: {}, history: [] },
      quality: {},
      contextVersions: [],
    }),
  );
}

export function snapshotDraft(row, id, now) {
  const source = validateSnapshot(row);
  if (id === source.id) throw Error("A new project ID is required.");
  return draftCopy(source, id, now);
}

export function checkpointDraft(project, versionId, id, now) {
  validateProject(project);
  const version = project.contextVersions?.find((v) => v.id === versionId);
  if (!version || id === project.id)
    throw Error("Invalid checkpoint or new project ID.");
  const s = version.state;
  return draftCopy(
    {
      ...s.project,
      ...(s.brief ? { document: s.brief } : {}),
      ...(s.blueprint
        ? {
            blueprint: s.blueprint,
            blueprintSource: "Recovered checkpoint draft",
          }
        : {}),
      memory: s.memory,
    },
    id,
    now,
  );
}

const snapshotTable = "/rest/v1/vibeforge_projects";
const selectFields = "id,project,updated_at";
function rowPath(owner, id) {
  return (
    snapshotTable +
    "?owner_id=eq." +
    encodeURIComponent(owner) +
    "&id=eq." +
    encodeURIComponent(id)
  );
}

export async function saveSnapshotSafely(
  project,
  session,
  request,
  approve,
  now = () => new Date().toISOString(),
) {
  const clean = validateProject(redactData(validateProject(project)));
  if (!session?.id || !session?.token) throw Error("Sign in before saving.");
  const path = rowPath(session.id, clean.id);
  const existing = await request(
    path + "&select=" + selectFields,
    {},
    session.token,
  );
  if (!Array.isArray(existing) || existing.length > 1)
    throw Error("Unexpected snapshot response. Nothing was overwritten.");
  const previous = existing[0];
  if (previous) {
    validateSnapshot(previous);
    if (previous.id !== clean.id) throw Error("Snapshot identity mismatch.");
  }
  if (!(await approve(previous?.updated_at || null)))
    return { status: "cancelled" };
  const timestamp = new Date(
    Math.max(
      Date.parse(now()),
      previous ? Date.parse(previous.updated_at) + 1 : 0,
    ),
  ).toISOString();
  const body = JSON.stringify({
    id: clean.id,
    owner_id: session.id,
    project: clean,
    updated_at: timestamp,
  });
  // No upsert: a concurrent insert fails instead of overwriting another device.
  // An existing row can be replaced only if its observed timestamp still matches.
  const rows = await request(
    previous
      ? path +
          "&updated_at=eq." +
          encodeURIComponent(previous.updated_at) +
          "&select=" +
          selectFields
      : snapshotTable + "?select=" + selectFields,
    {
      method: previous ? "PATCH" : "POST",
      headers: { Prefer: "return=representation" },
      body,
    },
    session.token,
  );
  if (!Array.isArray(rows) || rows.length !== 1)
    throw Error(
      "Snapshot changed or disappeared. List snapshots and review before saving again.",
    );
  validateSnapshot(rows[0]);
  if (rows[0].id !== clean.id)
    throw Error("Unexpected saved snapshot identity.");
  return { status: "saved", row: rows[0] };
}

export async function deleteSnapshotSafely(row, session, request, approve) {
  const project = validateSnapshot(row);
  if (!session?.id || !session?.token) throw Error("Sign in before deleting.");
  if (!(await approve(row.updated_at))) return { status: "cancelled" };
  const rows = await request(
    rowPath(session.id, project.id) +
      "&updated_at=eq." +
      encodeURIComponent(row.updated_at) +
      "&select=" +
      selectFields,
    { method: "DELETE", headers: { Prefer: "return=representation" } },
    session.token,
  );
  if (!Array.isArray(rows) || rows.length !== 1)
    throw Error(
      "Snapshot changed or disappeared. List snapshots before retrying.",
    );
  validateSnapshot(rows[0]);
  if (rows[0].id !== project.id)
    throw Error("Unexpected deleted snapshot identity.");
  return { status: "deleted" };
}

export function restoreSnapshotLocally(row, projects, persist) {
  const project = validateSnapshot(row);
  const next = [project, ...projects.filter((item) => item.id !== project.id)];
  persist(next);
  return next;
}
