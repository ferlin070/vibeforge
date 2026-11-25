import { randomUUID } from "node:crypto";
import { rateLimit, redisConfig } from "../lib/rate-limit.mjs";

const production = process.env.VERCEL_ENV === "production";
const preview =
  process.env.VERCEL_ENV === "preview" &&
  process.env.VIBEFORGE_VERIFY_REDIS === "1";

// Fail closed for production. Preview checks remain opt-in.
// Never print credentials or provider response bodies.
if (production || preview) {
  try {
    if (!redisConfig()) throw Error("Missing Redis configuration.");
    const key =
      (production ? "production" : "staging") + "-smoke:" + randomUUID();
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

if (production) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
  if (
    !/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url) ||
    !key.startsWith("sb_publishable_")
  ) {
    console.error("VIBEFORGE_AUTH_CONFIG: FAIL");
    process.exitCode = 1;
  } else {
    console.log("VIBEFORGE_AUTH_CONFIG: PASS (format only)");
  }
}
