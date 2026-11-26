import { rateLimit, redisConfig } from "./rate-limit.mjs";
export { consumeLimit } from "./rate-limit.mjs";
export class RequestError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}
export async function boundedText(message, max) {
  const declared = Number(message.headers.get("content-length") || 0);
  if (declared > max) throw new RequestError("Payload too large", 413);
  if (!message.body) return "";
  const reader = message.body.getReader(),
    decoder = new TextDecoder();
  let size = 0,
    out = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) {
        await reader.cancel();
        throw new RequestError("Payload too large", 413);
      }
      out += decoder.decode(value, { stream: true });
    }
    return out + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}
export async function boundedJSON(message, max) {
  return JSON.parse(await boundedText(message, max));
}
export function sameOrigin(req) {
  const site = req.headers.get("sec-fetch-site"),
    origin = req.headers.get("origin");
  if (site === "cross-site" || site === "same-site") return false;
  if (origin) {
    try {
      const caller = new URL(origin);
      const target = new URL(req.url);
      if (caller.origin === target.origin) return true;
      // Next.js can canonicalize a loopback request URL to localhost.
      // Only accept the actual Host for an equivalent local loopback origin.
      // Never use forwarded host headers or relax hosted origin checks.
      const loopback = (hostname) =>
        ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
      return (
        loopback(caller.hostname) &&
        loopback(target.hostname) &&
        caller.protocol === target.protocol &&
        caller.port === target.port &&
        caller.host === req.headers.get("host")
      );
    } catch {
      return false;
    }
  }
  if (site === "same-origin") return true;
  return !!req.headers.get("x-vibeforge-session");
}
export function allowedCustomHost(url, allowlist) {
  const hostname = new URL(url).hostname;
  return String(allowlist || "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean)
    .includes(hostname);
}
export async function guard(
  req,
  scope,
  {
    custom = false,
    url = "",
    githubToken = false,
    env = process.env,
    fetcher = fetch,
  } = {},
) {
  if (!sameOrigin(req))
    throw new RequestError("Cross-origin request blocked.", 403);
  const production =
    env.VERCEL_ENV === "production" || env.VIBEFORGE_REQUIRE_AUTH === "1";
  const localDev =
    env.NODE_ENV === "development" &&
    env.VERCEL_ENV === undefined &&
    !production;
  if (
    custom &&
    (production || env.VERCEL_ENV !== undefined) &&
    !allowedCustomHost(url, env.VIBEFORGE_CUSTOM_HOSTS)
  )
    throw new RequestError(
      "Custom gateway host is not approved for this deployment. Contact the deployment administrator.",
      403,
    );
  const managed = scope === "rootsys";
  if (managed && (env.VERCEL_ENV !== "preview" || env.ROOTSYS_ENABLED !== "true"))
    throw new RequestError("Managed Rootsys pilot is disabled.", 503);
  if (localDev && !custom && !managed) return;
  const token = req.headers.get("x-vibeforge-session") || "";
  if (
    !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token) ||
    token.length > 8192
  )
    throw new RequestError(
      "Sign in via Cloud account before using this service.",
      401,
    );
  const base = env.NEXT_PUBLIC_SUPABASE_URL || "",
    key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
  if (
    !/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(base) ||
    !key.startsWith("sb_publishable_")
  )
    throw new RequestError("Cloud authentication is not configured.", 503);
  let user;
  try {
    const res = await fetcher(base + "/auth/v1/user", {
      headers: { apikey: key, Authorization: "Bearer " + token },
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (res.status === 401 || res.status === 403)
      throw new RequestError("Session expired or invalid. Sign in again.", 401);
    if (!res.ok) throw Error();
    user = await boundedJSON(res, 100000);
  } catch (e) {
    if (e instanceof RequestError) throw e;
    throw new RequestError("Unable to verify account.", 503);
  }
  if (typeof user.id !== "string" || !user.id || user.is_anonymous === true)
    throw new RequestError("Verified account required.", 401);
  if (managed && (!env.ROOTSYS_OWNER_ID || user.id !== env.ROOTSYS_OWNER_ID))
    throw new RequestError("Managed Rootsys pilot is restricted.", 403);
  const anonymousGitHub =
    (scope === "repository" || scope === "ci") && !githubToken;
  let allowed;
  try {
    if (managed && !redisConfig(env)) throw Error("Redis required");
    allowed = await rateLimit(
      (anonymousGitHub ? "github-anon" : scope) + ":" + user.id,
      anonymousGitHub ? 2 : scope === "blueprint" ? 6 : managed ? 5 : 12,
      { env, fetcher, ...(managed ? { windowMs: 86400000 } : {}) },
    );
  } catch {
    throw new RequestError("Rate limiter unavailable. Try again later.", 503);
  }
  if (!allowed)
    throw new RequestError(
      anonymousGitHub
        ? "GitHub anonymous request limit reached. Shared GitHub unauthenticated quota is 60 requests/hour per IP; use your own read-only GitHub token or try again in a minute."
        : "Request limit or rate-limit bucket capacity reached. Try again in a minute.",
      429,
    );
}
