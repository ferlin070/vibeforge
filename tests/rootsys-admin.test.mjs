import test from "node:test";
import assert from "node:assert/strict";
import { guard } from "../lib/request-guard.mjs";
import { rootsysAllocation } from "../lib/providers.mjs";
import { POST } from "../app/api/rootsys/admin/route.js";

const env = {
  VERCEL_ENV: "preview",
  ROOTSYS_ENABLED: "false",
  ROOTSYS_DAILY_OUTPUT_BUDGET: "16000",
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
    assert.equal(result.dailyAttempts, 2);
    assert.equal(result.dailyOutputBudget, 16000);
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

test("owner allocation is bounded and rejects invalid configuration", () => {
  assert.equal(rootsysAllocation({}).dailyAttempts, 5);
  for (const value of ["0", "8000", "16000", "24000", "32000", "40000"]) {
    const allocation = rootsysAllocation({
      ROOTSYS_DAILY_OUTPUT_BUDGET: value,
    });
    assert.equal(allocation.dailyAttempts * 8000, Number(value));
  }
  for (const value of ["", "-1", "9000", "40001", "NaN", "4e4"]) {
    assert.equal(
      rootsysAllocation({ ROOTSYS_DAILY_OUTPUT_BUDGET: value }),
      null,
    );
  }
});

test("generation allocation is enforced before provider access", async () => {
  const active = { ...env, ROOTSYS_ENABLED: "true" };
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push(url);
    if (url.includes("supabase.co"))
      return Response.json({ id: "fixture-owner" });
    assert.equal(url, "https://redis.example/");
    assert.equal(JSON.parse(options.body)[5], "2");
    return Response.json({ result: 1 });
  };
  await guard(request(), "rootsys", { env: active, fetcher });
  assert.equal(calls.length, 2);
  for (const [value, status] of [
    ["0", 429],
    ["9000", 503],
  ]) {
    calls.length = 0;
    await assert.rejects(
      guard(request(), "rootsys", {
        env: { ...active, ROOTSYS_DAILY_OUTPUT_BUDGET: value },
        fetcher,
      }),
      (error) => error.status === status,
    );
    assert.equal(calls.length, 1);
  }
});

test("all managed scopes fail closed if distributed limiter fails", async () => {
  const active = { ...env, ROOTSYS_ENABLED: "true" };
  for (const scope of ["rootsys", "rootsys-admin", "rootsys-inspect"]) {
    for (const failure of [
      () => {
        throw Error("Redis unavailable");
      },
      () => new Response("", { status: 503 }),
      () => Response.json({ result: 2 }),
    ]) {
      await assert.rejects(
        guard(request(), scope, {
          env: active,
          fetcher: async (url) => {
            if (url === "https://fixture.supabase.co/auth/v1/user")
              return Response.json({ id: "fixture-owner" });
            assert.equal(url, "https://redis.example/");
            return failure();
          },
        }),
        (error) => error.status === 503,
      );
    }
    await assert.rejects(
      guard(request(), scope, {
        env: {
          ...active,
          UPSTASH_REDIS_REST_URL: "",
          UPSTASH_REDIS_REST_TOKEN: "",
          KV_REST_API_URL: "",
          KV_REST_API_TOKEN: "",
        },
        fetcher: async (url) => {
          assert.equal(url, "https://fixture.supabase.co/auth/v1/user");
          return Response.json({ id: "fixture-owner" });
        },
      }),
      (error) => error.status === 503,
    );
  }
});
