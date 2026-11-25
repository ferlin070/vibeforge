"use client";

import { useState } from "react";
import { inspectDiff, reviewCandidate } from "../lib/review-workbench.mjs";

export default function CodeReview({ project, exportFile }) {
  const [diff, setDiff] = useState("");
  const [focus, setFocus] = useState("");
  const [message, setMessage] = useState("");
  const result = inspectDiff(diff);
  return (
    <section className="panel studioPanel">
      <div className="eyebrow">READ-ONLY REVIEW</div>
      <h2>AI Code Reviewer</h2>
      <p>
        Paste a sanitized unified diff. Local pattern checks suggest review
        priorities; they are not confirmed defects or a complete security audit.
      </p>
      <label>
        Review diff
        <textarea
          rows={8}
          maxLength={20000}
          value={diff}
          onChange={(event) => setDiff(event.target.value)}
        />
      </label>
      <label>
        Review focus
        <input
          maxLength={1000}
          value={focus}
          onChange={(event) => setFocus(event.target.value)}
          placeholder="Correctness, permissions, regression"
        />
      </label>
      <div className="summary">
        <p>{result.addedLines} added lines in the supplied excerpt.</p>
        {result.signals.map((item) => (
          <p key={item.name}>
            {item.name}: {item.count} possible matches
          </p>
        ))}
        {!result.signals.length && <p>No known pattern matched.</p>}
        <small>{result.warning}</small>
      </div>
      <button
        className="ghost"
        disabled={!diff.trim()}
        onClick={() => {
          exportFile(reviewCandidate(project, diff, focus), "code-review.md");
          setMessage("Review handoff export requested. No code was executed.");
        }}
      >
        Export code review prompt
      </button>
      <button
        className="ghost"
        onClick={() => {
          setDiff("");
          setFocus("");
          setMessage("");
        }}
      >
        Clear review input
      </button>
      <p>
        Review exported content before sharing with an external agent.
        Recognized credentials are redacted, but redaction is not exhaustive.
        The input is temporary and does not update release evidence.
      </p>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
