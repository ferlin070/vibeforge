"use client";

import { useState } from "react";
import { operationsExport, workspaceOperations } from "../lib/operations.mjs";
import { translate } from "../lib/language.mjs";

export default function Operations({ projects, navigate, language, download }) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(10);
  const t = (key) => translate(language, key);
  const data = workspaceOperations(projects);
  const visible = data.rows.filter((row) =>
    row.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <>
      <div className="eyebrow">LOCAL WORKSPACE</div>
      <h1>{t("Workspace operations")}</h1>
      <p>
        {t(
          "Local projects and recorded evidence only. Not platform administration or live service monitoring.",
        )}
      </p>
      <div className="stats studioStats">
        {[
          ["Projects", data.projects],
          ["Open critical/high bugs", data.critical],
          ["Blocked/unapproved tasks", data.blocked],
          ["Awaiting review", data.awaitingReview],
          ["Missing release gates", data.missingGates],
        ].map(([label, value]) => (
          <article key={label}>
            <small>{t(label)}</small>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <section className="panel studioPanel">
        <h2>{t("Project priority")}</h2>
        <label>
          {t("Search projects")}
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setLimit(10);
            }}
          />
        </label>
        {visible.slice(0, limit).map((row) => (
          <article key={row.id} className="taskrow">
            <div>
              <h3>{row.name}</h3>
              <p>
                {t("Reviewed tasks")}: {row.reviewed}/{row.total}
              </p>
              <progress
                aria-label={t("Reviewed tasks") + ": " + row.name}
                max={row.total || 1}
                value={row.reviewed}
              />
              <p>
                {t("Open critical/high bugs")}: {row.critical} ·{" "}
                {t("Awaiting review")}: {row.pendingReview}
              </p>
              <small>
                {t("Missing release gates")}: {row.missingGates}
              </small>
            </div>
            <button
              className="ghost"
              onClick={() => navigate("quality", row.id)}
            >
              {t("Inspect quality")}
            </button>
            <button
              className="ghost"
              onClick={() => navigate(row.next, row.id)}
            >
              {t("Continue work")}
            </button>
          </article>
        ))}
        {!projects.length ? (
          <>
            <p>{t("No local projects.")}</p>
            <button onClick={() => navigate("new")}>
              {t("Create project")}
            </button>
          </>
        ) : !visible.length ? (
          <p role="status">{t("No matching projects.")}</p>
        ) : null}
        {visible.length > limit && (
          <button className="ghost" onClick={() => setLimit(limit + 10)}>
            {t("Show more")}
          </button>
        )}
        <button
          className="ghost"
          onClick={() =>
            download(
              operationsExport(data),
              "vibeforge-workspace-report.json",
              "application/json",
            )
          }
        >
          {t("Export aggregate report")}
        </button>
      </section>
    </>
  );
}
