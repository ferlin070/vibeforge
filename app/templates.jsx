"use client";

import { useState } from "react";
import { findTemplates, templateDraft, templates } from "../lib/templates.mjs";

export default function TemplateCatalog({ onUse }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const visible = findTemplates(query, category);
  return (
    <section className="panel studioPanel" aria-label="Template library">
      <div className="eyebrow">STARTER COLLECTION</div>
      <h2>Template library</h2>
      <p>
        Start with a curated brief, then adapt the requirements in Project
        Studio. All templates are free planning starters, not finished apps.
      </p>
      <div className="filterbar">
        <label>
          Search templates
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search projects or features"
          />
        </label>
        <label>
          Template category
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {["All", ...new Set(templates.map((item) => item.category))].map(
              (item) => (
                <option key={item}>{item}</option>
              ),
            )}
          </select>
        </label>
      </div>
      <p role="status">{visible.length} matching templates</p>
      <div className="tiles">
        {visible.map((item) => (
          <article key={item.id}>
            <div className="eyebrow">{item.category}</div>
            <h3>{item.name}</h3>
            <small>{item.type}</small>
            <p>{item.idea}</p>
            <button
              className="ghost"
              onClick={() => onUse(templateDraft(item.id))}
            >
              Use template
            </button>
          </article>
        ))}
      </div>
      {!visible.length && (
        <button
          className="ghost"
          onClick={() => {
            setQuery("");
            setCategory("All");
          }}
        >
          Reset template filters
        </button>
      )}
      <small>
        No purchases, external publishing, automatic approvals or code
        execution.
      </small>
    </section>
  );
}
