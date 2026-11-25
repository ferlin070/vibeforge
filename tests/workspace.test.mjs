import test from "node:test";
import assert from "node:assert/strict";
import { starterBlueprint } from "../lib/blueprint.mjs";
import { checkpoint } from "../lib/context.mjs";
import {
  checkpointDraft,
  snapshotDraft,
  saveSnapshotSafely,
  deleteSnapshotSafely,
  restoreSnapshotLocally,
} from "../lib/workspace.mjs";

const now = "2026-11-25T00:00:00.000Z";
const p = {
  id: "original",
  name: "Booking",
  type: "Web application",
  idea: "Build a booking application",
  audience: "",
  agent: "Codex",
  reviewed: [],
  createdAt: now,
  blueprint: starterBlueprint({
    name: "Booking",
    idea: "Build a booking application",
  }),
  blueprintApproved: true,
  evidence: {},
};
const row = { id: p.id, project: p, updated_at: now };
const session = { id: "fixture-owner", token: "fixture-token" };

test("checkpoint and snapshot draft recovery preserve the original and reset approvals", () => {
  const source = {
    ...p,
    contextVersions: checkpoint(p, "Baseline", "version", now),
  };
  const a = checkpointDraft(source, "version", "new-checkpoint", now);
  const b = snapshotDraft(row, "new-snapshot", now);
  for (const copy of [a, b]) {
    assert.notEqual(copy.id, p.id);
    assert.equal(copy.blueprintApproved, false);
    assert.deepEqual(copy.evidence, {});
    assert.deepEqual(copy.blueprint, p.blueprint);
  }
  assert.equal(source.blueprintApproved, true);
  assert.throws(() => snapshotDraft(row, p.id, now));
  assert.throws(() => checkpointDraft(source, "missing", "new", now));
});

test("new snapshots use insert only, never an unconditional upsert", async () => {
  const calls = [];
  const request = async (path, options, token) => {
    calls.push({ path, options, token });
    if (!options.method) return [];
    const body = JSON.parse(options.body);
    return [
      { id: body.id, project: body.project, updated_at: body.updated_at },
    ];
  };
  const result = await saveSnapshotSafely(
    p,
    session,
    request,
    (previous) => previous === null,
    () => now,
  );
  assert.equal(result.status, "saved");
  assert.equal(calls[1].options.method, "POST");
  assert.equal(calls[1].options.headers.Prefer, "return=representation");
  assert.ok(!calls[1].path.includes("on_conflict"));
  assert.ok(calls.every((call) => call.token === session.token));
});

test("existing snapshot writes are conditional and conflict does not retry", async () => {
  const calls = [];
  const request = async (path, options) => {
    calls.push({ path, options });
    return options.method ? [] : [row];
  };
  await assert.rejects(
    saveSnapshotSafely(
      p,
      session,
      request,
      () => true,
      () => now,
    ),
    /changed or disappeared/,
  );
  assert.equal(calls.length, 2);
  assert.equal(calls[1].options.method, "PATCH");
  assert.equal(
    new URL("https://fixture.invalid" + calls[1].path).searchParams.get(
      "updated_at",
    ),
    "eq." + now,
  );
  assert.equal(
    JSON.parse(calls[1].options.body).updated_at,
    "2026-11-25T00:00:00.001Z",
  );
});

test("cancellation and invalid stored snapshots never write", async () => {
  let calls = 0;
  const request = async () => {
    calls++;
    return [row];
  };
  assert.equal(
    (await saveSnapshotSafely(p, session, request, () => false)).status,
    "cancelled",
  );
  assert.equal(calls, 1);
  await assert.rejects(
    saveSnapshotSafely(
      p,
      session,
      async () => [{ ...row, id: "wrong" }],
      () => true,
    ),
  );
});

test("conditional snapshot deletion requires explicit approval and exact version", async () => {
  const calls = [];
  const request = async (path, options, token) => {
    calls.push({ path, options, token });
    return [row];
  };
  assert.equal(
    (await deleteSnapshotSafely(row, session, request, () => false)).status,
    "cancelled",
  );
  assert.equal(calls.length, 0);
  const result = await deleteSnapshotSafely(
    row,
    session,
    request,
    (timestamp) => timestamp === now,
  );
  assert.equal(result.status, "deleted");
  const params = new URL("https://fixture.invalid" + calls[0].path)
    .searchParams;
  assert.equal(params.get("owner_id"), "eq." + session.id);
  assert.equal(params.get("id"), "eq." + p.id);
  assert.equal(params.get("updated_at"), "eq." + now);
  assert.equal(calls[0].options.method, "DELETE");
  assert.equal(calls[0].options.headers.Prefer, "return=representation");
  assert.equal(calls[0].token, session.token);
});

test("missing or changed cloud snapshot does not report successful deletion", async () => {
  await assert.rejects(
    deleteSnapshotSafely(row, session, async () => [], () => true),
    /changed or disappeared/,
  );
  await assert.rejects(
    deleteSnapshotSafely(row, null, async () => [row], () => true),
    /Sign in/,
  );
});

test("local snapshot restore persists first and preserves unrelated projects", () => {
  const other = { ...p, id: "other" };
  const projects = [{ ...p, name: "Local draft" }, other];
  const before = JSON.stringify(projects);
  assert.throws(
    () =>
      restoreSnapshotLocally(row, projects, () => {
        throw Error("Storage quota");
      }),
    /Storage quota/,
  );
  assert.equal(JSON.stringify(projects), before);
  let saved;
  const result = restoreSnapshotLocally(row, projects, (next) => {
    saved = next;
  });
  assert.deepEqual(saved, result);
  assert.deepEqual(result, [p, other]);
  assert.equal(JSON.stringify(projects), before);
});
