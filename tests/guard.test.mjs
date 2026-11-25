import test from "node:test";
import assert from "node:assert/strict";
import {
  boundedText,
  sameOrigin,
  guard,
  allowedCustomHost,
  consumeLimit,
} from "../lib/request-guard.mjs";
const req = (headers = {}, body = "{}") =>
  new Request("https://app.example/api/blueprint", {
    method: "POST",
    headers: { origin: "https://app.example", ...headers },
    body,
  });
test("byte-size limits and origin checks", async () => {
  assert.equal(await boundedText(req({}, "ok"), 2), "ok");
  await assert.rejects(boundedText(req({}, "abc"), 2), (e) => e.status === 413);
  assert.equal(sameOrigin(req({ origin: "https://evil.example" })), false);
  assert.equal(sameOrigin(req({ origin: "https://app.example" })), true);
  assert.equal(sameOrigin(req({ "sec-fetch-site": "cross-site" })), false);
});
test("custom and production requests require verified session", async () => {
  await assert.rejects(
    guard(req(), "blueprint", { custom: true, env: {} }),
    (e) => e.status === 401,
  );
  await assert.rejects(
    guard(req(), "ci", { env: { VERCEL_ENV: "production" } }),
    (e) => e.status === 401,
  );
  await assert.rejects(
    guard(req(), "ci", { env: { VERCEL_ENV: "preview" } }),
    (e) => e.status === 401,
  );
  await guard(req(), "ci", { env: { NODE_ENV: "development" } });
});
test("custom production host exact allowlist and auth verification", async () => {
  assert.equal(
    allowedCustomHost("https://gateway.example/v1", "gateway.example"),
    true,
  );
  assert.equal(
    allowedCustomHost("https://gateway.example.evil/v1", "gateway.example"),
    false,
  );
  const env = {
    VERCEL_ENV: "production",
    VIBEFORGE_CUSTOM_HOSTS: "gateway.example",
    NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  };
  const r = req({ "x-vibeforge-session": "a.b.c" });
  await assert.rejects(
    guard(r, "blueprint", { custom: true, url: "https://bad.example/v1", env }),
    (e) => e.status === 403,
  );
  await guard(r, "blueprint", {
    custom: true,
    url: "https://gateway.example/v1",
    env,
    fetcher: async (url, opts) => {
      assert.equal(url, "https://abc.supabase.co/auth/v1/user");
      assert.equal(opts.headers.Authorization, "Bearer a.b.c");
      return Response.json({ id: "test-user" });
    },
  });
  await assert.rejects(
    guard(r, "ci", {
      env,
      fetcher: async () => new Response("", { status: 401 }),
    }),
    (e) => e.status === 401,
  );
});
test("bounded per-instance rate limit", () => {
  assert.equal(consumeLimit("fixture", 2, 1000, 100), true);
  assert.equal(consumeLimit("fixture", 2, 1000, 100), true);
  assert.equal(consumeLimit("fixture", 2, 1000, 100), false);
  assert.equal(consumeLimit("fixture", 2, 1101, 100), true);
});

test("Next loopback normalization accepts only the actual matching host", () => {
  const local = (origin, host, target = "http://localhost:4173/api/ci") =>
    new Request(target, { headers: { origin, host } });
  assert.equal(
    sameOrigin(local("http://127.0.0.1:4173", "127.0.0.1:4173")),
    true,
  );
  for (const r of [
    local("http://127.0.0.1:4173", "localhost:4173"),
    local("http://127.0.0.1:9999", "127.0.0.1:9999"),
    local("https://127.0.0.1:4173", "127.0.0.1:4173"),
    local("http://evil.example:4173", "evil.example:4173"),
    local("https://evil.example", "evil.example", "https://app.example/api/ci"),
  ])
    assert.equal(sameOrigin(r), false);
});
