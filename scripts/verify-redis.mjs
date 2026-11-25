import { randomUUID } from "node:crypto";
import { rateLimit, redisConfig } from "../lib/rate-limit.mjs";

// Explicit opt-in, preview only. No secrets or provider response bodies in logs.
if (
  process.env.VERCEL_ENV === "preview" &&
  process.env.VIBEFORGE_VERIFY_REDIS === "1"
) {
  try {
    if (!redisConfig()) throw Error("Missing Redis configuration.");
    const key = "staging-smoke:" + randomUUID();
    const windowMs = 120000;
    const now = Math.floor(Date.now() / windowMs) * windowMs;
    const options = { now, windowMs };
    const first = await rateLimit(key, 1, options);
    const second = await rateLimit(key, 1, options);
    if (!first || second) throw Error("Unexpected rate-limit result.");
    console.log("VIBEFORGE_REDIS_SMOKE: PASS (allow then deny)");
  } catch {
    console.error("VIBEFORGE_REDIS_SMOKE: FAIL");
    process.exitCode = 1;
  }
}
