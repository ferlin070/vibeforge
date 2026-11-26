import test from "node:test";
import assert from "node:assert/strict";
import { prepareBackup, restoreBackupAsDrafts } from "../lib/backup.mjs";
import { starterBlueprint } from "../lib/blueprint.mjs";

const now = "2026-11-26T00:00:00.000Z";
const source = {
  id: "original",
  name: "Fixture",
  type: "Website",
  idea: "Build a website",
  audience: "",
  agent: "Universal",
  createdAt: now,
  reviewed: [],
  blueprint: starterBlueprint({ name: "Fixture", idea: "Build a website" }),
  blueprintApproved: true,
  evidence: {},
};
const raw = JSON.stringify([source]);

test("backup recovery creates independent unapproved drafts and persists once", () => {
  const existing = [source];
  const before = JSON.stringify(existing);
  let calls = 0;
  const result = restoreBackupAsDrafts(
    raw,
    existing,
    () => "recovered",
    now,
    (next) => {
      calls++;
      assert.equal(next[0].id, "recovered");
      assert.equal(next[0].blueprintApproved, false);
      assert.deepEqual(next[0].evidence, {});
      assert.deepEqual(next[0].blueprint, source.blueprint);
      assert.equal(next[1], source);
    },
  );
  assert.equal(calls, 1);
  assert.equal(result.imported, 1);
  assert.equal(JSON.stringify(existing), before);
});

test("invalid backups, duplicate identities and failed storage do not overwrite existing work", () => {
  for (const invalid of [
    "not JSON",
    "[]",
    JSON.stringify([source, source]),
    JSON.stringify([source, { id: "invalid" }]),
    " ".repeat(5 * 1024 * 1024 + 1),
  ])
    assert.throws(() => prepareBackup(invalid));
  const never = () => assert.fail("Must not persist");
  assert.throws(() =>
    restoreBackupAsDrafts(raw, [], () => source.id, now, never),
  );
  assert.throws(() =>
    restoreBackupAsDrafts(
      raw,
      [{ ...source, id: "collision" }],
      () => "collision",
      now,
      never,
    ),
  );
  const existing = [source];
  assert.throws(
    () =>
      restoreBackupAsDrafts(
        raw,
        existing,
        () => "recovered",
        now,
        () => {
          throw Error("Quota");
        },
      ),
    /Quota/,
  );
  assert.deepEqual(existing, [source]);
});
