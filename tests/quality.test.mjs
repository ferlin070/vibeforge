import test from "node:test";
import assert from "node:assert/strict";
import { starterBlueprint } from "../lib/blueprint.mjs";
import {
  redactLog,
  analyzeLog,
  addBug,
  changeBug,
  testPlan,
  normalizeRuns,
  readiness,
  saveCheck,
  releaseChecks,
} from "../lib/quality.mjs";
import { POST } from "../app/api/ci/route.js";
process.env.NODE_ENV = "development";
delete process.env.VERCEL_ENV;
delete process.env.VIBEFORGE_REQUIRE_AUTH;
const sha = "a".repeat(40),
  p = {
    name: "Fixture",
    idea: "Build website",
    blueprint: starterBlueprint({ name: "Fixture", idea: "Build website" }),
    repository: { repo: "owner/repo", sha },
    evidence: {},
  };
test("log redaction and hypotheses do not claim root cause", () => {
  const log =
    "TypeError: bad input Authorization: Bearer secret-value sk-abcdefghijklmnop";
  assert.ok(!redactLog(log).includes("secret-value"));
  assert.ok(!redactLog(log).includes("sk-abcdefghijklmnop"));
  assert.equal(analyzeLog(log).hypotheses[0].category, "Runtime");
});
test("bug resolution requires evidence", () => {
  let q = addBug(
    p,
    {
      title: "Login fails",
      details: "401",
      severity: "High",
      task: "TASK-001",
    },
    "bug1",
    "now",
  );
  assert.equal(readiness({ ...p, quality: q }).blocking.length, 1);
  assert.throws(() =>
    changeBug({ ...p, quality: q }, "bug1", "Resolved", "", "now"),
  );
  q = changeBug(
    { ...p, quality: q },
    "bug1",
    "Resolved",
    "Retest passed",
    "now",
  );
  assert.equal(readiness({ ...p, quality: q }).blocking.length, 0);
});
test("test cases remain explicitly unexecuted", () => {
  const cases = testPlan(p);
  assert.equal(cases.length, 4);
  assert.ok(cases.every((c) => c.status === "Not executed"));
  assert.equal(cases[0].id, "TASK-001-TC-01");
});
test("CI gate binds to scanned commit and latest workflow outcome", () => {
  const ci = normalizeRuns("owner/repo", sha, {
    workflow_runs: [
      {
        id: 2,
        name: "CI",
        head_sha: sha,
        status: "completed",
        conclusion: "failure",
      },
      {
        id: 1,
        name: "CI",
        head_sha: sha,
        status: "completed",
        conclusion: "success",
      },
      {
        id: 3,
        name: "Other",
        head_sha: "b".repeat(40),
        status: "completed",
        conclusion: "success",
      },
    ],
  });
  assert.equal(ci.runs.length, 2);
  assert.equal(readiness({ ...p, quality: { ci } }).ciOk, false);
  const good = { ...ci, runs: [ci.runs[1]] };
  assert.equal(readiness({ ...p, quality: { ci: good } }).ciOk, true);
  assert.equal(
    readiness({
      ...p,
      repository: { ...p.repository, sha: "b".repeat(40) },
      quality: { ci: good },
    }).ciOk,
    false,
  );
});
test("release gates require evidence and rollback", () => {
  let x = {
    ...p,
    blueprintApproved: true,
    evidence: Object.fromEntries(
      p.blueprint.tasks.map((t) => [
        t.id,
        { report: "manual", reviewed: true },
      ]),
    ),
    quality: {
      rollback: "Restore previous commit",
      ci: normalizeRuns("owner/repo", sha, {
        workflow_runs: [
          {
            id: 1,
            name: "CI",
            head_sha: sha,
            status: "completed",
            conclusion: "success",
          },
        ],
      }),
    },
  };
  assert.equal(readiness(x).gates.filter((g) => g.ok).length, 4);
  for (const [id] of releaseChecks)
    x = { ...x, quality: saveCheck(x, id, "observed evidence", "now") };
  assert.ok(readiness(x).gates.every((g) => g.ok));
});
test("CI API only queries fixed GitHub endpoint for exact SHA", async () => {
  const old = globalThis.fetch;
  try {
    globalThis.fetch = async (url, opts) => {
      assert.equal(new URL(url).hostname, "api.github.com");
      assert.equal(new URL(url).searchParams.get("head_sha"), sha);
      assert.equal(opts.redirect, "error");
      return Response.json({
        workflow_runs: [
          {
            id: 1,
            name: "CI",
            head_sha: sha,
            status: "completed",
            conclusion: "success",
          },
        ],
      });
    };
    const r = await POST(
      new Request("http://localhost/api/ci", {
        method: "POST",
        headers: { origin: "http://localhost" },
        body: JSON.stringify({ repo: "owner/repo", sha }),
      }),
    );
    assert.equal(r.status, 200);
    assert.equal((await r.json()).ci.runs.length, 1);
    assert.equal(
      (
        await POST(
          new Request("http://localhost/api/ci", {
            method: "POST",
            headers: { origin: "http://localhost" },
            body: JSON.stringify({ repo: "https://evil.invalid", sha }),
          }),
        )
      ).status,
      400,
    );
  } finally {
    globalThis.fetch = old;
  }
});
