import test from "node:test";
import assert from "node:assert/strict";
import {
  importSharedDraft,
  listSharedDrafts,
  revokeSharedDraft,
  sendSharedDraft,
  sharedBrief,
} from "../lib/team.mjs";

const sender = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", token: "sender" };
const recipient = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  token: "recipient",
};
const outsider = {
  id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  token: "outsider",
};
const now = "2026-11-25T00:00:00Z";
const project = {
  id: "fixture",
  name: "Fixture",
  type: "Website",
  idea: "Build a site password=synthetic-secret",
  audience: "",
  agent: "OpenCode",
  reviewed: [],
  createdAt: now,
  memory: [],
  blueprintApproved: false,
};
const row = {
  id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  sender_id: sender.id,
  recipient_id: recipient.id,
  draft: sharedBrief(project),
  created_at: now,
};

test("sharing uses only redacted brief and requires confirmation", async () => {
  const calls = [];
  const request = async (...args) => {
    calls.push(args);
    return [row];
  };
  assert.equal(
    (await sendSharedDraft(project, recipient.id, sender, request, () => false))
      .status,
    "cancelled",
  );
  assert.equal(calls.length, 0);
  assert.equal(
    (await sendSharedDraft(project, recipient.id, sender, request, () => true))
      .status,
    "sent",
  );
  const body = JSON.parse(calls[0][1].body);
  assert.equal(body.sender_id, sender.id);
  assert.equal(body.recipient_id, recipient.id);
  assert.deepEqual(Object.keys(body.draft).sort(), [
    "agent",
    "audience",
    "idea",
    "name",
    "type",
  ]);
  assert.doesNotMatch(JSON.stringify(body), /synthetic-secret/);
  assert.equal(calls[0][2], sender.token);
  await assert.rejects(
    sendSharedDraft(project, sender.id, sender, request, () => true),
    /different recipient/,
  );
});

test("received draft starts without inherited approval and rejects outsiders", () => {
  const draft = importSharedDraft(row, recipient, "new-id", now);
  assert.equal(draft.id, "new-id");
  assert.equal(draft.blueprintApproved, false);
  assert.deepEqual(draft.reviewed, []);
  assert.equal(draft.repository, undefined);
  assert.throws(() => importSharedDraft(row, outsider, "new-id", now));
  assert.throws(() =>
    importSharedDraft(
      { ...row, draft: { ...row.draft, blueprintApproved: true } },
      recipient,
      "new-id",
      now,
    ),
  );
});

test("share listing filters unexpected rows and revocation is sender only", async () => {
  const request = async () => [row];
  assert.deepEqual(await listSharedDrafts(outsider, request), []);
  assert.deepEqual(await listSharedDrafts(recipient, request), [row]);
  await assert.rejects(
    revokeSharedDraft(row, recipient, request, () => true),
    /Only the sender/,
  );
  assert.equal(
    (await revokeSharedDraft(row, sender, request, () => false)).status,
    "cancelled",
  );
  await assert.rejects(
    revokeSharedDraft(
      row,
      sender,
      async () => [],
      () => true,
    ),
    /not found/,
  );
  assert.equal(
    (await revokeSharedDraft(row, sender, request, () => true)).status,
    "revoked",
  );
});
