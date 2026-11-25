"use client";

import { useState } from "react";
import { architectureOptions, architecturePlan } from "../lib/architect.mjs";

export default function Architect({ project }) {
  const [option, setOption] = useState("managed");
  const [message, setMessage] = useState("");
  const plan = architecturePlan(project, option);
  const chosen = architectureOptions.find((item) => item.id === option);
  return (
    <section className="panel studioPanel">
      <div className="eyebrow">ARCHITECTURE WORKBENCH</div>
      <h2>AI Project Architect 2.0</h2>
      <p>
        Compare candidate architectures before implementation. These are
        planning options, not automatically selected or approved technologies.
      </p>
      <div className="tiles">
        {architectureOptions.map((item) => (
          <article key={item.id}>
            <h3>{item.title}</h3>
            <p>{item.stack}</p>
            <p>{item.fit}</p>
            <small>{item.tradeoff}</small>
            <div>
              <button
                className={option === item.id ? "" : "ghost"}
                aria-pressed={option === item.id}
                onClick={() => {
                  setOption(item.id);
                  setMessage("");
                }}
              >
                {option === item.id ? "Selected" : "Select option"}
              </button>
            </div>
          </article>
        ))}
      </div>
      <h3>Architecture planning view</h3>
      <div className="summary">
        <strong>{chosen.title}</strong>
        <p>
          User interface → authenticated application boundary → data services
        </p>
        <p>
          Proposed logical flow only. Confirm network boundaries and the
          existing system before implementation.
        </p>
      </div>
      <h3>Architecture decision record</h3>
      <details>
        <summary>Preview ADR and planning prompt</summary>
        <pre>{plan}</pre>
      </details>
      <button
        className="ghost"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(plan);
            setMessage("Architecture proposal copied.");
          } catch {
            setMessage("Clipboard unavailable. Use export.");
          }
        }}
      >
        Copy architecture proposal
      </button>
      <button
        className="ghost"
        onClick={() => {
          const url = URL.createObjectURL(
            new Blob([plan], { type: "text/markdown" }),
          );
          const link = document.createElement("a");
          link.href = url;
          link.download = "architecture-decision-candidate.md";
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          setMessage("Architecture export requested.");
        }}
      >
        Export ADR candidate
      </button>
      <p>
        Use this prompt with your preferred external agent or Gemini. Review
        private project data before sharing. Use the existing AI generation form
        for full blueprint generation with your selected provider.
      </p>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
