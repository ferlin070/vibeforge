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