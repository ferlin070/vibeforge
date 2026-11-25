import { sharedBrief, importSharedDraft } from "./team.mjs";

const spaces = "/rest/v1/vibeforge_team_spaces";
const members = "/rest/v1/vibeforge_team_members";
const briefs = "/rest/v1/vibeforge_team_briefs";
const spaceFields = "id,owner_id,name,created_at";
const memberFields = "team_id,user_id,role,created_at";
const briefFields = "id,team_id,author_id,draft,created_at";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const memberRoles = ["admin", "editor", "viewer"];

function uuid(value) {
  if (typeof value !== "string" || !uuidPattern.test(value))
    throw Error("Invalid account or workspace ID.");
  return value.toLowerCase();
}
function identity(session) {
  if (!session?.token) throw Error("Sign in to use team spaces.");
  return uuid(session.id);
}
async function rows(request, path, session, options = {}) {
  identity(session);
  const result = await request(path, options, session.token);
  if (!Array.isArray(result)) throw Error("Invalid workspace response.");
  return result;
}
function exact(result, match) {
  if (result.length !== 1 || !match(result[0]))
    throw Error("Workspace record changed or access was revoked. Refresh.");
  return result[0];
}
const write = (method, body) => ({
  method,
  headers: { Prefer: "return=representation" },
  ...(body ? { body: JSON.stringify(body) } : {}),
});
const scope = (teamId) => "?team_id=eq." + uuid(teamId);

export function assignableRoles(role) {
  return role === "owner"
    ? [...memberRoles]
    : role === "admin"
      ? ["editor", "viewer"]
      : [];
}
export function canManageMember(role, targetRole) {
  return assignableRoles(role).includes(targetRole);
}
export function canPublish(role) {
  return ["owner", "admin", "editor"].includes(role);
}
export function canRevoke(role, authorId, userId) {
  return (
    ["owner", "admin"].includes(role) ||
    (role === "editor" && authorId === userId)
  );
}

export async function listSpaces(session, request) {
  return rows(
    request,
    spaces + "?select=" + spaceFields + "&order=created_at.desc&limit=50",
    session,
  );
}
export async function createSpace(name, session, request) {
  const owner = identity(session);
  const clean = typeof name === "string" ? name.trim() : "";
  if (!clean || clean.length > 120) throw Error("Enter a workspace name.");
  return exact(
    await rows(
      request,
      spaces + "?select=" + spaceFields,
      session,
      write("POST", { owner_id: owner, name: clean }),
    ),
    (row) => row.owner_id === owner && uuidPattern.test(row.id),
  );
}

export async function renameSpace(teamId, name, session, request) {
  const id = uuid(teamId);
  const owner = identity(session);
  const clean = typeof name === "string" ? name.trim() : "";
  if (!clean || clean.length > 120) throw Error("Enter a workspace name.");
  return exact(
    await rows(
      request,
      spaces + "?id=eq." + id + "&select=" + spaceFields,
      session,
      write("PATCH", { name: clean }),
    ),
    (row) => row.id === id && row.owner_id === owner && row.name === clean,
  );
}

export async function loadSpace(teamId, session, request) {
  const id = uuid(teamId);
  const user = identity(session);
  const space = exact(
    await rows(
      request,
      spaces + "?id=eq." + id + "&select=" + spaceFields,
      session,
    ),
    (row) => row.id === id,
  );
  let role = "owner";
  let ownMembership = null;
  if (space.owner_id !== user) {
    const own = exact(
      await rows(
        request,
        members + scope(id) + "&user_id=eq." + user + "&select=" + memberFields,
        session,
      ),
      (row) =>
        row.team_id === id &&
        row.user_id === user &&
        memberRoles.includes(row.role),
    );
    role = own.role;
    ownMembership = own;
  }
  const [roster, publications] = await Promise.all([
    rows(
      request,
      members + scope(id) + "&select=" + memberFields + "&limit=100",
      session,
    ),
    rows(
      request,
      briefs +
        scope(id) +
        "&select=" +
        briefFields +
        "&order=created_at.desc&limit=50",
      session,
    ),
  ]);
  return {
    space,
    role,
    ownMembership,
    roster: roster.filter((row) => row.team_id === id),
    publications: publications.filter((row) => row.team_id === id),
  };
}

export async function addMember(teamId, userId, role, session, request) {
  const team = uuid(teamId);
  const user = uuid(userId);
  if (!memberRoles.includes(role)) throw Error("Invalid member role.");
  return exact(
    await rows(
      request,
      members + "?select=" + memberFields,
      session,
      write("POST", { team_id: team, user_id: user, role }),
    ),
    (row) => row.team_id === team && row.user_id === user && row.role === role,
  );
}

export async function changeMember(row, role, session, request) {
  const team = uuid(row.team_id);
  const user = uuid(row.user_id);
  if (!memberRoles.includes(row.role) || !memberRoles.includes(role))
    throw Error("Invalid member role.");
  return exact(
    await rows(
      request,
      members +
        scope(team) +
        "&user_id=eq." +
        user +
        "&role=eq." +
        row.role +
        "&select=" +
        memberFields,
      session,
      write("PATCH", { role }),
    ),
    (item) =>
      item.team_id === team && item.user_id === user && item.role === role,
  );
}

export async function removeMember(row, session, request) {
  const team = uuid(row.team_id);
  const user = uuid(row.user_id);
  if (!memberRoles.includes(row.role)) throw Error("Invalid member role.");
  return exact(
    await rows(
      request,
      members +
        scope(team) +
        "&user_id=eq." +
        user +
        "&role=eq." +
        row.role +
        "&select=" +
        memberFields,
      session,
      write("DELETE"),
    ),
    (item) => item.team_id === team && item.user_id === user,
  );
}

export async function publishBrief(teamId, project, session, request) {
  const team = uuid(teamId);
  const author = identity(session);
  const draft = sharedBrief(project);
  return exact(
    await rows(
      request,
      briefs + "?select=" + briefFields,
      session,
      write("POST", { team_id: team, author_id: author, draft }),
    ),
    (row) =>
      row.team_id === team &&
      row.author_id === author &&
      uuidPattern.test(row.id),
  );
}

export async function readTeamBrief(teamId, id, session, request) {
  const team = uuid(teamId);
  const brief = uuid(id);
  return exact(
    await rows(
      request,
      briefs + scope(team) + "&id=eq." + brief + "&select=" + briefFields,
      session,
    ),
    (row) => row.team_id === team && row.id === brief,
  );
}

export function importTeamBrief(row, session, id, now) {
  return importSharedDraft(
    { id: row.id, recipient_id: identity(session), draft: row.draft },
    session,
    id,
    now,
  );
}

export async function revokeBrief(teamId, id, session, request) {
  const team = uuid(teamId);
  const brief = uuid(id);
  return exact(
    await rows(
      request,
      briefs + scope(team) + "&id=eq." + brief + "&select=id,team_id",
      session,
      write("DELETE"),
    ),
    (row) => row.team_id === team && row.id === brief,
  );
}
