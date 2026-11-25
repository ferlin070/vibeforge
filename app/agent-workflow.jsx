"use client";

import { useState } from "react";
import { agents } from "../lib/context.mjs";
import { roles } from "../lib/mission.mjs";
import {
  assignWorkflowSuggestion,
  workflowLanes,
  workflowPreview,
} from "../lib/agent-workflow.mjs";

export default function AgentWorkflow({ project, go, update }) {
  const [preferences, setPreferences] = useState({});
  const [message, setMessage] = useState("");
  const plan = workflowPreview(project, preferences);
  const lanes = workflowLanes(plan.tasks);
  return (
    <section className="panel studioPanel">
      <div className="eyebrow">MULTI-AGENT ORCHESTRATION</div>
      <h2>Multi-Agent Workflow Designer</h2>
      <p>
        Draft a role-based workflow from the active blueprint. Temporary
        preferences are proposals until you confirm an individual ready task.
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
          <h3>Dependency workflow</h3>
          <p>
            Waves show dependency depth, not permission to run tasks in
            parallel. Reviewed dependencies and human approval are required.
          </p>
          <div className="workflow-lanes" aria-label="Dependency workflow">
            {lanes.map((lane) => (
              <section className="workflow-lane" key={lane.level}>
                <h4>Wave {lane.level}</h4>
                {lane.tasks.map((task) => (
                  <article className="workflow-node" key={task.id}>
                    <small>{task.id} · {task.status}</small>
                    <h3>{task.title}</h3>
                    <p>{task.role} · {task.agent}</p>
                    <small>
                      Requires: {task.dependencies.join(", ") || "None"}
                    </small>
                    <p>
                      {task.existingAssignment
                        ? "Existing assignment"
                        : "Suggested assignment"}
                    </p>
                    <button
                      className="ghost"
                      disabled={task.status !== "Ready" || task.existingAssignment}
                      onClick={() => {
                        if (!confirm("Assign " + task.id + " to " + task.agent + "? This does not execute the agent.")) return;
                        try {
                          const patch = assignWorkflowSuggestion(
                            project,
                            task.id,
                            preferences,
                            new Date().toISOString(),
                          );
                          setMessage(update(patch) ? "Assignment saved. No handoff or execution recorded." : "Assignment not saved.");
                        } catch (error) {
                          setMessage(error.message);
                        }
                      }}
                    >
                      Assign suggested agent
                    </button>
                  </article>
                ))}
              </section>
            ))}
          </div>
          <p>Existing assignments take precedence. No automatic execution or approval.</p>
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
