"use client";
import { redactText, redactData, redactExportText } from "../lib/redact.mjs";
import { useState } from "react";
import CodeReview from "./code-review.jsx";
import { rescuePlan, rescuePrompt } from "../lib/rescue.mjs";
import { debugInvestigation } from "../lib/review-workbench.mjs";
import {
  severities,
  releaseChecks,
  qualityOf,
  analyzeLog,
  addBug,
  changeBug,
  testPlan,
  saveCheck,
  readiness,
  debugPrompt,
} from "../lib/quality.mjs";
export default function Quality({
  project: p,
  projects,
  selected,
  select,
  update,
  newProject,
  session,
}) {
  const [tab, setTab] = useState("Bugs"),
    [title, setTitle] = useState(""),
    [severity, setSeverity] = useState("Medium"),
    [details, setDetails] = useState(""),
    [task, setTask] = useState(""),
    [bugId, setBugId] = useState(""),
    [note, setNote] = useState(""),
    [status, setStatus] = useState("Investigating"),
    [token, setToken] = useState(""),
    [busy, setBusy] = useState(false),
    [check, setCheck] = useState("functional"),
    [checkNote, setCheckNote] = useState(""),
    [rollback, setRollback] = useState(p?.quality?.rollback || ""),
    [msg, setMsg] = useState(""),
    [symptoms, setSymptoms] = useState("");
  if (!p)
    return (
      <section className="panel">
        <h1>Quality Studio</h1>
        <p>Create a project to manage verification.</p>
        <button onClick={newProject}>Create project</button>
      </section>
    );
  const q = qualityOf(p),
    plan = testPlan(p),
    g = readiness(p),
    bug = q.bugs.find((x) => x.id === bugId) || q.bugs[0],
    analysis = analyzeLog(details);
  const save = (fn, onSaved) => {
    try {
      if (!update({ quality: fn() })) {
        setMsg("Change cancelled. Existing release evidence retained.");
        return;
      }
      onSaved?.();
      setMsg("Saved locally.");
    } catch (e) {
      setMsg(e.message);
    }
  };
  const dl = (value, name) => {
    const u = URL.createObjectURL(
      new Blob(
        [
          typeof value === "string"
            ? redactExportText(value)
            : JSON.stringify(redactData(value), null, 2),
        ],
        { type: "text/plain" },
      ),
    );
    const a = document.createElement("a");
    a.href = u;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(u), 1000);
  };
  const importCI = async () => {
    if (!session && process.env.NODE_ENV !== "development") {
      setMsg("Sign in via Cloud account before importing CI results.");
      return;
    }
    if (!p.repository?.sha) return;
    setBusy(true);
    try {
      const r = await fetch("/api/ci", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.token ? { "x-vibeforge-session": session.token } : {}),
          ...(token.trim() ? { "x-github-token": token.trim() } : {}),
        },
        body: JSON.stringify({
          repo: p.repository.repo,
          sha: p.repository.sha,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      update({ quality: { ...q, ci: d.ci } });
      setMsg("CI results imported for scanned commit.");
    } catch (e) {
      setMsg(e.message);
    } finally {
      setToken("");
      setBusy(false);
    }
  };
  return (
    <>
      <div className="eyebrow">VERIFICATION & RELEASE</div>
      <h1>Quality Studio</h1>
      <p>
        Debug, collect evidence and evaluate release gates. No automatic code
        execution or production deployment.
      </p>
      <label className="projectselect">
        Active project
        <select
          value={selected}
          disabled={busy}
          onChange={(e) => select(e.target.value)}
        >
          {projects.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
      </label>
      <div className="stats studioStats">
        {[
          ["Open bugs", q.bugs.filter((b) => b.status !== "Resolved").length],
          ["Test criteria", plan.length],
          [
            "Release gates",
            g.gates.filter((x) => x.ok).length + "/" + g.gates.length,
          ],
          ["CI", g.ciOk ? "Success" : "Unconfirmed"],
        ].map(([k, v]) => (
          <article key={k}>
            <small>{k}</small>
            <strong>{v}</strong>
          </article>
        ))}
      </div>
      <div className="qualitytabs">
        {[
          "Bugs",
          "Code review",
          "Rescue",
          "Test plan",
          "GitHub CI",
          "Release",
        ].map((x) => (
          <button
            disabled={busy}
            key={x}
            className={tab === x ? "" : "ghost"}
            onClick={() => setTab(x)}
          >
            {x}
          </button>
        ))}
      </div>
      {tab === "Rescue" && (
        <section className="panel" aria-label="Project rescue">
          <h2>AI Project Rescue</h2>
          <p>{rescuePlan(p).warning}</p>
          <div className="summary">
            <h3>Recovery priorities</h3>
            {rescuePlan(p).actions.length ? (
              <ol>
                {rescuePlan(p).actions.map((action) => (
                  <li key={action.label}>{action.label}</li>
                ))}
              </ol>
            ) : (
              <p>No missing recorded gates. Verify live evidence separately.</p>
            )}
            <p>
              {rescuePlan(p).blockers.length} critical/high bugs ·{" "}
              {rescuePlan(p).blocked.length} blocked tasks ·{" "}
              {rescuePlan(p).review.length} pending reviews
            </p>
          </div>
          <label>
            Reported symptoms
            <textarea
              aria-label="Reported symptoms"
              rows={5}
              maxLength={5000}
              value={symptoms}
              onChange={(event) => setSymptoms(event.target.value)}
              placeholder="Describe the failure, expected result and last known good version."
            />
          </label>
          <button
            className="ghost"
            disabled={!symptoms.trim()}
            onClick={() => dl(rescuePrompt(p, symptoms), "project-rescue.md")}
          >
            Export rescue investigation
          </button>
          <small>
            Read-only planning for your chosen agent. No automatic changes,
            external AI calls or recovery operations.
          </small>
        </section>
      )}
      {tab === "Bugs" && (
        <>
          <section className="panel">
            <h2>AI Debug Assistant</h2>
            <p>
              Paste a sanitized log or reproduction steps. Pattern matches are
              hypotheses, not confirmed root causes.
            </p>
            <div className="twocol">
              <label>
                Bug title
                <input
                  value={title}
                  maxLength={160}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
              <label>
                Severity
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                >
                  {severities.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Related task
              <select value={task} onChange={(e) => setTask(e.target.value)}>
                <option value="">Unassigned</option>
                {(p.blueprint?.tasks || []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.id} — {t.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Reproduction / error log
              <textarea
                rows={7}
                maxLength={20000}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Expected, actual, stack trace (remove secrets first)."
              />
            </label>
            {details && (
              <div className="summary">
                <h3>Possible investigation paths</h3>
                {analysis.hypotheses.length ? (
                  analysis.hypotheses.map((x) => (
                    <p key={x.category}>
                      {x.category}: {x.next}
                    </p>
                  ))
                ) : (
                  <p>
                    No known pattern matched. Reproduce and inspect evidence.
                  </p>
                )}
                <small>{analysis.warning}</small>
              </div>
            )}
            <button
              className="ghost"
              disabled={!details.trim()}
              onClick={() =>
                dl(
                  debugInvestigation(p, details, task),
                  "debug-investigation.md",
                )
              }
            >
              Export debug investigation
            </button>
            <button
              disabled={!title.trim() || !details.trim()}
              onClick={() =>
                save(
                  () =>
                    addBug(
                      p,
                      { title, severity, details, task },
                      crypto.randomUUID(),
                      new Date().toISOString(),
                    ),
                  () => {
                    setTitle("");
                    setDetails("");
                  },
                )
              }
            >
              Create bug
            </button>
          </section>
          <section className="panel studioPanel">
            <h2>Bug tracker</h2>
            {q.bugs.map((b) => (
              <article className="taskrow" key={b.id}>
                <div>
                  <small>
                    {b.severity} · {b.status}
                  </small>
                  <h3>{b.title}</h3>
                  <p>{b.task || "Unassigned"}</p>
                </div>
                <button
                  className="ghost"
                  onClick={() => {
                    setBugId(b.id);
                    setNote(b.evidence || "");
                    setStatus(b.status);
                  }}
                >
                  Inspect
                </button>
              </article>
            ))}
            {bug && (
              <div className="summary">
                <h3>{bug.title}</h3>
                <pre>{bug.details}</pre>
                <label>
                  Status
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    {["Open", "Investigating", "Resolved"].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Resolution / retest evidence
                  <textarea
                    rows={4}
                    maxLength={3000}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </label>
                <button
                  onClick={() =>
                    save(() =>
                      changeBug(
                        p,
                        bug.id,
                        status,
                        note,
                        new Date().toISOString(),
                      ),
                    )
                  }
                >
                  Save bug status
                </button>
                <button
                  className="ghost"
                  onClick={() => dl(debugPrompt(p, bug), "debug-handoff.md")}
                >
                  Export debugging prompt
                </button>
              </div>
            )}
          </section>
        </>
      )}
      {tab === "Code review" && (
        <CodeReview key={p.id} project={p} exportFile={dl} />
      )}
      {tab === "Test plan" && (
        <section className="panel">
          <h2>Acceptance-driven test plan</h2>
          <p>
            Generated templates from blueprint criteria, not executed tests.
            Security, regression and integration checks require actual tools and
            evidence.
          </p>
          {plan.map((t) => (
            <article className="taskrow" key={t.id}>
              <div>
                <small>{t.id} · Not executed</small>
                <h3>{t.criterion}</h3>
                <p>Expected: {t.expected}</p>
              </div>
            </article>
          ))}
          <button
            disabled={!plan.length}
            onClick={() => dl(plan, "test-plan.json")}
          >
            Export test plan
          </button>
          <button
            className="ghost"
            onClick={() =>
              dl(
                "# Security and code review handoff\n\nInspect repository read-only; evaluate authentication, authorization, input validation, secret storage, dependencies, data isolation and regression risk. Cite actual files and tests. Propose changes before editing.\n\n" +
                  JSON.stringify(
                    {
                      project: p.name,
                      repository: p.repository?.repo,
                      sha: p.repository?.sha,
                      criteria: plan,
                    },
                    null,
                    2,
                  ),
                "security-review.md",
              )
            }
          >
            Export security review prompt
          </button>
        </section>
      )}
      {tab === "GitHub CI" && (
        <section className="panel">
          <h2>GitHub Actions evidence</h2>
          <p>
            Import up to 20 workflow runs for the exact commit recorded in
            GitHub Intelligence. Success means workflow conclusion, not proof
            that every required test ran.
          </p>
          <p>
            {p.repository?.repo || "Scan a repository first"} ·{" "}
            {p.repository?.sha || "No commit"}
          </p>
          <label>
            Optional GitHub token (Actions read-only)
            <input
              type="password"
              autoComplete="off"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={busy}
            />
          </label>
          <button disabled={busy || !p.repository?.sha} onClick={importCI}>
            {busy ? "Importing…" : "Import CI results"}
          </button>
          {q.ci && (
            <>
              <p>
                Imported: {q.ci.fetchedAt} · {q.ci.sha}
              </p>
              {!g.ciMatches && (
                <p>Stale evidence: repository commit has changed.</p>
              )}
              {q.ci.runs.map((r) => (
                <article className="taskrow" key={r.id}>
                  <div>
                    <h3>{r.name}</h3>
                    <small>
                      {r.status} · {r.conclusion || "Pending"}
                    </small>
                  </div>
                  <a href={r.url} target="_blank" rel="noreferrer">
                    View run ↗
                  </a>
                </article>
              ))}
              {!q.ci.runs.length && <p>No matching workflow runs.</p>}
            </>
          )}
        </section>
      )}
      {tab === "Release" && (
        <>
          <section className="panel">
            <h2>Release readiness</h2>
            {g.gates.map((x) => (
              <p key={x.name}>
                {x.ok ? "✓" : "○"} {x.name} —{" "}
                {x.ok ? "Recorded" : "Not satisfied"}
              </p>
            ))}
            <small>
              Advisory only. CI is a snapshot of returned runs, not an
              exhaustive required-check audit. Human evidence is not independent
              verification.
            </small>
            <h3>Manual release checks</h3>
            {releaseChecks.map(([id, name]) => (
              <p key={id}>
                {q.checks[id] ? "✓" : "○"} {name}
              </p>
            ))}
            <label>
              Check
              <select value={check} onChange={(e) => setCheck(e.target.value)}>
                {releaseChecks.map(([id, n]) => (
                  <option key={id} value={id}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Actual evidence
              <textarea
                rows={4}
                maxLength={3000}
                value={checkNote}
                onChange={(e) => setCheckNote(e.target.value)}
              />
            </label>
            <button
              disabled={!checkNote.trim()}
              onClick={() =>
                save(
                  () =>
                    saveCheck(p, check, checkNote, new Date().toISOString()),
                  () => setCheckNote(""),
                )
              }
            >
              Record check
            </button>
          </section>
          <section className="panel studioPanel">
            <h2>Release & rollback plan</h2>
            <label>
              Rollback steps
              <textarea
                rows={7}
                maxLength={4000}
                value={rollback}
                onChange={(e) => setRollback(e.target.value)}
                placeholder="Known-good commit, backup, rollback command, owner, verification and recovery steps."
              />
            </label>
            <button
              onClick={() =>
                save(() => ({ ...q, rollback: redactText(rollback.trim()) }))
              }
            >
              Save rollback plan
            </button>
            <button
              className="ghost"
              onClick={() =>
                dl(
                  {
                    project: p.name,
                    commit: p.repository?.sha,
                    quality: q,
                    readiness: g,
                    testPlan: plan,
                  },
                  "release-evidence.json",
                )
              }
            >
              Export release evidence
            </button>
          </section>
        </>
      )}
      <p role="status">{msg}</p>
    </>
  );
}
