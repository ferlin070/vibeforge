import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { starterBlueprint } from "../lib/blueprint.mjs";
import { assignTask } from "../lib/mission.mjs";
import { localHandoffFiles } from "../lib/local-handoff.mjs";
import { redactExportText } from "../lib/redact.mjs";

const project = {
  id: "fixture",
  name: "Local connector",
  agent: "OpenCode",
  idea: "Test local handoff",
  blueprint: starterBlueprint({ name: "Fixture", idea: "Build" }),
  blueprintApproved: true,
  evidence: {},
  repository: {
    repo: "example/demo",
    branch: "audit",
    sha: "a".repeat(40),
  },
};
const assigned = (p) => ({
  ...p,
  ...assignTask(p, "TASK-001", "pm", "OpenCode", "2026-11-25"),
});

test("local package requires approval, assignment and exact repository target", () => {
  assert.throws(() => localHandoffFiles(project, "TASK-001"));
  assert.throws(() =>
    localHandoffFiles(
      { ...assigned(project), blueprintApproved: false },
      "TASK-001",
    ),
  );
  assert.throws(() =>
    localHandoffFiles({ ...assigned(project), repository: null }, "TASK-001"),
  );
  const p = assigned(project);
  const before = JSON.stringify(p);
  const files = localHandoffFiles(p, "TASK-001");
  assert.equal(JSON.stringify(p), before);
  assert.equal(JSON.parse(files["JOB.json"]).agent, "OpenCode");
  assert.equal(JSON.parse(files["JOB.json"]).target.commit, "a".repeat(40));
  assert.match(files["REPORT_TEMPLATE.md"], /Not verified/);
  assert.equal(
    redactExportText(files["preflight.mjs"]),
    files["preflight.mjs"],
  );
});

test("offline Git preflight rejects dirty trees, wrong branch and wrong origin", () => {
  const root = mkdtempSync(join(tmpdir(), "vf-local-"));
  try {
    const repo = join(root, "repo");
    const pack = join(root, "package");
    mkdirSync(repo);
    mkdirSync(pack);
    const git = (...args) =>
      execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();
    git("init", "-b", "audit");
    git("config", "user.email", "test@example.invalid");
    git("config", "user.name", "Fixture");
    git("remote", "add", "origin", "https://github.com/example/demo.git");
    writeFileSync(join(repo, "README.md"), "fixture");
    git("add", "README.md");
    git("commit", "-m", "fixture");
    const p = assigned({
      ...project,
      repository: { ...project.repository, sha: git("rev-parse", "HEAD") },
    });
    const files = localHandoffFiles(p, "TASK-001");
    for (const name of ["JOB.json", "preflight.mjs"])
      writeFileSync(join(pack, name), redactExportText(files[name]));
    const run = () =>
      spawnSync(process.execPath, [join(pack, "preflight.mjs")], {
        cwd: repo,
        encoding: "utf8",
      });
    assert.equal(run().status, 0);
    writeFileSync(join(repo, "dirty.txt"), "untracked");
    assert.match(run().stderr, /Working tree is not clean/);
    rmSync(join(repo, "dirty.txt"));
    git("branch", "-m", "different");
    assert.match(run().stderr, /Branch mismatch/);
    git("branch", "-m", "audit");
    git("remote", "set-url", "origin", "https://github.com/example/other.git");
    assert.match(run().stderr, /Origin mismatch/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
