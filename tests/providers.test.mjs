import test from "node:test";
import assert from "node:assert/strict";
import { providers, validModel } from "../lib/providers.mjs";
import {
  makeRequest,
  extractOutput,
  parseOutput,
} from "../lib/ai-adapters.mjs";
import { starterBlueprint } from "../lib/blueprint.mjs";
import { POST } from "../app/api/blueprint/route.js";
import { rootsysBlueprintPrompt } from "../lib/rootsys-prompt.mjs";
import { rootsysRoutePlan } from "../lib/rootsys-router.mjs";
process.env.NODE_ENV = "development";
delete process.env.VERCEL_ENV;
delete process.env.VIBEFORGE_REQUIRE_AUTH;
const key = "test-key-123456",
  p = { name: "Fixture", idea: "Build a test app" },
  blueprint = starterBlueprint(p),
  str = JSON.stringify(blueprint);
const shapes = {
  openai: {
    status: "completed",
    output: [{ content: [{ type: "output_text", text: str }] }],
  },
  anthropic: {
    stop_reason: "end_turn",
    content: [{ type: "text", text: str }],
  },
  gemini: {
    candidates: [{ finishReason: "STOP", content: { parts: [{ text: str }] } }],
  },
  deepseek: { choices: [{ finish_reason: "stop", message: { content: str } }] },
  openrouter: {
    choices: [{ finish_reason: "stop", message: { content: str } }],
  },
};
const hosts = {
  openai: "api.openai.com",
  anthropic: "api.anthropic.com",
  gemini: "generativelanguage.googleapis.com",
  deepseek: "api.deepseek.com",
  openrouter: "openrouter.ai",
};
const req = (provider, model, k = key) =>
  new Request("http://localhost/api/blueprint", {
    method: "POST",
    headers: { origin: "http://localhost", "x-provider-key": k },
    body: JSON.stringify({ provider, model, project: p }),
  });
for (const provider of providers.filter((x) => !x.custom && !x.managed))
  test(provider.id + " request and response contract", () => {
    const x = makeRequest(
      provider.id,
      provider.example,
      key,
      "instructions",
      "input",
    );
    assert.equal(new URL(x.url).hostname, hosts[provider.id]);
    assert.equal(new URL(x.url).protocol, "https:");
    assert.ok(!x.url.includes(key));
    assert.ok(Object.values(x.headers).some((v) => v.includes(key)));
    assert.deepEqual(
      parseOutput(extractOutput(provider.id, shapes[provider.id])),
      blueprint,
    );
  });
test("reject unknown provider and URL injection", () => {
  assert.throws(() => makeRequest("custom", "x", key, "", ""));
  assert.equal(validModel("gemini", "gemini-a/../../test"), false);
  assert.equal(validModel("openrouter", "https://bad.invalid/x"), false);
  assert.throws(() =>
    extractOutput("deepseek", { choices: [{ finish_reason: "length" }] }),
  );
  assert.throws(() => parseOutput("not JSON"));
});
test("all five providers route through mock fetch and validate response", async () => {
  const original = globalThis.fetch;
  try {
    for (const p of providers.filter((x) => !x.custom && !x.managed)) {
      globalThis.fetch = async (url, opts) => {
        assert.equal(new URL(url).hostname, hosts[p.id]);
        assert.equal(opts.redirect, "error");
        return Response.json(shapes[p.id]);
      };
      const r = await POST(req(p.id, p.example));
      assert.equal(r.status, 200);
      assert.deepEqual((await r.json()).blueprint, blueprint);
      assert.equal(r.headers.get("Cache-Control"), "no-store");
    }
  } finally {
    globalThis.fetch = original;
  }
});
test("bad provider and invalid model never reach network; malformed output rejected", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => {
      throw Error("must not fetch");
    };
    assert.equal((await POST(req("evil", "x"))).status, 400);
    assert.equal(
      (await POST(req("gemini", "https://evil.invalid"))).status,
      400,
    );
    globalThis.fetch = async () =>
      Response.json({
        status: "completed",
        output: [{ content: [{ type: "output_text", text: "{}" }] }],
      });
    assert.equal((await POST(req("openai", "gpt-4.1-mini"))).status, 422);
    globalThis.fetch = async () =>
      new Response("private provider details", { status: 429 });
    const r = await POST(req("openai", "gpt-4.1-mini"));
    assert.equal(r.status, 429);
    assert.ok(!(await r.text()).includes("private provider details"));
  } finally {
    globalThis.fetch = original;
  }
});

