"use client";

import { useState } from "react";
import { validateTaskPlan } from "../lib/rootsys-task.mjs";

export default function RootsysTask({ context, session }) {
  const [plan, setPlan] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function generate() {
    if (busy) return;
    if (!confirm("Send this task to Rootsys? Provider charges may apply.")) return;
    setBusy(true);
    setPlan(null);
    setMessage("");
    try {
      const response = await fetch("/api/rootsys/task", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-vibeforge-session": session.token,
        },
        body: JSON.stringify(context),
        signal: AbortSignal.timeout(65000),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || "Task plan unavailable.");
      setPlan(validateTaskPlan(result.plan));
    } catch (error) {
      setMessage(error.message || "Task plan unavailable.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="summary" aria-label="Rootsys task planning">
      <h3>Rootsys agent task planner</h3>
      <p>Owner pilot. Advisory only. Shares the daily generation allocation.</p>
      <details>
        <summary>Review task context before sending</summary>
        <pre>{JSON.stringify(context, null, 2)}</pre>
      </details>
      <button type="button" disabled={busy} onClick={generate}>
        {busy ? "Planning..." : "Generate advisory task plan"}
      </button>
      {message && <p role="status">{message}</p>}
      {plan && (
        <div>
          <h4>Unverified AI suggestions</h4>
          {["steps", "tests", "risks"].map((key) => (
            <div key={key}>
              <strong>{key}</strong>
              <ul>
                {plan[key].map((text, index) => (
                  <li key={index}>{text}</li>
                ))}
              </ul>
            </div>
          ))}
          <small>No execution, handoff or evidence was recorded.</small>
        </div>
      )}
    </section>
  );
}
