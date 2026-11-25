import { missionBoard, missionPrompt } from "./mission.mjs";
import { reportTemplate } from "./context.mjs";
import { redactData, redactText } from "./redact.mjs";

const preflight = [
  'import { readFileSync } from "node:fs";',
  'import { spawnSync } from "node:child_process";',
  'const stop = (message) => { console.error(message); process.exit(1); };',
  'let job;',
  'try { job = JSON.parse(readFileSync(new URL("./JOB.json", import.meta.url), "utf8")); } catch { stop("Invalid JOB.json"); }',
  'if (job.schema !== 1 || !job.target || !/^[0-9a-f]{40}$/.test(job.target.commit)) stop("Invalid target");',
  'const git = (...args) => {',
  '  const result = spawnSync("git", args, { encoding: "utf8", timeout: 10000, maxBuffer: 1048576 });',
  '  if (result.status !== 0) stop("Git inspection failed");',
  '  return result.stdout.trim();',
  '};',
  'const remote = git("config", "--local", "--get", "remote.origin.url");',
  'const match = remote.match(/^(?:https:\\/\\/github\\.com\\/|git@github\\.com:|ssh:\\/\\/git@github\\.com\\/)([A-Za-z0-9_.-]+\\/[A-Za-z0-9_.-]+?)(?:\\.git)?$/i);',
  'if (!match || match[1].toLowerCase() !== job.target.repository.toLowerCase()) stop("Origin mismatch");',
  'if (git("branch", "--show-current") !== job.target.branch) stop("Branch mismatch");',
  'if (git("rev-parse", "HEAD") !== job.target.commit) stop("Commit mismatch");',
  'if (git("status", "--porcelain", "--untracked-files=all")) stop("Working tree is not clean");',
  'console.log("PASS: local Git target matches the exported snapshot. Confirm current approval in VibeForge before manually handing off PROMPT.md. No agent was executed.");',
].join("\n");

export function localHandoffFiles(project, taskId) {
  const task = missionBoard(project || {}).find((item) => item.id === taskId);
  if (
    !task?.assignment ||
    !["Assigned", "Handed off"].includes(task.status)
  )
    throw Error("An approved assigned task with reviewed dependencies is required.");
  const repository = project.repository;
  if (
    !repository ||
    !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository.repo || "") ||
    typeof repository.branch !== "string" ||
    !repository.branch ||
    !/^[0-9a-f]{40}$/.test(repository.sha || "")
  )
    throw Error("Scan an exact GitHub branch and commit first.");
  const manifest = redactData({
    schema: 1,
    projectId: project.id,
    taskId,
    agent: task.assignment.agent,
    role: task.assignment.role,
    target: {
      repository: repository.repo,
      branch: repository.branch,
      commit: repository.sha,
    },
    note: "Exported snapshot only; not current authorization.",
  });
  return {
    "JOB.json": JSON.stringify(manifest, null, 2),
    "PROMPT.md": redactText(missionPrompt(project, taskId)),
    "REPORT_TEMPLATE.md": reportTemplate(),
    "preflight.mjs": preflight,
    "README.md": [
      "# Local agent handoff",
      "Extract this ZIP outside your Git worktree. Review all contents and remove private data before sharing.",
      "In your existing project repository, run node followed by the absolute path to preflight.mjs. Node.js and Git must be installed.",
      "The script checks origin, branch, exact commit and clean working tree. It does not connect to the network or execute the coding agent.",
      "If it fails, inspect the discrepancy manually. Never reset or discard work just to make a check pass.",
      "Reconfirm the task and current approval in VibeForge, then manually give PROMPT.md to your agent.",
      "Return actual evidence through Mission Control. The report template is blank; export is not proof of work.",
    ].join("\n\n"),
  };
}
