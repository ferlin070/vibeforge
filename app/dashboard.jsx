"use client";
import { dashboardSummary } from "../lib/dashboard.mjs";

export default function DashboardFocus({ project, navigate }) {
  const d = dashboardSummary(project);
  const gateCount = d.gates.filter((gate) => gate.ok).length;
  return (
    <section className="dashboard-focus" aria-label="Active project command center">
      <div className="focus-card">
        <div className="eyebrow">ACTIVE PROJECT · COMMAND CENTER</div>
        <h2>{project?.name || "Your next build"}</h2>
        <p>{project?.type || "Start with a structured project brief."}</p>
        <div className="focus-status">
          {project?.blueprintApproved ? "Blueprint approved" : "Blueprint not approved"}
          {" · "}
          {project?.agent || "Universal"}
        </div>
        <div className="focus-progress">
          <span>Manually reviewed tasks</span>
          <strong>{d.reviewed}/{d.total}</strong>
        </div>
        <progress aria-label="Task review progress" max={d.total || 1} value={d.reviewed} />
        <div className="focus-stats">
          {[
            ["Available / dispatched", d.ready],
            ["Awaiting review", d.pendingReview],
            ["Blocked / unapproved", d.blocked],
          ].map(([label, value]) => (
            <div key={label}>
              <strong>{value}</strong>
              <small>{label}</small>
            </div>
          ))}
        </div>
        <button onClick={() => navigate(d.next.view)}>{d.next.label} →</button>
      </div>
      <div className="focus-card">
        <div className="eyebrow">RELEASE EVIDENCE</div>
        <h2>{gateCount}/{d.gates.length} readiness gates</h2>
        <p>Advisory checks, not independent release certification.</p>
        <ul className="focus-gates">
          {d.gates.map((gate) => (
            <li key={gate.name}>
              <span>{gate.name}</span>
              <small className={gate.ok ? "gate-ok" : "gate-pending"}>
                {gate.ok ? "Recorded" : "Pending"}
              </small>
            </li>
          ))}
        </ul>
        <button className="ghost" onClick={() => navigate(project ? "quality" : "new")}>
          {project ? "Open Quality Studio →" : "Create project →"}
        </button>
      </div>
    </section>
  );
}
