import {
  validateBlueprint,
  sections,
  invalidateReviews,
} from "./blueprint.mjs";
import { agents, categories } from "./context.mjs";
import { roles } from "./mission.mjs";
import { stages } from "./planner.mjs";
import { severities, releaseChecks } from "./quality.mjs";
import { parseRepo } from "./repository.mjs";

const forbidden = new Set(["__proto__", "constructor", "prototype"]);
const bytes = (v) => new TextEncoder().encode(v).length;
function need(ok, field) {
  if (!ok) throw Error("Invalid project data: " + field);
}
const plain = (v) =>
  v !== null &&
  typeof v === "object" &&
  (Object.getPrototypeOf(v) === Object.prototype ||
    Object.getPrototypeOf(v) === null);
const str = (v, max) => typeof v === "string" && v.length <= max;
const id = (v) =>
  str(v, 100) && /^[A-Za-z0-9_-]+$/.test(v) && !forbidden.has(v);
const bool = (v) => typeof v === "boolean";
const date = (v) => str(v, 40) && Number.isFinite(Date.parse(v));
const list = (v, max, fn) => Array.isArray(v) && v.length <= max && v.every(fn);
const unique = (v) => new Set(v).size === v.length;
const taskId = (v) => typeof v === "string" && /^TASK-[0-9]{3}$/.test(v);
const sha = (v) => typeof v === "string" && /^[a-f0-9]{40}$/i.test(v);
const repo = (v) => {
  try {
    return typeof v === "string" && parseRepo(v) === v;
  } catch {
    return false;
  }
};
const opt = (v, fn) => v === undefined || fn(v);
function shape(v, keys, field) {
  need(plain(v) && Object.keys(v).every((k) => keys.includes(k)), field);
}
export function assertSafeJson(v, depth = 0, seen = new Set()) {
  need(depth <= 25, "nesting limit");
  if (
    v === null ||
    typeof v === "string" ||
    bool(v) ||
    (typeof v === "number" && Number.isFinite(v))
  )
    return;
  need(Array.isArray(v) || plain(v), "JSON object");
  need(!seen.has(v), "circular data");
  seen.add(v);
  for (const key of Object.keys(v)) {
    need(!forbidden.has(key), "unsafe property name");
    const desc = Object.getOwnPropertyDescriptor(v, key);
    need(desc && Object.hasOwn(desc, "value"), "unsafe property");
    assertSafeJson(desc.value, depth + 1, seen);
  }
  seen.delete(v);
}
function checkBlueprint(b, approved) {
  if (!b) {
    need(!approved, "approval without blueprint");
    return null;
  }
  shape(b, ["documents", "tasks", "assumptions", "questions"], "blueprint");
  shape(
    b.documents,
    sections.map(([k]) => k),
    "documents",
  );
  for (const [k] of sections) need(str(b.documents[k], 18000), "document " + k);
  // Incomplete document drafts are legitimate local work, but cannot be approved.
  const candidate = approved
    ? b
    : {
        ...b,
        documents: Object.fromEntries(
          sections.map(([k]) => [
            k,
            b.documents[k].trim() ? b.documents[k] : "Draft",
          ]),
        ),
      };
  const valid = validateBlueprint(candidate);
  for (const t of b.tasks) {
    shape(
      t,
      ["id", "title", "description", "dependencies", "acceptance"],
      "task",
    );
    need(t.acceptance.length <= 160, "acceptance limit");
  }
  return valid;
}
function checkMemory(items) {
  need(
    list(items, 40, (m) => {
      shape(m, ["id", "category", "title", "body", "createdAt"], "memory");
      return (
        id(m.id) &&
        categories.includes(m.category) &&
        str(m.title, 160) &&
        str(m.body, 2400) &&
        date(m.createdAt)
      );
    }) && unique(items.map((m) => m.id)),
    "memory",
  );
}
function checkEvidence(e, b, approved, historical = false) {
  need(plain(e), "evidence");
  const ids = new Set((b?.tasks || []).map((t) => t.id));
  for (const [k, v] of Object.entries(e)) {
    need(ids.has(k), "evidence task");
    shape(v, ["report", "reviewed"], "task evidence");
    need(
      str(v.report, 5000) &&
        bool(v.reviewed) &&
        (!v.reviewed || (approved && !!v.report.trim())),
      "task review",
    );
  }
  if (!historical)
    need(
      Object.entries(invalidateReviews(b?.tasks || [], e)).every(
        ([k, v]) => v.reviewed === e[k].reviewed,
      ),
      "review dependencies",
    );
}
function checkRepository(r, brief = false) {
  const common = ["repo", "sha", "stack", "signals", "limitations"];
  shape(
    r,
    brief
      ? common
      : [
          ...common,
          "branch",
          "description",
          "scannedAt",
          "private",
          "fileCount",
          "truncated",
          "paths",
          "dependencies",
          "suggestions",
          "extensions",
        ],
    "repository",
  );
  need(
    repo(r.repo) &&
      sha(r.sha) &&
      list(r.stack, 30, (s) => str(s, 100)) &&
      plain(r.signals) &&
      Object.values(r.signals).every(bool) &&
      list(r.limitations, 10, (s) => str(s, 1000)),
    "repository metadata",
  );
  if (!brief)
    need(
      str(r.branch, 255) &&
        str(r.description, 500) &&
        date(r.scannedAt) &&
        bool(r.private) &&
        bool(r.truncated) &&
        Number.isSafeInteger(r.fileCount) &&
        r.fileCount >= 0 &&
        list(r.paths, 300, (s) => str(s, 240)) &&
        list(r.dependencies, 80, (s) => str(s, 100)) &&
        list(r.suggestions, 20, (s) => str(s, 1000)) &&
        list(
          r.extensions,
          10,
          (x) =>
            Array.isArray(x) &&
            x.length === 2 &&
            str(x[0], 16) &&
            Number.isSafeInteger(x[1]) &&
            x[1] >= 0,
        ),
      "repository inventory",
    );
}
function checkMission(m, b) {
  shape(m, ["assignments", "history"], "mission");
  const ids = new Set((b?.tasks || []).map((t) => t.id));
  need(plain(m.assignments), "assignments");
  for (const [key, a] of Object.entries(m.assignments)) {
    shape(
      a,
      ["role", "agent", "handedOff", "assignedAt", "handoffAt"],
      "assignment",
    );
    need(
      ids.has(key) &&
        roles.some((r) => r.id === a.role) &&
        agents.includes(a.agent) &&
        bool(a.handedOff) &&
        date(a.assignedAt) &&
        opt(a.handoffAt, (x) => x === null || date(x)) &&
        (!a.handedOff || date(a.handoffAt)),
      "assignment",
    );
  }
  need(
    list(m.history, 60, (h) => {
      shape(h, ["action", "task", "at"], "history");
      return str(h.action, 200) && taskId(h.task) && date(h.at);
    }),
    "history",
  );
}
function checkQuality(q) {
  shape(q, ["bugs", "checks", "ci", "rollback"], "quality");
  if (q.bugs !== undefined)
    need(
      list(q.bugs, 40, (b) => {
        shape(
          b,
          [
            "id",
            "title",
            "severity",
            "details",
            "task",
            "status",
            "createdAt",
            "evidence",
            "updatedAt",
          ],
          "bug",
        );
        return (
          id(b.id) &&
          str(b.title, 160) &&
          severities.includes(b.severity) &&
          str(b.details, 20000) &&
          (b.task === "" || taskId(b.task)) &&
          ["Open", "Investigating", "Resolved"].includes(b.status) &&
          date(b.createdAt) &&
          str(b.evidence, 3000) &&
          opt(b.updatedAt, date) &&
          (b.status !== "Resolved" || !!b.evidence.trim())
        );
      }) && unique(q.bugs.map((b) => b.id)),
      "bugs",
    );
  if (q.checks !== undefined) {
    shape(
      q.checks,
      releaseChecks.map(([k]) => k),
      "release checks",
    );
    for (const v of Object.values(q.checks)) {
      shape(v, ["evidence", "at"], "release evidence");
      need(
        str(v.evidence, 3000) && !!v.evidence.trim() && date(v.at),
        "release evidence",
      );
    }
  }
  need(
    opt(q.rollback, (v) => str(v, 4000)),
    "rollback",
  );
  if (q.ci !== undefined && q.ci !== null) {
    const c = q.ci;
    shape(c, ["repo", "sha", "fetchedAt", "runs"], "CI");
    need(
      repo(c.repo) &&
        sha(c.sha) &&
        date(c.fetchedAt) &&
        list(c.runs, 20, (r) => {
          shape(
            r,
            ["id", "name", "status", "conclusion", "createdAt", "url"],
            "CI run",
          );
          return (
            Number.isSafeInteger(r.id) &&
            r.id > 0 &&
            str(r.name, 140) &&
            str(r.status, 30) &&
            str(r.conclusion, 30) &&
            str(r.createdAt, 40) &&
            r.url === "https://github.com/" + c.repo + "/actions/runs/" + r.id
          );
        }),
      "CI runs",
    );
  }
}
function checkVersion(v) {
  shape(v, ["id", "label", "createdAt", "state"], "checkpoint");
  need(
    id(v.id) && str(v.label, 100) && date(v.createdAt),
    "checkpoint metadata",
  );
  const s = v.state;
  shape(
    s,
    [
      "project",
      "brief",
      "memory",
      "repository",
      "blueprint",
      "approved",
      "evidence",
    ],
    "checkpoint state",
  );
  shape(
    s.project,
    ["name", "type", "idea", "audience", "agent"],
    "checkpoint project",
  );
  need(
    str(s.project.name, 200) &&
      str(s.project.type, 100) &&
      str(s.project.idea, 12000) &&
      str(s.project.audience, 500) &&
      str(s.project.agent, 100) &&
      str(s.brief, 18000) &&
      bool(s.approved),
    "checkpoint project",
  );
  checkMemory(s.memory);
  const b = checkBlueprint(s.blueprint, s.approved);
  if (s.repository !== null) checkRepository(s.repository, true);
  checkEvidence(s.evidence, b, s.approved, true);
  return true;
}
export function validateProject(p) {
  assertSafeJson(p);
  need(bytes(JSON.stringify(p)) <= 1200000, "project size");
  shape(
    p,
    [
      "id",
      "name",
      "type",
      "idea",
      "audience",
      "agent",
      "createdAt",
      "reviewed",
      "document",
      "blueprint",
      "blueprintSource",
      "blueprintApproved",
      "evidence",
      "memory",
      "contextVersions",
      "repository",
      "mission",
      "quality",
    ],
    "project fields",
  );
  need(
    id(p.id) &&
      str(p.name, 200) &&
      !!p.name.trim() &&
      str(p.idea, 12000) &&
      !!p.idea.trim() &&
      str(p.type, 100) &&
      str(p.audience, 500) &&
      agents.includes(p.agent) &&
      date(p.createdAt),
    "project identity",
  );
  need(
    list(p.reviewed, 8, (v) => stages.some(([k]) => k === v)) &&
      unique(p.reviewed),
    "workflow reviews",
  );
  need(
    opt(p.document, (v) => str(v, 18000)) &&
      opt(p.blueprintSource, (v) => str(v, 500)) &&
      opt(p.blueprintApproved, bool),
    "project specification",
  );
  const b = checkBlueprint(p.blueprint, !!p.blueprintApproved);
  if (p.evidence !== undefined)
    checkEvidence(p.evidence, b, !!p.blueprintApproved);
  if (p.memory !== undefined) checkMemory(p.memory);
  if (p.repository !== undefined && p.repository !== null)
    checkRepository(p.repository);
  if (p.mission !== undefined) checkMission(p.mission, b);
  if (p.quality !== undefined) checkQuality(p.quality);
  if (p.contextVersions !== undefined)
    need(
      list(p.contextVersions, 3, checkVersion) &&
        unique(p.contextVersions.map((v) => v.id)),
      "checkpoints",
    );
  return p;
}
export function validateSnapshot(row) {
  assertSafeJson(row);
  shape(row, ["id", "project", "updated_at"], "snapshot row");
  need(
    id(row.id) && date(row.updated_at) && row.project?.id === row.id,
    "snapshot identity",
  );
  return validateProject(row.project);
}
export function recoverLocal(raw) {
  if (raw === null) return { projects: [], recovery: false, rejected: 0 };
  let items;
  try {
    items = JSON.parse(raw);
  } catch {
    return { projects: [], recovery: true, rejected: 1 };
  }
  if (!Array.isArray(items))
    return { projects: [], recovery: true, rejected: 1 };
  const projects = [],
    ids = new Set();
  let rejected = 0;
  for (const item of items) {
    try {
      const p = validateProject(item);
      need(!ids.has(p.id), "duplicate project");
      ids.add(p.id);
      projects.push(p);
    } catch {
      rejected++;
    }
  }
  return { projects, recovery: rejected > 0, rejected };
}
