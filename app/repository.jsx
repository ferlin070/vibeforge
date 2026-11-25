"use client";
import { redactData } from "../lib/redact.mjs";
import { useState } from "react";
export default function Repository({
  project,
  projects,
  selected,
  select,
  update,
  newProject,
  session,
}) {
  const [repo, setRepo] = useState(project?.repository?.repo || ""),
    [branch, setBranch] = useState(project?.repository?.branch || ""),
    [fileSearch, setFileSearch] = useState(""),
    [token, setToken] = useState(""),
    [busy, setBusy] = useState(false),
    [msg, setMsg] = useState("");
  if (!project)
    return (
      <section className="panel">
        <h1>Repository intelligence</h1>
        <p>Create a project to attach a GitHub inventory.</p>
        <button onClick={newProject}>Create project</button>
      </section>
    );
  const result = project.repository;
  const visiblePaths = (result?.paths || []).filter((path) =>
    path.toLowerCase().includes(fileSearch.trim().toLowerCase()),
  );
  const scan = async () => {
    if (!session && process.env.NODE_ENV !== "development") {
      setMsg("Sign in via Cloud account before scanning a repository.");
      return;
    }
    setBusy(true);
    setMsg("Reading repository metadata and tree…");
    try {
      const r = await fetch("/api/repository", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.token ? { "x-vibeforge-session": session.token } : {}),
          ...(token.trim() ? { "x-github-token": token.trim() } : {}),
        },
        body: JSON.stringify({ repo, branch: branch.trim() }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      if (!update({ repository: d.inventory })) {
        setMsg("Replacement cancelled. Existing inventory retained.");
        return;
      }
      setFileSearch("");
      setMsg(
        "Inventory saved locally. Review evidence before generating a blueprint.",
      );
    } catch (e) {
      setMsg(e.message);
    } finally {
      setToken("");
      setBusy(false);
    }
  };
  const download = () => {
    const u = URL.createObjectURL(
      new Blob([JSON.stringify(redactData(result), null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = u;
    a.download = "repository-inventory.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(u), 1000);
  };
  return (
    <>
      <div className="eyebrow">EXISTING PROJECTS</div>
      <h1>GitHub Repository Intelligence</h1>
      <p>
        Read-only repository inventory. No code execution, commits or automatic
        changes.
      </p>
      <section className="panel">
        <label>
          Active project
          <select
            value={selected}
            onChange={(e) => select(e.target.value)}
            disabled={busy}
          >
            {projects.map((p) => (
              <option value={p.id} key={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          GitHub repository
          <input
            placeholder="owner/repository or https://github.com/owner/repository"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            disabled={busy}
          />
        </label>
        <label>
          Branch name (optional)
          <input
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            placeholder="Default branch, or e.g. audit/rc2-phase1"
            maxLength={255}
            disabled={busy}
          />
        </label>
        <small>
          Leave blank for the repository default. The scan resolves an exact branch
          to a commit before reading the tree.
        </small>
        <label>
          Optional GitHub read-only token for private repos
          <input
            type="password"
            autoComplete="off"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            disabled={busy}
          />
        </label>
        <p>
          Use a fine-grained token with read-only Contents access. Tokens are
          not persisted. Inventory may include private file names; saved locally
          and included in cloud snapshots if you save one.
        </p>
        <button onClick={scan} disabled={busy || !repo.trim()}>
          {busy ? "Scanning…" : "Scan repository ↗"}
        </button>
        <p role="status">{msg}</p>
      </section>
      {result && (
        <>
          <div className="stats studioStats">
            {[
              ["Files", result.fileCount],
              ["Stack signals", result.stack.length],
              ["Dependencies", result.dependencies.length],
              ["Tree", result.truncated ? "Partial" : "Complete"],
            ].map(([k, v]) => (
              <article key={k}>
                <small>{k}</small>
                <strong>{v}</strong>
              </article>
            ))}
          </div>
          <section className="panel">
            <h2>{result.repo}</h2>
            <p>{result.description}</p>
            <small>
              {result.branch} · {result.sha} · {result.scannedAt}
            </small>
            <h3>Detected stack</h3>
            <p>{result.stack.join(" · ") || "Unknown"}</p>
            <h3>Readiness signals</h3>
            {Object.entries(result.signals).map(([k, v]) => (
              <p key={k}>
                {v ? "✓" : "○"} {k}: {v ? "Detected" : "Not detected"}
              </p>
            ))}
            <h3>Review recommendations</h3>
            {result.suggestions.map((x) => (
              <p key={x}>{x}</p>
            ))}
            <h3>Scope and limitations</h3>
            {result.limitations.map((x) => (
              <p key={x}>{x}</p>
            ))}
            <button onClick={download}>Export inventory JSON</button>
          </section>
          <section className="panel studioPanel">
            <h2>File inventory</h2>
            <small>
              Up to 300 paths, sensitive filename patterns excluded.
            </small>
            <label>
              Search captured files
              <input
                value={fileSearch}
                onChange={(e) => setFileSearch(e.target.value)}
                placeholder="Search by filename or folder"
              />
            </label>
            <p role="status">{visiblePaths.length} of {result.paths.length} captured paths</p>
            <pre>{visiblePaths.join("\n") || "No matching files."}</pre>
          </section>
        </>
      )}
    </>
  );
}
