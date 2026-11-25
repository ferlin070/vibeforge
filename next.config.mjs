// Static CSP preserves the prerendered Next.js application shell.
// Next's inline hydration scripts require unsafe-inline until nonce/hash CSP is adopted.
function supabaseOrigin(raw) {
  if (
    typeof raw !== "string" ||
    !/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(raw)
  )
    return "";
  return new URL(raw).origin;
}
const config = {
  poweredByHeader: false,
  async headers() {
    const cloud = supabaseOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL);
    const dev =
      process.env.NODE_ENV === "development" && !process.env.VERCEL_ENV;
    const csp =
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'" + (dev ? " 'unsafe-eval'" : ""),
        "script-src-attr 'none'",
        "style-src 'self' 'unsafe-inline'",
        "connect-src 'self'" + (cloud ? " " + cloud : ""),
        "img-src 'self' data:",
        "font-src 'self'",
        "frame-src 'none'",
        "frame-ancestors 'none'",
        "base-uri 'none'",
        "form-action 'self'",
        "object-src 'none'",
      ].join("; ") + ";";
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};
export default config;
