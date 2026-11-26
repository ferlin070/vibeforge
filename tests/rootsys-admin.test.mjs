import test from "node:test";
import assert from "node:assert/strict";
import { guard } from "../lib/request-guard.mjs";
import { POST } from "../app/api/rootsys/admin/route.js";

const env = {
  VERCEL_ENV: "preview",
  ROOTSYS_ENABLED: "false",
  ROOTSYS_OWNER_ID: "fixture-owner",
  ROOTSYS_API_KEY: "fixture-secret",
  NEXT_PUBLIC_SUPABASE_URL: "https://fixture.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fixture",
  UPSTASH_REDIS_REST_URL: "https://redis.example",
  UPSTASH_REDIS_REST_TOKEN: "fixture-redis",
};
const request = () =>
  new Request("https://app.example/api/rootsys/admin", {
    method: "POST",
    headers: {
      origin: "https://app.example",
      "x-vibeforge-session": "fake.session.token",
    },
  });

test("disabled pilot owner readiness makes no provider request", async () => {
  const previous = { ...process.env };
  const original = globalThis.fetch;
  let calls = 0;
  try {
    Object.assign(process.env, env);
    globalThis.fetch = async (url) => {
      calls++;
      if (url === "https://fixture.supabase.co/auth/v1/user")
        return Response.json({ id: "fixture-owner" });
      assert.equal(url, "https://redis.example/");
      return Response.json({ result: 1 });
    };
    const response = await POST(request());
    assert.equal(response.status, 200);
    const raw = await response.text();
    assert.ok(!raw.includes(env.ROOTSYS_API_KEY));
    assert.ok(!raw.includes(env.ROOTSYS_OWNER_ID));
    const result = JSON.parse(raw);
    assert.equal(result.enabled, false);
    assert.equal(result.keyFormatValid, true);
    assert.equal(result.redisVerified, true);
    assert.equal(result.productionBlocked, true);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = original;
    for (const name of Object.keys(env)) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  }
});

test("admin readiness denies production and non-owner access", async () => {
  await assert.rejects(
    guard(request(), "rootsys-admin", {
      env: { ...env, VERCEL_ENV: "production" },
    }),
    (error) => error.status === 503,
  );
  await assert.rejects(
    guard(request(), "rootsys-admin", {
      env,
      fetcher: async () => Response.json({ id: "other-user" }),
    }),
    (error) => error.status === 403,
  );
});
