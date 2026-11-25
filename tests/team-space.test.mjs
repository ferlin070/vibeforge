import test from "node:test";
import assert from "node:assert/strict";
import {
  addMember,
  assignableRoles,
  canManageMember,
  canPublish,
  canRevoke,
  changeMember,
  importTeamBrief,
  loadSpace,
  publishBrief,
  readTeamBrief,
} from "../lib/team-space.mjs";

const owner = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  token: "owner",
};
const viewer = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  token: "viewer",
};
const team = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const id = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const now = "2026-11-25T00:00:00Z";
const project = {
  id: "fixture",
  name: "Fixture",
  type: "Website",
  idea: "Build an app",
  audience: "",
  agent: "OpenCode",
  reviewed: [],
  createdAt: now,
};
const member = { team_id: team, user_id: viewer.id, role: "viewer" };
const brief = {
  id,
  team_id: team,
  author_id: owner.id,
  draft: {
    name: project.name,
    type: project.type,
    idea: project.idea,
    audience: project.audience,
    agent: project.agent,
  },
};

test("workspace UI role capabilities do not grant elevated access", () => {
  assert.deepEqual(assignableRoles("owner"), ["admin", "editor", "viewer"]);
  assert.deepEqual(assignableRoles("admin"), ["editor", "viewer"]);
  assert.deepEqual(assignableRoles("editor"), []);
  assert.equal(canManageMember("admin", "admin"), false);
  assert.equal(canPublish("viewer"), false);
  assert.equal(canPublish("editor"), true);
  assert.equal(canRevoke("editor", owner.id, viewer.id), false);
  assert.equal(canRevoke("editor", viewer.id, viewer.id), true);
});

test("workspace loads own role with an exact lookup, not a capped roster", async () => {
  const request = async (path, opts, token) => {
    assert.equal(token, viewer.token);
    if (path.includes("team_spaces")) {
      assert.match(path, new RegExp("id=eq[.]" + team));
      return [{ id: team, owner_id: owner.id, name: "Team" }];
    }
    if (path.includes("user_id=eq.")) {
      assert.match(path, new RegExp("user_id=eq[.]" + viewer.id));
      return [member];
    }
    return [];
  };
  const model = await loadSpace(team, viewer, request);
  assert.equal(model.role, "viewer");
  assert.deepEqual(model.roster, []);
  await assert.rejects(
    loadSpace(team, viewer, async () => []),
    /access was revoked/,
  );
});

test("membership changes use exact old role and reject stale responses", async () => {
  const request = async (path, opts) => {
    assert.match(path, /role=eq.viewer/);
    assert.match(path, new RegExp("team_id=eq[.]" + team));
    assert.equal(opts.method, "PATCH");
    return [{ ...member, role: "editor" }];
  };
  assert.equal(
    (await changeMember(member, "editor", owner, request)).role,
    "editor",
  );
  await assert.rejects(
    changeMember(member, "editor", owner, async () => []),
    /changed or access/,
  );
  await assert.rejects(
    addMember(team, viewer.id, "owner", owner, async () => {
      assert.fail("Invalid role reached transport");
    }),
    /Invalid member role/,
  );
});

test("publication excludes approval and import needs an exact fresh row", async () => {
  const sent = await publishBrief(
    team,
    { ...project, blueprintApproved: false },
    owner,
    async (path, opts) => {
      assert.equal(opts.method, "POST");
      assert.deepEqual(JSON.parse(opts.body).draft, brief.draft);
      return [brief];
    },
  );
  const read = await readTeamBrief(team, sent.id, viewer, async (path) => {
    assert.match(path, new RegExp("id=eq[.]" + id));
    return [brief];
  });
  const draft = importTeamBrief(read, viewer, "new-project", now);
  assert.equal(draft.id, "new-project");
  assert.equal(draft.blueprintApproved, false);
  assert.deepEqual(draft.reviewed, []);
  await assert.rejects(readTeamBrief(team, id, viewer, async () => []));
});
