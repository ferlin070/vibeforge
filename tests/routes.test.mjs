import test from "node:test";
import assert from "node:assert/strict";
import { POST as blueprint } from "../app/api/blueprint/route.js";
import { POST as repository } from "../app/api/repository/route.js";
import { POST as ci } from "../app/api/ci/route.js";
import { starterBlueprint } from "../lib/blueprint.mjs";
import { sameOrigin, guard } from "../lib/request-guard.mjs";
import {
  createMemoryLimiter,
  rateLimit,
  redisConfig,
} from "../lib/rate-limit.mjs";
const sha = "a".repeat(40),
  key = "test-provider-secret-987654",
  project = { name: "Fixture", idea: "Build a website" },
  body = { provider: "openai", model: "gpt-4.1-mini", project },
  repoBody = { repo: "owner/repo", sha };
const origin = "https://app.example",
  token = "fake.session.token";
const request = (path, data, headers = {}) =>
  new Request(origin + "/api/" + path, {
    method: "POST",
    headers: { origin, "x-provider-key": key, ...headers },
    body: typeof data === "string" ? data : JSON.stringify(data),
  });
process.env.NODE_ENV = "production";
process.env.VERCEL_ENV = "preview";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fixture.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_fixture";
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;
delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;
let count = 0;
const mock = async (fn, work) => {
  const old = globalThis.fetch;
  try {
    globalThis.fetch = fn;
    return await work();
  } finally {
    globalThis.fetch = old;
  }
};
const authed = (fn) =>
  mock(
    async (url, opts) => {
      if (new URL(url).hostname === "fixture.supabase.co") {
        assert.equal(opts.headers.Authorization, "Bearer " + token);
        return Response.json({ id: "fixture-" + count });
      }
      return fn(url, opts);
    },
    async () => {
      count++;
      return runAuthenticated();
    },
  );
let runAuthenticated;
test("all hosted routes reject cross-origin and missing/invalid sessions", async () => {
  await mock(
    async () => {
      throw Error("Network must not be reached");
    },
    async () => {
      for (const [name, handler, payload] of [
        ["blueprint", blueprint, body],
        ["repository", repository, repoBody],
        ["ci", ci, repoBody],
      ]) {
        assert.equal(
          (
            await handler(
              request(name, payload, { origin: "https://evil.example" }),
            )
          ).status,
          403,
        );
        assert.equal((await handler(request(name, payload))).status, 401);
        assert.equal(
          (
            await handler(
              request(name, payload, { "x-vibeforge-session": "bad" }),
            )
          ).status,
          401,
        );
      }
    },
  );
  await mock(
    async () => new Response("", { status: 401 }),
    async () => {
      assert.equal(
        (await ci(request("ci", repoBody, { "x-vibeforge-session": token })))
          .status,
        401,
      );
    },
  );
});
test("originless state-changing request needs session header", () => {
  const r = (h) =>
    new Request(origin + "/api/ci", { method: "POST", headers: h });
  assert.equal(sameOrigin(r({})), false);
  assert.equal(sameOrigin(r({ "x-vibeforge-session": token })), true);
  assert.equal(sameOrigin(r({ "sec-fetch-site": "same-origin" })), true);
  assert.equal(
    sameOrigin(
      r({ "sec-fetch-site": "same-site", "x-vibeforge-session": token }),
    ),
    false,
  );
});
test("oversized payload and invalid repo rejected before network", async () => {
  await mock(
    async () => {
      throw Error("Unexpected fetch");
    },
    async () => {
      assert.equal(
        (await blueprint(request("blueprint", "x".repeat(24001)))).status,
        413,
      );
      for (const [name, h] of [
        ["ci", ci],
        ["repository", repository],
      ]) {
        assert.equal((await h(request(name, "x".repeat(4001)))).status, 413);
        assert.equal(
          (await h(request(name, { repo: "https://evil.invalid", sha })))
            .status,
          400,
        );
      }
    },
  );
});
test("GitHub 403 rate limit returns 429 with reset and no retry", async () => {
  for (const [name, h] of [
    ["repository", repository],
    ["ci", ci],
  ]) {
    let calls = 0;
    runAuthenticated = async () => {
      const r = await h(
        request(name, repoBody, { "x-vibeforge-session": token }),
      );
      assert.equal(r.status, 429);
      const v = await r.text();
      assert.match(v, /60\/hour/);
      assert.match(v, /2027-/);
      assert.equal(calls, 1);
    };
    await authed(async () => {
      calls++;
      return new Response("private details", {
        status: 403,
        headers: {
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset": "1798761600",
        },
      });
    });
  }
});
test("successful authenticated repository and CI import", async () => {
  runAuthenticated = async () => {
    let r = await repository(
      request("repository", repoBody, {
        "x-vibeforge-session": token,
        "x-github-token": "fake_github_token",
      }),
    );
    assert.equal(r.status, 200);
    assert.equal((await r.json()).inventory.sha, sha);
    r = await ci(
      request("ci", repoBody, {
        "x-vibeforge-session": token,
        "x-github-token": "fake_github_token",
      }),
    );
    assert.equal(r.status, 200);
    assert.equal((await r.json()).ci.runs.length, 1);
  };
  await authed(async (url) => {
    const u = new URL(url);
    assert.equal(u.hostname, "api.github.com");
    if (u.pathname.endsWith("/actions/runs"))
      return Response.json({
        workflow_runs: [
          { id: 1, head_sha: sha, status: "completed", conclusion: "success" },
        ],
      });
    if (u.pathname.includes("/commits/"))
      return Response.json({ sha, commit: { tree: { sha } } });
    if (u.pathname.includes("/git/trees/")) return Response.json({ tree: [] });
    if (u.pathname.includes("/contents/"))
      return new Response("", { status: 404 });
    return Response.json({ full_name: "owner/repo", default_branch: "main" });
  });
});
test("provider key never returned, including upstream echo in valid blueprint", async () => {
  for (const mode of ["success", "error", "echo"]) {
    runAuthenticated = async () => {
      const r = await blueprint(
        request("blueprint", body, { "x-vibeforge-session": token }),
      );
      assert.equal(
        r.status,
        mode === "success" ? 200 : mode === "error" ? 502 : 422,
      );
      assert.ok(!(await r.text()).includes(key));
    };
    await authed(async (url) => {
      assert.equal(new URL(url).hostname, "api.openai.com");
      if (mode === "error") return new Response(key, { status: 400 });
      const b = starterBlueprint(project);
      if (mode === "echo") b.documents.brief += key;
      return Response.json({
        status: "completed",
        output: [
          { content: [{ type: "output_text", text: JSON.stringify(b) }] },
        ],
      });
    });
  }
});
test("anonymous GitHub quota is shared per account and fails closed", async () => {
  const env = {
    VERCEL_ENV: "preview",
    NEXT_PUBLIC_SUPABASE_URL: "https://fixture.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fixture",
  };
  const req = request("ci", repoBody, { "x-vibeforge-session": token });
  const fetcher = async () => Response.json({ id: "anonymous-quota-fixture" });
  await guard(req, "repository", { env, fetcher });
  await guard(req, "ci", { env, fetcher });
  await assert.rejects(
    guard(req, "ci", { env, fetcher }),
    (e) => e.status === 429 && e.message.includes("read-only"),
  );
  await guard(req, "ci", { env, fetcher, githubToken: true });
});
test("memory bucket cap fails closed and expires", () => {
  const take = createMemoryLimiter(2);
  assert.equal(take("a", 2, 1000, 100), true);
  assert.equal(take("b", 2, 1000, 100), true);
  assert.equal(take("c", 2, 1000, 100), false);
  assert.equal(take("c", 2, 1101, 100), true);
});
test("optional REST rate limiter uses atomic EVAL and denies failures", async () => {
  const env = {
    UPSTASH_REDIS_REST_URL: "https://redis.example",
    UPSTASH_REDIS_REST_TOKEN: "fixture-token",
  };
  for (const result of [1, 0])
    assert.equal(
      await rateLimit("user", 2, {
        env,
        now: 1000,
        fetcher: async (url, opts) => {
          assert.equal(new URL(url).hostname, "redis.example");
          assert.equal(opts.headers.Authorization, "Bearer fixture-token");
          assert.equal(opts.redirect, "error");
          const args = JSON.parse(opts.body);
          assert.equal(args[0], "EVAL");
          assert.equal(args[2], "2");
          assert.equal(args[5], "2");
          assert.equal(args[6], "2000");
          return Response.json({ result });
        },
      }),
      !!result,
    );
  await assert.rejects(
    rateLimit("user", 2, {
      env,
      fetcher: async () => new Response("", { status: 503 }),
    }),
  );
  await assert.rejects(
    rateLimit("user", 2, {
      env: { UPSTASH_REDIS_REST_URL: "https://redis.example" },
    }),
  );
});

