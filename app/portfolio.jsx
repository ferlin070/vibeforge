"use client";

import { useMemo, useState } from "react";
import { filterPortfolio, portfolioEntries } from "../lib/portfolio.mjs";

export default function Portfolio({ projects, selected, navigate }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [limit, setLimit] = useState(5);
  const entries = useMemo(() => portfolioEntries(projects), [projects]);
  const visible = filterPortfolio(entries, query, status);
  return (
    <section className="portfolio panel" aria-labelledby="portfolio-title">
      <div className="sectionhead">
        <div>
          <div className="eyebrow">PROJECT PORTFOLIO</div>
          <h2 id="portfolio-title">Continue building</h2>
          <p>Prioritize evidence review and resume your next task.</p>
        </div>
        <button className="ghost" onClick={() => navigate("projects")}>
          View all projects
        </button>
      </div>
      <div className="portfolio-metrics">
        {["Planning", "Implementation", "Review release"].map((name) => (
          <button
            key={name}
            className="ghost"
            aria-pressed={status === name}
            onClick={() => {
              setStatus(status === name ? "All" : name);
              setLimit(5);
            }}
          >
            <small>{name}</small>
            <strong>
              {entries.filter((entry) => entry.status === name).length}
            </strong>
          </button>
        ))}
      </div>
      <div className="filterbar">
        <label>
          Search portfolio
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setLimit(5);
            }}
            placeholder="Project, type or agent"
          />
        </label>
        <label>
          Portfolio status
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setLimit(5);
            }}
          >
            {["All", "Planning", "Implementation", "Review release"].map(
              (name) => (
                <option key={name}>{name}</option>
              ),
            )}
          </select>
        </label>
      </div>
      <p className="portfolio-count" role="status">
        {Math.min(limit, visible.length)} of {visible.length} matching projects
      </p>
      <div className="portfolio-list">
        {visible.slice(0, limit).map((entry) => (
          <article key={entry.id} className="portfolio-row">
            <div className="portfolio-name">
              <small>
                {entry.type} · {entry.agent}
              </small>
              <h3>{entry.name}</h3>
              {selected === entry.id && <small>Active project</small>}
            </div>
            <div className="portfolio-state">
              <strong>{entry.status}</strong>
              <progress
                aria-label={"Reviewed tasks for " + entry.name}
                max={entry.total || 1}
                value={entry.reviewed}
              />
              <small>
                {entry.reviewed}/{entry.total} reviewed
                {entry.pendingReview > 0 &&
                  " · " + entry.pendingReview + " awaiting review"}
              </small>
            </div>
            <button
              className="ghost"
              onClick={() => navigate(entry.next.view, entry.id)}
            >
              {entry.next.label} →
            </button>
          </article>
        ))}
      </div>
      {!visible.length && (
        <div className="portfolio-empty">
          <p>{entries.length ? "No matching projects." : "No projects yet."}</p>
          <button
            className="ghost"
            onClick={() => {
              if (!entries.length) navigate("new");
              else {
                setQuery("");
                setStatus("All");
                setLimit(5);
              }
            }}
          >
            {entries.length ? "Reset filters" : "Start a project"}
          </button>
        </div>
      )}
      {visible.length > limit && (
        <button className="ghost" onClick={() => setLimit(limit + 5)}>
          Show more projects
        </button>
      )}
      <small>
        Project status is based on local planning and review evidence, not
        release certification.
      </small>
    </section>
  );
}
