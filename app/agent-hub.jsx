"use client";

import { useState } from "react";
import { agents, agentGuidance } from "../lib/context.mjs";

const categories = {
  Universal: "Universal",
  Codex: "Coding",
  "Claude Code": "Coding",
  Cursor: "IDE",
  "Gemini CLI": "Coding",
  "GitHub Copilot": "IDE",
  Lovable: "App builder",
  Bolt: "App builder",
  Replit: "App builder",
  OpenCode: "Coding",
  "Hermes Agent": "General agent",
  OpenClaw: "General agent",
  "OMP (oh-my-pi)": "Coding",
  "DeepSeek Harness": "Coding",
  Aider: "Coding",
  Cline: "IDE",
  Continue: "IDE",
  "Qwen Code": "Coding",
  Pi: "Coding",
  Goose: "General agent",
  OpenHands: "Coding",
};

export default function AgentHub({ project, update, go }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [message, setMessage] = useState("");
  const visible = agents.filter(
    (name) =>
      (category === "All" || categories[name] === category) &&
      name.toLowerCase().includes(search.trim().toLowerCase()),
  );
  return (
    <>
      <div className="eyebrow">AGENT ECOSYSTEM</div>
      <h1>Agent Hub</h1>
      <p>
        Explore {agents.length} manual handoff targets. Choose an agent for your
        project without changing its approved tasks or previous assignments.
      </p>
      <div className="panel">
        <div className="eyebrow">ACTIVE PROJECT</div>
        <h2>{project?.name || "No project selected"}</h2>
        <p>
          {project
            ? "Preferred agent: " + project.agent
            : "Create or open a project before setting an agent preference."}
        </p>
        <button
          className="ghost"
          onClick={() => go(project ? "projects" : "new")}
        >
          {project ? "Switch project" : "Create project"}
        </button>
        {project && (
          <>
            <button className="ghost" onClick={() => go("prompt")}>
              Open Prompt Lab
            </button>
            <button className="ghost" onClick={() => go("context")}>
              Export context
            </button>
          </>
        )}
      </div>
      <div className="filterbar">
        <label>
          Search agents
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by agent name"
          />
        </label>
        <label>
          Agent category
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {["All", ...new Set(Object.values(categories))].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <small>{visible.length} results</small>
      </div>
      {message && <p role="status">{message}</p>}
      <div className="tiles">
        {visible.map((name) => (
          <article key={name}>
            <span className="eyebrow">{categories[name] || "Other"}</span>
            <h3>{name}</h3>
            <p>{agentGuidance(name)}</p>
            <small>Manual prompt / context handoff</small>
            <div>
              <button
                className="ghost"
                disabled={!project || project.agent === name}
                onClick={() => {
                  setMessage(
                    update({ agent: name })
                      ? "Preferred agent updated for future prompts."
                      : "Agent preference was not changed.",
                  );
                }}
              >
                {project?.agent === name ? "Selected" : "Use agent"}
              </button>
            </div>
          </article>
        ))}
        {!visible.length && (
          <article className="empty">
            <h3>No matching agents</h3>
            <button
              className="ghost"
              onClick={() => {
                setSearch("");
                setCategory("All");
              }}
            >
              Reset filters
            </button>
          </article>
        )}
      </div>
      <section className="panel studioPanel">
        <h2>Safe external setup</h2>
        <p>
          Install and configure the external tool using its official
          documentation. Confirm supported models, licensing, costs and
          workspace permissions there. VibeForge does not install or execute
          agents, connect their accounts or store their credentials.
        </p>
        <p>
          Export context or copy a prompt, review sensitive information, and
          import it manually. Use Mission Control for approved task handoffs.
        </p>
        <button className="ghost" onClick={() => go("mission")}>
          Open Mission Control
        </button>
      </section>
    </>
  );
}
