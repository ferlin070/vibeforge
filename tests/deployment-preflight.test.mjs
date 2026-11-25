import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

function run(env) {
  return spawnSync(process.execPath, ["scripts/verify-redis.mjs"], {
    encoding: "utf8",
    env: { PATH: process.env.PATH || "", ...env },
  });
}

test("production build fails without Redis and Supabase configuration", () => {
  const result = run({ VERCEL_ENV: "production" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /VIBEFORGE_REDIS_SMOKE: FAIL/);
  assert.match(result.stderr, /VIBEFORGE_AUTH_CONFIG: FAIL/);
});

test("preview checks remain opt-in and local builds work without cloud", () => {
  assert.equal(run({}).status, 0);
  assert.equal(run({ VERCEL_ENV: "preview" }).status, 0);
  const optedIn = run({
    VERCEL_ENV: "preview",
    VIBEFORGE_VERIFY_REDIS: "1",
  });
  assert.equal(optedIn.status, 1);
  assert.match(optedIn.stderr, /VIBEFORGE_REDIS_SMOKE: FAIL/);
});