test("Rootsys uses fixed gateway and preserves VibeForge instructions", () => {
  const model = "deepseek-v4-flash";
  const spec = makeRequest("rootsys", model, key, "system", "input");
  assert.equal(spec.url, "https://rootsys.cloud/v1/chat/completions");
  assert.equal(spec.headers.Authorization, "Bearer " + key);
  assert.equal(spec.body.messages[0].content, "system");
  assert.equal(spec.body.max_tokens, 8000);
  assert.equal(validModel("rootsys", model + "-mod"), false);
  assert.deepEqual(
    parseOutput(extractOutput("rootsys", shapes.deepseek)),
    blueprint,
  );
});

test("Rootsys owner-only pilot fails closed and never accepts browser keys", async () => {
  const previous = { ...process.env };
  const original = globalThis.fetch;
  const env = {
    VERCEL_ENV: "preview",
    ROOTSYS_ENABLED: "true",
    ROOTSYS_OWNER_ID: "fixture-owner",
    ROOTSYS_API_KEY: key,
    NEXT_PUBLIC_SUPABASE_URL: "https://fixture.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fixture",
    UPSTASH_REDIS_REST_URL: "https://redis.example",
    UPSTASH_REDIS_REST_TOKEN: "fixture-redis-token",
  };
  const request = (headers = {}) =>
    new Request("http://localhost/api/blueprint", {
      method: "POST",
      headers: { origin: "http://localhost", ...headers },
      body: JSON.stringify({
        provider: "rootsys",
        model: "deepseek-v4-flash",
        project: p,
        custom: { baseURL: "https://untrusted.invalid" },
      }),
    });
  const session = { "x-vibeforge-session": "fake.session.token" };
  let owner = "fixture-owner";
  let allowed = 1;
  let calls = 0;
  try {
    Object.assign(process.env, env);
    globalThis.fetch = async (url, opts) => {
      if (url === "https://fixture.supabase.co/auth/v1/user")
        return Response.json({ id: owner });
      if (url === "https://redis.example/") {
        assert.equal(JSON.parse(opts.body)[5], "5");
        return Response.json({ result: allowed });
      }
      assert.equal(url, "https://rootsys.cloud/v1/chat/completions");
      assert.equal(opts.headers.Authorization, "Bearer " + key);
      const body = JSON.parse(opts.body);
      assert.equal(body.model, "deepseek-v4-flash");
      assert.equal(body.messages[0].content, rootsysBlueprintPrompt());
      assert.equal(body.messages[1].role, "user");
      assert.equal(JSON.parse(body.messages[1].content).idea, p.idea);
      assert.equal(opts.redirect, "error");
      calls++;
      return Response.json(shapes.deepseek);
    };
    process.env.ROOTSYS_ENABLED = "false";
    assert.equal((await POST(request(session))).status, 503);
    process.env.ROOTSYS_ENABLED = "true";
    process.env.VERCEL_ENV = "production";
    assert.equal((await POST(request(session))).status, 503);
    process.env.VERCEL_ENV = "preview";
    assert.equal((await POST(request())).status, 401);
    assert.equal(
      (await POST(request({ ...session, "x-provider-key": key }))).status,
      400,
    );
    owner = "other-user";
    assert.equal((await POST(request(session))).status, 403);
    owner = "fixture-owner";
    allowed = 0;
    assert.equal((await POST(request(session))).status, 429);
    assert.equal(calls, 0);
    allowed = 1;
    const result = await POST(request(session));
    assert.equal(result.status, 200);
    const body = await result.text();
    assert.equal(body.includes(key), false);
    assert.deepEqual(JSON.parse(body).blueprint, blueprint);
    assert.deepEqual(JSON.parse(body).routing, rootsysRoutePlan(p));
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = original;
    for (const name of Object.keys(env)) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  }
});
