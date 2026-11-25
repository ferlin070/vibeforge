import { validateProject } from "./project-schema.mjs";
import { redactData } from "./redact.mjs";

const table = "/rest/v1/vibeforge_shared_drafts";
const fields = "id,sender_id,recipient_id,draft,created_at";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function sharedBrief(project) {
  validateProject(project);
  const { name, type, idea, audience, agent } = project;
  return redactData({ name, type, idea, audience, agent });
}

function requireSession(session) {
  if (!uuid.test(session?.id || "") || !session?.token)
    throw Error("Sign in to use shared drafts.");
}

export function importSharedDraft(row, session, id, now) {
  requireSession(session);
  if (
    !uuid.test(row?.id || "") ||
    row.recipient_id !== session.id ||
    !row.draft ||
    Object.keys(row.draft).sort().join(",") !== "agent,audience,idea,name,type"
  )
    throw Error("Invalid received draft.");
  return validateProject({
    ...redactData(row.draft),
    id,
    createdAt: now,
    reviewed: [],
    blueprintApproved: false,
  });
}

export async function listSharedDrafts(session, request) {
  requireSession(session);
  const rows = await request(
    table + "?select=" + fields + "&order=created_at.desc&limit=50",
    {},
    session.token,
  );
  if (!Array.isArray(rows)) throw Error("Invalid shared draft response.");
  return rows.filter(
    (row) =>
      uuid.test(row?.id || "") &&
      (row.sender_id === session.id || row.recipient_id === session.id),
  );
}

export async function sendSharedDraft(project, recipient, session, request, approve) {
  requireSession(session);
  const target = recipient.trim().toLowerCase();
  if (!uuid.test(target) || target === session.id.toLowerCase())
    throw Error("Enter a different recipient account ID.");
  const draft = sharedBrief(project);
  if (!(await approve(draft, target))) return { status: "cancelled" };
  const rows = await request(
    table + "?select=" + fields,
    {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        sender_id: session.id,
        recipient_id: target,
        draft,
      }),
    },
    session.token,
  );
  if (
    !Array.isArray(rows) ||
    rows.length !== 1 ||
    !uuid.test(rows[0].id || "") ||
    rows[0].sender_id !== session.id ||
    rows[0].recipient_id !== target
  )
    throw Error("Unexpected response. Refresh shares before retrying.");
  return { status: "sent" };
}

export async function revokeSharedDraft(row, session, request, approve) {
  requireSession(session);
  if (!uuid.test(row?.id || "") || row.sender_id !== session.id)
    throw Error("Only the sender can revoke this share.");
  if (!(await approve())) return { status: "cancelled" };
  const rows = await request(
    table + "?id=eq." + row.id + "&sender_id=eq." + session.id + "&select=id",
    { method: "DELETE", headers: { Prefer: "return=representation" } },
    session.token,
  );
  if (!Array.isArray(rows) || rows.length !== 1 || rows[0].id !== row.id)
    throw Error("Share not found. Refresh the list.");
  return { status: "revoked" };
}
