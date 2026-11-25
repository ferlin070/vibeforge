import test from "node:test";
import assert from "node:assert/strict";
import {
  validateProject,
  validateSnapshot,
  recoverLocal,
  assertSafeJson,
} from "../lib/project-schema.mjs";
import { starterBlueprint } from "../lib/blueprint.mjs";
import {
  sessionFrom,
  refreshSession,
  recoveryFromFragment,
  requestAccountEmail,
  authRedirect,
  emailAuthPath,
  resetRecoveredPassword,
} from "../lib/cloud-auth.mjs";

const now = "2026-11-25T00:00:00.000Z";
const p = {
  id: "fixture",
  name: "Fixture",
  idea: "Build a website",
  type: "Website",
  audience: "Users",
  agent: "Codex",
  reviewed: [],
  createdAt: now,
};
const b = starterBlueprint(p);
test("valid project, approved blueprint and incomplete draft survive", () => {
  assert.equal(validateProject(p), p);
  assert.ok(validateProject({ ...p, blueprint: b, blueprintApproved: true }));
  const draft = { ...b, documents: { ...b.documents, brief: "" } };
  assert.equal(
    validateProject({ ...p, blueprint: draft }).blueprint.documents.brief,
    "",
  );
  assert.throws(() =>
    validateProject({ ...p, blueprint: draft, blueprintApproved: true }),
  );
});
test("prototype pollution at any depth and non-JSON objects rejected", () => {
  for (const key of ["__proto__", "constructor", "prototype"]) {
    assert.throws(() =>
      assertSafeJson(
        JSON.parse('{"nested":{"' + key + '":{"polluted":true}}}'),
      ),
    );
  }
  assert.throws(() => assertSafeJson(new Date()));
  assert.equal({}.polluted, undefined);
});
test("nested invalid fields and invalid task reviews rejected", () => {
  for (const patch of [
    { reviewed: ["fake"] },
    { agent: "fake" },
    { quality: { bugs: [null] } },
    { mission: { assignments: [], history: [] } },
    { memory: [{}] },
    { blueprintApproved: true },
    {
      blueprint: b,
      evidence: { "TASK-002": { report: "test", reviewed: true } },
      blueprintApproved: true,
    },
    { contextVersions: [{ id: "x", label: "x", createdAt: now, state: {} }] },
  ])
    assert.throws(() => validateProject({ ...p, ...patch }));
});
test("corrupt storage and mixed data never silently replace original", () => {
  assert.deepEqual(recoverLocal(null), {
    projects: [],
    recovery: false,
    rejected: 0,
  });
  assert.equal(recoverLocal("{broken").recovery, true);
  const result = recoverLocal(
    JSON.stringify([p, { ...p, id: "bad", quality: { bugs: [null] } }, p]),
  );
  assert.deepEqual(result.projects, [p]);
  assert.equal(result.rejected, 2);
  assert.equal(result.recovery, true);
});
test("cloud restore checks row identity and safe nested project", () => {
  assert.equal(validateSnapshot({ id: p.id, project: p, updated_at: now }), p);
  assert.throws(() =>
    validateSnapshot({ id: "other", project: p, updated_at: now }),
  );
  assert.throws(() =>
    validateSnapshot({
      id: p.id,
      project: {
        ...p,
        quality: { ci: { runs: [{ url: "javascript:alert(1)" }] } },
      },
      updated_at: now,
    }),
  );
});
const token = {
  access_token: "fake.access.token",
  refresh_token: "fake-refresh",
  expires_in: 3600,
  user: { id: "user", email: "test@example.invalid" },
};
test("refresh rotates in-memory token and rejects identity changes", async () => {
  const s = sessionFrom(token, 1000);
  assert.equal(s.expiresAt, 3601000);
  const next = await refreshSession(s, async (path, opts) => {
    assert.equal(path, "/auth/v1/token?grant_type=refresh_token");
    assert.equal(JSON.parse(opts.body).refresh_token, s.refreshToken);
    return { ...token, refresh_token: "rotated" };
  });
  assert.equal(next.refreshToken, "rotated");
  await assert.rejects(
    refreshSession(s, async () => ({
      ...token,
      user: { ...token.user, id: "other" },
    })),
  );
  assert.throws(() => sessionFrom({ ...token, refresh_token: null }));
});
test("recovery fragment identifies only recovery token", () => {
  assert.deepEqual(recoveryFromFragment("#workflow"), {
    recognized: false,
    token: null,
  });
  assert.deepEqual(
    recoveryFromFragment(
      "#type=recovery&access_token=a.b.c&refresh_token=secret",
    ),
    { recognized: true, token: "a.b.c" },
  );
  assert.deepEqual(recoveryFromFragment("#type=signup&access_token=a.b.c"), {
    recognized: true,
    token: null,
  });
});
test("recovery and resend use fixed endpoints and update user with recovery token", async () => {
  const calls = [];
  const request = async (path, opts, token) => {
    calls.push({ path, opts, token });
    return {};
  };
  await requestAccountEmail(
    "recover",
    "test@example.invalid",
    "https://app.example/",
    request,
    "https://app.example/",
  );
  await requestAccountEmail(
    "resend",
    "test@example.invalid",
    "https://app.example/",
    request,
    "https://app.example/",
  );
  await resetRecoveredPassword("a.b.c", "new-password-fixture", request);
  assert.match(calls[0].path, /^\/auth\/v1\/recover\?redirect_to=/);
  assert.deepEqual(JSON.parse(calls[1].opts.body), {
    email: "test@example.invalid",
    type: "signup",
  });
  assert.equal(calls[2].path, "/auth/v1/user");
  assert.equal(calls[3].opts.method, "PUT");
  assert.equal(calls[3].token, "a.b.c");
});

test("email callback is exact and restricted to approved application roots", () => {
  const list = "https://app.example/, http://127.0.0.1:4173/";
  assert.equal(authRedirect("https://app.example", list), "https://app.example/");
  assert.equal(
    authRedirect("http://127.0.0.1:4173", list),
    "http://127.0.0.1:4173/",
  );
  for (const value of [
    "https://app.example.evil/",
    "https://evil@app.example/",
    "https://app.example/?next=evil",
    "https://app.example/#fragment",
    "https://app.example/path",
    "http://app.example/",
    "http://127.0.0.1:9999/",
    "javascript:alert(1)",
  ])
    assert.throws(() => authRedirect(value, list));
  assert.throws(() => authRedirect("https://app.example", ""));
  assert.throws(() => authRedirect("https://foo.example", "https://*.example"));
});

test("all email operations use approved redirect and reject before network", async () => {
  for (const kind of ["signup", "recover", "resend"])
    assert.equal(
      emailAuthPath(kind, "https://app.example", "https://app.example/"),
      "/auth/v1/" + kind + "?redirect_to=https%3A%2F%2Fapp.example%2F",
    );
  await assert.rejects(
    requestAccountEmail(
      "recover",
      "test@example.invalid",
      "https://evil.example",
      async () => {
        assert.fail("Unexpected network request");
      },
      "https://app.example",
    ),
    /not configured/,
  );
});
