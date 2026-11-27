"use client";
import { useState } from "react";
import RootsysTask from "./rootsys-task.jsx";
import { taskPlanContext } from "../lib/rootsys-task.mjs";
import { agents } from "../lib/context.mjs";
import { localHandoffFiles } from "../lib/local-handoff.mjs";
import { reviewLocalReceipt } from "../lib/local-runner.mjs";
import { makeZip } from "../lib/zip.mjs";
import {
  roles,
  missionBoard,
  assignTask,
  handoffTask,
  missionPrompt,
  submitMissionReport,
  reviewMission,
} from "../lib/mission.mjs";
export default function Mission({
  project: p,
  projects,
  selected,
  select,
  update,
  newProject,
  openStudio,
  session,
}) {
  const [filter, setFilter] = useState("All"),
    [taskId, setTaskId] = useState(""),
    [choice, setChoice] = useState({}),
    [report, setReport] = useState(""),
    [receipt, setReceipt] = useState(""),
    [msg, setMsg] = useState("");
  if (!p)
    return (
      <section className="panel">
        <h1>Mission Control</h1>
        <p>Create a project to coordinate your coding agents.</p>
        <button onClick={newProject}>Create project</button>
      </section>
    );
  const board = missionBoard(p),
    t = board.find((x) => x.id === taskId) || board[0],
    selectedRole =
      choice[t?.id]?.role || t?.assignment?.role || t?.suggestedRole || "pm",
    selectedAgent =
      choice[t?.id]?.agent ||
      t?.assignment?.agent ||
      (agents.includes(p.agent) ? p.agent : "Universal");
  const run = (fn) => {
    try {
      if (!update(fn())) {
        setMsg("Change not saved. Existing work retained.");
        return;
      }
      setMsg("Saved locally.");
    } catch (e) {
      setMsg(e.message);
    }
  };
  const now = () => new Date().toISOString();
  const actionable =
    t && ["Ready", "Assigned", "Handed off"].includes(t.status);
  const currentReport = p.evidence?.[t?.id]?.report;
  let aiContext = null;
  if (session && t?.status === "Assigned") {
    try {
      aiContext = taskPlanContext(p, t.id);
    } catch {
      // Oversized or invalid tasks remain available for manual handoff.
    }
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(missionPrompt(p, t.id));
      setMsg(
        "Handoff copied. Paste into your coding agent. Record handoff only after sending it.",
      );
    } catch (e) {
      setMsg(e.message);
    }
  };
  const savePrompt = () => {
    try {
      const u = URL.createObjectURL(
        new Blob([missionPrompt(p, t.id)], { type: "text/markdown" }),
      );
      const a = document.createElement("a");
      a.href = u;
      a.download = t.id + "-mission.md";
      a.click();
      setTimeout(() => URL.revokeObjectURL(u), 1000);
      setMsg("Export requested.");
    } catch (e) {
      setMsg(e.message);
    }
  };
  const saveLocalPackage = () => {
    try {
      const files = localHandoffFiles(p, t.id);
      if (
        !confirm(
          "Export a local task package? Review private project content before sharing. No agent will execute.",
        )
      )
        return;
      const url = URL.createObjectURL(
        new Blob([makeZip(files)], { type: "application/zip" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = t.id + "-local-agent.zip";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMsg(
        "Local package export requested. No execution or handoff recorded.",
      );
    } catch (e) {
      setMsg(e.message);
    }
  };
  return (
    <>
      <div className="eyebrow">AGENT OPERATIONS</div>
      <h1>Mission Control</h1>
      <p>
        Coordinate external coding agents through assigned roles, explicit
        handoffs, dependency locks and human review. This workspace does not
        execute agents automatically.
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
          ["Tasks", board.length],
          ["Handed off", board.filter((x) => x.status === "Handed off").length],
          ["In review", board.filter((x) => x.status === "In review").length],
          ["Reviewed", board.filter((x) => x.status === "Reviewed").length],
        ].map(([k, v]) => (
          <article key={k}>
            <small>{k}</small>
            <strong>{v}</strong>
          </article>
        ))}
      </div>
      <section className="panel">
        <div className="sectionhead">
          <div>
            <div className="eyebrow">SPECIALIST ROLES</div>
            <h2>Agent team</h2>
          </div>
          <small>9 role profiles · manual orchestration</small>
        </div>
        <div className="rolegrid">
          {roles.map((r) => (
            <article key={r.id}>
              <h3>{r.name}</h3>
              <p>{r.scope}</p>
              <small>
                {board.filter((t) => t.assignment?.role === r.id).length}{" "}
                assigned tasks
              </small>
            </article>
          ))}
        </div>
      </section>
      {!p.blueprintApproved && (
        <section className="panel studioPanel">
          <h2>Approval required</h2>
          <p>
            Review and approve your blueprint before assigning implementation
            work.
          </p>
          <button onClick={openStudio}>Open Blueprint Studio →</button>
        </section>
      )}
      <section className="panel studioPanel">
        <div className="sectionhead">
          <h2>Mission queue</h2>
          <label className="missionfilter">
            Filter
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              {[
                "All",
                "Awaiting approval",
                "Blocked",
                "Ready",
                "Assigned",
                "Handed off",
                "In review",
                "Reviewed",
              ].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
        </div>
        {board
          .filter((x) => filter === "All" || x.status === filter)
          .map((x) => (
            <article className="taskrow" key={x.id}>
              <div>
                <small>
                  {x.id} · {x.status}
                </small>
                <h3>{x.title}</h3>
                <p>
                  {x.assignment
                    ? roles.find((r) => r.id === x.assignment.role)?.name +
                      " · " +
                      x.assignment.agent
                    : "Suggested: " +
                      roles.find((r) => r.id === x.suggestedRole)?.name}
                </p>
              </div>
              <button
                className={t?.id === x.id ? "" : "ghost"}
                onClick={() => {
                  setTaskId(x.id);
                  setReceipt("");
                  setReport(p.evidence?.[x.id]?.report || "");
                }}
              >
                Inspect →
              </button>
            </article>
          ))}
        {!board.length && <p>No blueprint tasks yet.</p>}
      </section>
      {t && (
        <section className="panel studioPanel">
          <div className="eyebrow">
            {t.id} · {t.status}
          </div>
          <h2>{t.title}</h2>
          <p>{t.description}</p>
          <p>Dependencies: {t.dependencies.join(", ") || "None"}</p>
          <h3>Acceptance criteria</h3>
          {t.acceptance.map((x, i) => (
            <p key={i}>• {x}</p>
          ))}
          <div className="twocol">
            <label>
              Specialist role
              <select
                value={selectedRole}
                disabled={!actionable || !!currentReport}
                onChange={(e) =>
                  setChoice({
                    ...choice,
                    [t.id]: { role: e.target.value, agent: selectedAgent },
                  })
                }
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Coding agent
              <select
                value={selectedAgent}
                disabled={!actionable || !!currentReport}
                onChange={(e) =>
                  setChoice({
                    ...choice,
                    [t.id]: { role: selectedRole, agent: e.target.value },
                  })
                }
              >
                {agents.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </label>
          </div>
          <button
            disabled={!actionable || !!currentReport}
            onClick={() => {
              if (
                t.assignment?.handedOff &&
                !confirm("Replace assignment and reset handoff status?")
              )
                return;
              run(() =>
                assignTask(p, t.id, selectedRole, selectedAgent, now()),
              );
            }}
          >
            Save assignment
          </button>
          {aiContext && (
            <RootsysTask
              key={JSON.stringify([session.id, t.assignment, aiContext])}
              context={aiContext}
              session={session}
            />
          )}
          <button
            className="ghost"
            disabled={!actionable || !t.assignment}
            onClick={copy}
          >
            Copy handoff
          </button>
          <button
            className="ghost"
            disabled={!actionable || !t.assignment}
            onClick={savePrompt}
          >
            Export handoff
          </button>
          <button
            className="ghost"
            disabled={!actionable || !t.assignment}
            onClick={saveLocalPackage}
          >
            Export local agent package
          </button>
          <small>
            Requires an exact GitHub branch and commit scan. The ZIP includes an
            offline Git preflight, task prompt and blank report template.
          </small>
          <button
            disabled={!actionable || !t.assignment || t.assignment.handedOff}
            onClick={() => {
              if (
                confirm(
                  "Confirm you manually sent this task to the selected coding agent?",
                )
              )
                run(() => handoffTask(p, t.id, now()));
            }}
          >
            Record sent handoff
          </button>
          {t.assignment?.agent === "OpenCode" && (
            <div className="summary">
              <h3>OpenCode local runner pilot</h3>
              <p>
                The package can start an interactive local CLI after Git
                preflight and explicit terminal confirmation. No remote shell,
                sandbox or automatic prompt submission is provided.
              </p>
              <label>
                Local session receipt JSON
                <textarea
                  aria-label="Local session receipt JSON"
                  rows={4}
                  maxLength={8192}
                  value={receipt}
                  onChange={(event) => setReceipt(event.target.value)}
                  placeholder="Paste RECEIPT.json after reviewing its contents"
                />
              </label>
              <button
                className="ghost"
                disabled={!receipt.trim() || t.status !== "Handed off"}
                onClick={() => {
                  try {
                    const summary = reviewLocalReceipt(p, t.id, receipt);
                    const next = [report.trim(), summary]
                      .filter(Boolean)
                      .join("\n\n");
                    if (next.length > 5000)
                      throw Error("Report limit exceeded.");
                    setReport(next);
                    setReceipt("");
                    setMsg(
                      "Receipt added to draft only. Verify actual evidence.",
                    );
                  } catch (error) {
                    setMsg(error.message);
                  }
                }}
              >
                Add receipt to report draft
              </button>
              <small>
                Record the manual handoff first. A receipt is unsigned and
                cannot prove implementation success or approve a task.
              </small>
            </div>
          )}
          <label>
            Implementation report / test evidence
            <textarea
              key={t.id}
              rows={7}
              maxLength={5000}
              value={report}
              onChange={(e) => setReport(e.target.value)}
              placeholder="Paste actual changes, commands, results, commit and blockers. No secrets."
              disabled={
                !t.assignment?.handedOff ||
                t.status === "Reviewed" ||
                t.status === "Blocked"
              }
            />
          </label>
          <button
            disabled={
              !t.assignment?.handedOff ||
              !report.trim() ||
              !["Handed off", "In review"].includes(t.status)
            }
            onClick={() =>
              run(() => submitMissionReport(p, t.id, report, now()))
            }
          >
            Submit report
          </button>
          {currentReport && (
            <div className="summary">
              <h3>Recorded evidence</h3>
              <pre>{currentReport}</pre>
              <small>
                Evidence is manually submitted; VibeForge has not independently
                verified these results.
              </small>
            </div>
          )}
          <button
            disabled={t.status !== "In review"}
            onClick={() => {
              if (
                confirm(
                  "Confirm you reviewed the evidence and acceptance criteria?",
                )
              )
                run(() => reviewMission(p, t.id, true, now()));
            }}
          >
            Accept human review
          </button>
          <button
            className="ghost"
            disabled={!["In review", "Reviewed"].includes(t.status)}
            onClick={() => {
              if (
                confirm(
                  "Reopen this task and clear downstream evidence and handoff status?",
                )
              ) {
                run(() => reviewMission(p, t.id, false, now()));
                setReport("");
              }
            }}
          >
            Reopen / reject
          </button>
        </section>
      )}
      <section className="panel studioPanel">
        <h2>Activity log</h2>
        <small>Recent 60 local events; not an immutable audit trail.</small>
        {(p.mission?.history || []).map((x, i) => (
          <article className="taskrow" key={i}>
            <div>
              <small>{x.at}</small>
              <p>
                {x.task} · {x.action}
              </p>
            </div>
          </article>
        ))}
        {!p.mission?.history?.length && <p>No mission activity recorded.</p>}
      </section>
      <p role="status">{msg}</p>
    </>
  );
}
