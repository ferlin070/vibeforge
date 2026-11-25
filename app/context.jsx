"use client";
import { redactExportText } from "../lib/redact.mjs";
import { useState } from "react";
import {
  agents,
  categories,
  memoryOf,
  versionsOf,
  newMemory,
  checkpoint,
  compareContext,
  resume,
  agentPrompt,
  agentFiles,
} from "../lib/context.mjs";
import { makeZip } from "../lib/zip.mjs";
export default function ContextManager({
  project: p,
  projects,
  selected,
  select,
  update,
  newProject,
}) {
  const [category, setCategory] = useState("Decision"),
    [title, setTitle] = useState(""),
    [body, setBody] = useState(""),
    [label, setLabel] = useState(""),
    [version, setVersion] = useState(""),
    [agent, setAgent] = useState(
      agents.includes(p?.agent) ? p.agent : "Universal",
    ),
    [mode, setMode] = useState("Resume"),
    [task, setTask] = useState(""),
    [msg, setMsg] = useState("");
  if (!p)
    return (
      <section className="panel">
        <h1>Context manager</h1>
        <p>Create a project before saving memory.</p>
        <button onClick={newProject}>Create project</button>
      </section>
    );
  const memory = memoryOf(p),
    versions = versionsOf(p),
    r = resume(p),
    v = versions.find((x) => x.id === version),
    diff = v ? compareContext(p, v) : null;
  const prompt = agentPrompt(p, agent, mode, task);
  const handle = (fn) => {
    try {
      fn();
      setMsg("Saved locally. Cloud snapshots remain manual.");
    } catch (e) {
      setMsg(e.message);
    }
  };
  const dl = (data, name, type) => {
    const u = URL.createObjectURL(new Blob([redactExportText(data)], { type }));
    const a = document.createElement("a");
    a.href = u;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(u), 1000);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setMsg("Copied agent handoff.");
    } catch {
      setMsg("Clipboard unavailable. Export instead.");
    }
  };
  return (
    <>
      <div className="eyebrow">CONTEXT ENGINEERING</div>
      <h1>Project memory & handoff</h1>
      <p>
        Keep decisions, evidence and context consistent across coding agents.
        Never include credentials in memory or exports.
      </p>
      <label className="projectselect">
        Active project
        <select value={selected} onChange={(e) => select(e.target.value)}>
          {projects.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
      </label>
      <div className="stats studioStats">
        {[
          ["Memory", memory.length],
          ["Checkpoints", versions.length + "/3"],
          ["Ready tasks", r.ready.length],
          ["Reviewed", r.reviewed.length],
        ].map(([k, v]) => (
          <article key={k}>
            <small>{k}</small>
            <strong>{v}</strong>
          </article>
        ))}
      </div>
      <section className="panel">
        <div className="eyebrow">RESUME DEVELOPMENT</div>
        <h2>{r.next}</h2>
        <p>
          {r.approved ? "Blueprint approved" : "Blueprint requires approval"} ·{" "}
          {r.blocked.length} blocked tasks
        </p>
        {r.ready.map((t) => (
          <article className="taskrow" key={t.id}>
            <div>
              <small>
                {t.id} · {t.status}
              </small>
              <h3>{t.title}</h3>
            </div>
            <button
              className="ghost"
              onClick={() => {
                setTask(t.id);
                setMode(t.status === "Ready" ? "Build" : "Resume");
              }}
            >
              Prepare handoff
            </button>
          </article>
        ))}
        {r.blockers.map((x) => (
          <p key={x.id}>
            Blocker: {x.title} — {x.body}
          </p>
        ))}
      </section>
      <section className="panel studioPanel">
        <h2>Project memory</h2>
        <p>
          Record decisions, constraints, knowledge and blockers. Changes
          conservatively reopen blueprint approval and clear task reviews.
        </p>
        <div className="twocol">
          <label>
            Category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Title
            <input
              maxLength={160}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
        </div>
        <label>
          Note
          <textarea
            rows={4}
            maxLength={2400}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Decision, reason, evidence or blocker. No secrets."
          />
        </label>
        <button
          disabled={!title.trim() || !body.trim()}
          onClick={() => {
            if (
              p.blueprintApproved &&
              !confirm("Reopen approval and clear task reviews?")
            )
              return;
            handle(() => {
              update(
                newMemory(
                  p,
                  { category, title, body },
                  crypto.randomUUID(),
                  new Date().toISOString(),
                ),
              );
              setTitle("");
              setBody("");
            });
          }}
        >
          Add memory entry
        </button>
        {memory.map((m) => (
          <article className="taskrow" key={m.id}>
            <div>
              <small>
                {m.category} · {m.createdAt.slice(0, 10)}
              </small>
              <h3>{m.title}</h3>
              <p>{m.body}</p>
            </div>
            <button
              className="ghost"
              onClick={() => {
                if (confirm("Remove memory entry and reopen approval?"))
                  handle(() =>
                    update({
                      memory: memory.filter((x) => x.id !== m.id),
                      blueprintApproved: false,
                      evidence: {},
                    }),
                  );
              }}
            >
              Remove
            </button>
          </article>
        ))}
      </section>
      <section className="panel studioPanel">
        <h2>Context versions</h2>
        <p>
          Capture a read-only checkpoint of the specification, memory and review
          evidence. Compare it with the current state; no automatic restore. Up
          to three checkpoints per project.
        </p>
        <label>
          Checkpoint name
          <input
            maxLength={100}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. MVP scope approved"
          />
        </label>
        <button
          disabled={versions.length >= 3}
          onClick={() =>
            handle(() => {
              const id = crypto.randomUUID();
              update({
                contextVersions: checkpoint(
                  p,
                  label,
                  id,
                  new Date().toISOString(),
                ),
              });
              setVersion(id);
              setLabel("");
            })
          }
        >
          Save checkpoint
        </button>
        {versions.map((x) => (
          <article className="taskrow" key={x.id}>
            <div>
              <h3>{x.label}</h3>
              <small>{x.createdAt}</small>
            </div>
            <button className="ghost" onClick={() => setVersion(x.id)}>
              Compare
            </button>
            <button
              className="ghost"
              onClick={() =>
                dl(
                  JSON.stringify(x, null, 2),
                  "context-checkpoint.json",
                  "application/json",
                )
              }
            >
              Export
            </button>
            <button
              className="ghost"
              onClick={() => {
                if (confirm("Remove saved checkpoint?"))
                  handle(() =>
                    update({
                      contextVersions: versions.filter((y) => y.id !== x.id),
                    }),
                  );
              }}
            >
              Remove
            </button>
          </article>
        ))}
        {diff && (
          <div className="summary">
            <h3>Changes since {v.label}</h3>
            <p>Documents: {diff.documents.join(", ") || "None"}</p>
            <p>Context areas: {diff.areas.join(", ") || "None"}</p>
            <p>Changed tasks: {diff.changedTasks.join(", ") || "None"}</p>
            <p>
              Potentially affected tasks (conservative):{" "}
              {diff.affectedTasks.join(", ") || "None"}
            </p>
            <p>Review evidence changed: {diff.reviewChanged ? "Yes" : "No"}</p>
          </div>
        )}
      </section>
      <section className="panel studioPanel">
        <h2>Agent-specific handoff</h2>
        <p>
          Deterministic prompt from project context, not generated AI output.
          Review before sharing. Exports may include private project data.
        </p>
        <div className="twocol">
          <label>
            Target agent
            <select value={agent} onChange={(e) => setAgent(e.target.value)}>
              {agents.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>
          <label>
            Mode
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              {["Resume", "Plan", "Build", "Debug", "Audit"].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Task
          <select value={task} onChange={(e) => setTask(e.target.value)}>
            <option value="">No task selected</option>
            {(p.blueprint?.tasks || []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.id} — {t.title}
              </option>
            ))}
          </select>
        </label>
        <textarea
          readOnly
          className="editor"
          rows={14}
          value={prompt}
          aria-label="Agent handoff prompt"
        />
        <button onClick={copy}>Copy handoff</button>
        <button
          className="ghost"
          onClick={() => dl(prompt, "agent-handoff.md", "text/markdown")}
        >
          Export prompt
        </button>
        <button
          className="ghost"
          onClick={() =>
            dl(
              makeZip({ ...agentFiles(p), "HANDOFF.md": prompt }),
              "vibeforge-agent-context.zip",
              "application/zip",
            )
          }
        >
          Export agent context ZIP
        </button>
      </section>
      <p role="status">{msg}</p>
    </>
  );
}