test("distributed limiter is mandatory only in Vercel production", async () => {
  await assert.rejects(
    rateLimit("rc3-production", 2, { env: { VERCEL_ENV: "production" } }),
    /required/,
  );
  assert.equal(
    await rateLimit("rc3-preview", 2, { env: { VERCEL_ENV: "preview" } }),
    true,
  );
});

test("Vercel KV REST credentials use the same atomic limiter", async () => {
  const env = {
    VERCEL_ENV: "production",
    KV_REST_API_URL: "https://kv.example",
    KV_REST_API_TOKEN: "fixture-write-token",
    KV_REST_API_READ_ONLY_TOKEN: "fixture-read-only-token",
  };
  let calls = 0;
  for (const result of [1, 0]) {
    assert.equal(
      await rateLimit("kv-fixture", 1, {
        env,
        fetcher: async (url, opts) => {
          calls++;
          assert.equal(url, "https://kv.example/");
          assert.equal(opts.headers.Authorization, "Bearer fixture-write-token");
          assert.equal(JSON.parse(opts.body)[0], "EVAL");
          return Response.json({ result });
        },
      }),
      result === 1,
    );
  }
  assert.equal(calls, 2);
});

test("REST config selects complete pairs and refuses mixed credentials", () => {
  const kv = {
    KV_REST_API_URL: "https://kv.example",
    KV_REST_API_TOKEN: "kv-token",
  };
  assert.deepEqual(redisConfig(kv), {
    url: "https://kv.example",
    token: "kv-token",
  });
  assert.deepEqual(
    redisConfig({
      ...kv,
      UPSTASH_REDIS_REST_URL: "https://explicit.example",
      UPSTASH_REDIS_REST_TOKEN: "explicit-token",
    }),
    { url: "https://explicit.example", token: "explicit-token" },
  );
  const partialExplicit = {
    ...kv,
    UPSTASH_REDIS_REST_URL: "https://other.example",
  };
  const mixed = {
    UPSTASH_REDIS_REST_URL: "https://other.example",
    KV_REST_API_TOKEN: "kv-token",
  };
  const partialKV = { KV_REST_API_URL: "https://kv.example" };
  for (const env of [partialExplicit, mixed, partialKV]) {
    assert.throws(() => redisConfig(env), /Incomplete/);
  }
  const readOnly = { KV_REST_API_READ_ONLY_TOKEN: "read-only-token" };
  assert.equal(redisConfig(readOnly), null);
});
