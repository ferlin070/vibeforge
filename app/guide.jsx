"use client";
export default function Guide({ go, projects, exportAll, clearAll }) {
  const steps = [
    [
      "new",
      "01",
      "Create a project",
      "Define purpose, users and target agent.",
    ],
    [
      "studio",
      "02",
      "Build the blueprint",
      "Use your own API key or start a manual draft. Review and approve.",
    ],
    [
      "repository",
      "03",
      "Inspect existing repository",
      "Import read-only metadata and commit-bound inventory where relevant.",
    ],
    [
      "context",
      "04",
      "Manage context",
      "Capture decisions, checkpoints and export handoff instructions.",
    ],
    [
      "mission",
      "05",
      "Coordinate agents",
      "Assign scoped tasks, send handoffs manually and review evidence.",
    ],
    [
      "quality",
      "06",
      "Verify and release",
      "Track bugs, import CI, record release evidence and plan rollback.",
    ],
  ];
  return (
    <>
      <div className="eyebrow">VIBEFORGE · PRIVATE RELEASE CANDIDATE</div>
      <h1>Start here</h1>
      <p>From idea to production, with human oversight at every stage.</p>
      <section className="panel studioPanel">
        <h2>Choose your starting point</h2>
        <p>
          Start locally without an account or API key. Sign in only when you
          need cloud snapshots or hosted AI and GitHub services. AI generation
          may incur charges on your own provider account.
        </p>
        <div className="actions">
          <button onClick={() => go("new")}>Start a local project</button>
          <button className="ghost" onClick={() => go("cloud")}>
            Set up cloud access
          </button>
        </div>
        <small>
          This private release candidate is not a public production service.
          Export important work and review all generated plans.
        </small>
      </section>
      <div className="tiles guidegrid">
        {steps.map(([id, n, t, d]) => (
          <article key={id}>
            <span className="eyebrow">{n}</span>
            <h3>{t}</h3>
            <p>{d}</p>
            <button className="ghost" onClick={() => go(id)}>
              Open →
            </button>
          </article>
        ))}
      </div>
      <section className="panel studioPanel">
        <h2>Your data and privacy</h2>
        <p>
          Local projects, documents, reports and memory are stored in this
          browser. Cloud backups are optional and saved to the VibeForge
          Supabase project when you request them. Signing out does not erase
          local projects. Use a private browser profile on shared devices.
        </p>
        <p>
          API keys and GitHub tokens are held in the relevant form while in use
          and are not saved by VibeForge to project storage. AI requests send
          your selected project data and key to the chosen provider; GitHub
          requests send the selected repository reference and optional token to
          GitHub. Provider privacy, retention and charges depend on your
          provider agreement. Do not submit secrets in project notes or logs.
        </p>
        <p>
          These are product data-handling notes, not a finalized legal privacy
          policy or terms. The operator must approve formal terms, retention and
          support/contact details before public release.
        </p>
        <div className="actions">
          <button disabled={!projects.length} onClick={exportAll}>
            Export local projects JSON
          </button>
          <button
            className="ghost"
            disabled={!projects.length}
            onClick={clearAll}
          >
            Clear local projects
          </button>
        </div>
        <small>
          Clearing local storage does not delete cloud snapshots or account. Use
          Cloud account to manage saved snapshots.
        </small>
        <button className="ghost" onClick={() => go("cloud")}>
          Cloud account →
        </button>
      </section>
      <section className="panel studioPanel">
        <h2>Safety & limitations</h2>
        <p>
          VibeForge does not execute coding agents, run arbitrary repository
          code, certify test results or deploy user projects automatically.
          Custom gateways require sign-in, public HTTPS and approved hosts in
          hosted deployments. Always verify actual test evidence and obtain
          release approval.
        </p>
      </section>
    </>
  );
}
