export function parseRepo(input) {
  const s = String(input || "")
    .trim()
    .replace(/^https:\/\/github\.com\//i, "")
    .replace(/\.git$/, "")
    .replace(/\/$/, "");
  if (
    !/^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9_.-]{1,100}$/.test(s) ||
    s.split("/").some((x) => x === "." || x === "..")
  )
    throw Error("Enter a GitHub owner/repository or repository URL");
  return s;
}
// Restrict branch names to a portable subset of Git refs, never tags or URLs.
export function parseBranch(value) {
  if (value === undefined || value === "") return "";
  if (
    typeof value !== "string" ||
    !/^[A-Za-z0-9._/-]{1,255}$/.test(value) ||
    value.includes("..") ||
    value.startsWith("-") ||
    value
      .split("/")
      .some(
        (part) =>
          !part ||
          part.startsWith(".") ||
          part.endsWith(".") ||
          part.endsWith(".lock"),
      )
  )
    throw Error("Enter a valid branch name.");
  return value;
}
export function inventory(
  meta,
  commit,
  tree,
  manifest,
  branch = meta.default_branch,
) {
  const blobs = (Array.isArray(tree.tree) ? tree.tree : []).filter(
    (x) => x.type === "blob" && typeof x.path === "string",
  );
  const paths = blobs.map((x) => x.path);
  const has = (pattern) => paths.some((x) => pattern.test(x));
  const deps = Object.keys({
    ...manifest?.dependencies,
    ...manifest?.devDependencies,
  })
    .filter((x) => /^[a-zA-Z0-9@/_.-]{1,100}$/.test(x))
    .slice(0, 80);
  const stack = [
    meta.language,
    ...[
      "next",
      "react",
      "vue",
      "vite",
      "express",
      "@supabase/supabase-js",
      "tailwindcss",
      "typescript",
      "prisma",
      "svelte",
      "nuxt",
    ].filter((x) => deps.includes(x)),
    ...(has(/(^|\/)requirements\.txt$|pyproject\.toml$/)
      ? ["Python manifest"]
      : []),
    ...(has(/(^|\/)Cargo\.toml$/) ? ["Rust manifest"] : []),
    ...(has(/(^|\/)go\.mod$/) ? ["Go manifest"] : []),
  ].filter(Boolean);
  const signals = {
    readme: has(/(^|\/)readme(\.|$)/i),
    tests: has(/(^|\/)(tests?|__tests__)\/|\.(test|spec)\.[^.]+$/i),
    ci: has(/^\.github\/workflows\//),
    lockfile: has(
      /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?|uv\.lock|poetry\.lock|Cargo\.lock)$/,
    ),
    envExample: has(/(^|\/)\.env\.example$/),
  };
  const suggestions = Object.entries(signals)
    .filter(([, v]) => !v)
    .map(([k]) => "Review " + k + " coverage; not detected in scanned tree.");
  const counts = {};
  for (const path of paths) {
    const ext = path.includes(".")
      ? path.split(".").pop().toLowerCase()
      : "(none)";
    if (ext.length < 16) counts[ext] = (counts[ext] || 0) + 1;
  }
  return {
    repo: meta.full_name,
    branch,
    sha: commit.sha,
    description: String(meta.description || "").slice(0, 500),
    scannedAt: new Date().toISOString(),
    private: !!meta.private,
    fileCount: blobs.length,
    truncated: !!tree.truncated,
    paths: paths
      .filter(
        (x) =>
          !/(^|\/)(\.env(?:\.|$)|[^/]*\.(pem|key|p12)$)/i.test(x) ||
          x.endsWith(".env.example"),
      )
      .slice(0, 300)
      .map((x) => x.slice(0, 240)),
    stack: [...new Set(stack)],
    dependencies: deps,
    signals,
    suggestions,
    extensions: Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10),
    limitations: [
      "Tree inventory and root package.json only; no source code execution or security scan.",
      "Signals are heuristics, not proof of working tests or deployment.",
      ...(tree.truncated
        ? ["GitHub truncated the tree; counts are partial."]
        : []),
    ],
  };
}
