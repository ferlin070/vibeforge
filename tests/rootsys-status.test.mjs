import test from "node:test";
import assert from "node:assert/strict";
import { inspectRootsys, normalizeQuota } from "../lib/rootsys-status.mjs";
import { guard } from "../lib/request-guard.mjs";

test("quota parsing does not invent missing token counts", () => {
  assert.deepEqual(normalizeQuota({ tokens_remaining: 0, tokens_used: -1 }), {
    remaining: 0,
    total: null,
    used: null,
    expiresAt: null,
  });
});

test("inspection calls only read endpoints and filters credential echoes", async () => {
  const key = "fiq-fixture-secret";
  const calls = [];
  const result = await inspectRootsys(key, async (url, options) => {
    calls.push(url);
    assert.equal(options.method, "GET");
    assert.equal(options.redirect, "error");
    assert.equal(options.headers.Authorization, "Bearer " + key);
    return Response.json(
      url.endsWith("/models")
        ? { data: [{ id: key }, { id: "deepseek-v4-flash" }] }
        : { tokens_remaining: 123, key },
    );
  });
  assert.deepEqual(calls, [
    "https://rootsys.cloud/v1/models",
    "https://rootsys.cloud/v1/quota",
  ]);
  assert.deepEqual(result.models, ["deepseek-v4-flash"]);
  assert.equal(result.pilotAvailable, true);
  assert.equal(result.quota.remaining, 123);
  assert.ok(!JSON.stringify(result).includes(key));
});

test("inspection is disabled in production and without activation", async () => {
  const request = new Request("https://app.example/api/rootsys/status", {
    method: "POST",
    headers: { origin: "https://app.example" },
  });
  for (const env of [
    { VERCEL_ENV: "production", ROOTSYS_ENABLED: "true" },
    { VERCEL_ENV: "preview", ROOTSYS_ENABLED: "false" },
  ]) {
    await assert.rejects(
      guard(request, "rootsys-inspect", { env }),
      (error) => error.status === 503,
    );
  }
});

test("ambiguous quota units and timezone-free expiry stay unknown", () => {
  assert.deepEqual(
    normalizeQuota({
      remaining: 100,
      total: 200,
      used: 100,
      expires_at: "2026-12-01T00:00:00",
    }),
    { remaining: null, total: null, used: null, expiresAt: null },
  );
});
