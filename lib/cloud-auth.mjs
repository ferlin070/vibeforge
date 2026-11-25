const base = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const pub = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
export const cloudConfigured =
  /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(base) &&
  pub.startsWith("sb_publishable_");
const tokenOK = (v) =>
  typeof v === "string" &&
  v.length > 0 &&
  v.length <= 8192 &&
  /^[A-Za-z0-9_.-]+$/.test(v);
export function sessionFrom(d, now = Date.now()) {
  if (
    !tokenOK(d?.access_token) ||
    !tokenOK(d?.refresh_token) ||
    typeof d.user?.id !== "string" ||
    !d.user.id ||
    typeof d.user?.email !== "string" ||
    !Number.isFinite(Number(d.expires_in)) ||
    Number(d.expires_in) <= 0
  )
    throw Error("Invalid cloud session.");
  return {
    token: d.access_token,
    refreshToken: d.refresh_token,
    id: d.user.id,
    email: d.user.email,
    expiresAt: now + Math.min(Number(d.expires_in), 86400) * 1000,
  };
}
export async function cloudRequest(path, opts = {}, token = "") {
  if (!cloudConfigured) throw Error("Cloud is not configured.");
  const res = await fetch(base + path, {
    ...opts,
    headers: {
      apikey: pub,
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
      ...opts.headers,
    },
    cache: "no-store",
    redirect: "error",
    signal: opts.signal || AbortSignal.timeout(15000),
  });
  if (!res.ok)
    throw Error(
      "Cloud request failed (" +
        res.status +
        "). Check configuration or sign in again.",
    );
  const data = await res.text();
  return data ? JSON.parse(data) : null;
}
export async function refreshSession(s, request = cloudRequest) {
  const d = await request("/auth/v1/token?grant_type=refresh_token", {
    method: "POST",
    body: JSON.stringify({ refresh_token: s.refreshToken }),
  });
  const next = sessionFrom(d);
  if (next.id !== s.id) throw Error("Session identity changed.");
  return next;
}
export function recoveryFromFragment(hash) {
  const p = new URLSearchParams(hash.replace(/^#/, ""));
  const recognized =
    p.has("access_token") ||
    p.has("refresh_token") ||
    p.has("error_description") ||
    p.has("error_code");
  return {
    recognized,
    token:
      p.get("type") === "recovery" && tokenOK(p.get("access_token"))
        ? p.get("access_token")
        : null,
  };
}
// Email links must return to the exact configured application root.
export function authRedirect(
  origin,
  allowlist = process.env.NEXT_PUBLIC_VIBEFORGE_AUTH_REDIRECT_URLS || "",
) {
  function root(value) {
    try {
      const u = new URL(value);
      if (
        u.username ||
        u.password ||
        u.search ||
        u.hash ||
        u.pathname !== "/" ||
        (u.protocol !== "https:" &&
          !(
            u.protocol === "http:" &&
            ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname)
          ))
      )
        return null;
      return u.origin + "/";
    } catch {
      return null;
    }
  }
  const target = root(origin);
  const approved = String(allowlist)
    .split(",")
    .map((value) => root(value.trim()))
    .filter(Boolean);
  if (!target || !approved.includes(target))
    throw Error("Email authentication links are not configured for this site.");
  return target;
}
export function emailAuthPath(kind, origin, allowlist) {
  if (!["signup", "recover", "resend"].includes(kind))
    throw Error("Invalid email authentication operation.");
  return (
    "/auth/v1/" +
    kind +
    "?redirect_to=" +
    encodeURIComponent(authRedirect(origin, allowlist))
  );
}
export async function requestAccountEmail(
  kind,
  email,
  redirect,
  request = cloudRequest,
  allowlist,
) {
  if (
    !["recover", "resend"].includes(kind) ||
    typeof email !== "string" ||
    !email.includes("@") ||
    email.length > 254
  )
    throw Error("Enter a valid email.");
  const path = emailAuthPath(kind, redirect, allowlist);
  await request(path, {
    method: "POST",
    body: JSON.stringify(
      kind === "resend" ? { email, type: "signup" } : { email },
    ),
  });
}
export async function resetRecoveredPassword(
  token,
  password,
  request = cloudRequest,
) {
  if (
    !tokenOK(token) ||
    typeof password !== "string" ||
    password.length < 8 ||
    password.length > 128
  )
    throw Error("Enter a valid new password.");
  await request("/auth/v1/user", {}, token);
  await request(
    "/auth/v1/user",
    { method: "PUT", body: JSON.stringify({ password }) },
    token,
  );
}
