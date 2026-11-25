"use client";

import { useState } from "react";
import { agents } from "../lib/context.mjs";
import { roles } from "../lib/mission.mjs";
import { workflowPreview } from "../lib/agent-workflow.mjs";

export default function AgentWorkflow({ project, go }) {
  const [preferences, setPreferences] = useState({});
  const [message, setMessage] = useState("");
  const plan = workflowPreview(project, preferences);
  return (
    <section className="panel studioPanel">
      <div className="eyebrow">MULTI-AGENT ORCHESTRATION</div>
      <h2>Multi-Agent Workflow Designer</h2>
      <p>
        Draft a role-based workflow from the active blueprint. These temporary
        preferences never change existing assignments or approvals.
      </p>
      {!plan.tasks.length ? (
        <>
          <p>Create a blueprint before designing a workflow.</p>
          <button className="ghost" onClick={() => go("studio")}>
            Open AI Blueprint Studio
          </button>
        </>
      ) : (
        <>
          <div className="summary">
            <strong>
              {plan.approved ? "Approved blueprint" : "Awaiting approval"}
            </strong>
            <p>{plan.tasks.length} tasks in the current blueprint.</p>
          </div>
          <div className="twocol">
            {roles.map((role) => (
              <label key={role.id}>
                {role.name}
                <select
                  value={preferences[role.id] || ""}
                  onChange={(event) =>
                    setPreferences((current) => ({
                      ...current,
                      [role.id]: event.target.value,
                    }))
                  }
                >
                  <option value="">Project default</option>
                  {agents.map((agent) => (
                    <option key={agent}>{agent}</option>
                  ))}
                </select>
                <small>{role.scope}</small>
              </label>
            ))}
          </div>
          <h3>Task handoff preview</h3>
          {plan.tasks.map((task) => (
            <article className="taskrow" key={task.id}>
              <div>
                <small>{task.id}</small>
                <h3>{task.title}</h3>
                <p>
                  {task.role} · {task.agent}
                </p>
                <small>
                  Dependencies: {task.dependencies.join(", ") || "None"}
                </small>
                <p>
                  {task.existingAssignment
                    ? "Existing assignment"
                    : "Suggested assignment"}{" "}
                  · {task.status}
                </p>
              </div>
            </article>
          ))}
          <p>{plan.note}</p>
          <div className="actions">
            <button
              className="ghost"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    JSON.stringify(plan, null, 2),
                  );
                  setMessage("Workflow preview copied.");
                } catch {
                  setMessage("Clipboard unavailable.");
                }
              }}
            >
              Copy workflow preview
            </button>
            <button className="ghost" onClick={() => setPreferences({})}>
              Reset preferences
            </button>
            <button onClick={() => go("mission")}>Open Mission Control</button>
          </div>
          {message && <p role="status">{message}</p>}
        </>
      )}
    </section>
  );
}
