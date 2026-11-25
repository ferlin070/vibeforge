"use client";

import { useState } from "react";
import AgentWorkflow from "./agent-workflow.jsx";
import { agents, agentGuidance } from "../lib/context.mjs";
import {
  agentGuides,
  guideCheckedOn,
  modelColumns,
} from "../lib/agent-guides.mjs";

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
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
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
      <AgentWorkflow project={project} go={go} update={update} />
      <section className="panel studioPanel">
        <h2>Installation guides</h2>
        <p>
          Five priority agents have source-backed setup references. For other
          agents, consult their official documentation before installing.
        </p>
        <div className="tiles">
          {agentGuides.map((item) => (
            <article key={item.name}>
              <strong>{item.name}</strong>
              <p>{item.setup}</p>
              <a href={item.install} target="_blank" rel="noopener noreferrer">
                Official installation guide ↗
              </a>
              <p>
                <a
                  href={item.providers}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Provider configuration ↗
                </a>
              </p>
            </article>
          ))}
        </div>
      </section>
      <section className="panel studioPanel">
        <h2>Model compatibility matrix</h2>
        <p>
          Documentation reviewed {guideCheckedOn}. These are external provider
          options, not live connection checks or VibeForge integrations.
        </p>
        <div className="tiles">
          {agentGuides.map((item) => (
            <article key={item.name}>
              <strong>{item.name}</strong>
              <dl>
                {modelColumns.map((model, index) => (
                  <div key={model}>
                    <dt>{model}</dt>
                    <dd>{item.models[index]}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
        <p>
          Documented means a provider is described by its official guide. Custom
          endpoint requires compatible protocol and configuration. Not verified
          does not mean unsupported. Local models need sufficient hardware,
          context length and tool-calling support.
        </p>
        <p>
          Keep Ollama on your own machine or trusted private network. Do not
          expose a local inference port publicly or enter provider credentials
          into project memory. Cloud usage may incur separate charges.
        </p>
      </section>
      <section className="panel studioPanel">
        <h2>Safe external setup</h2>
        <p>
          Install and configure the external tool using its official
          documentation. Confirm supported models, licensing, costs and
          workspace permissions there. VibeForge does not install agents,
          connect their accounts or store their credentials. The OpenCode runner
          pilot is launched locally by you.
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
