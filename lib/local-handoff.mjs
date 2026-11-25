import { missionBoard, missionPrompt } from "./mission.mjs";
import { reportTemplate } from "./context.mjs";
import { openCodeRunner } from "./local-runner.mjs";
import { redactData, redactText } from "./redact.mjs";

const preflight = [
  'import { readFileSync } from "node:fs";',
  'import { spawnSync } from "node:child_process";',
  "const stop = (message) => { console.error(message); process.exit(1); };",
  "let job;",
  'try { job = JSON.parse(readFileSync(new URL("./JOB.json", import.meta.url), "utf8")); } catch { stop("Invalid JOB.json"); }',
  'if (job?.schema !== 1 || typeof job.target?.repository !== "string" || typeof job.target?.branch !== "string" || !/^[0-9a-f]{40}$/.test(job.target?.commit)) stop("Invalid target");',
  "const git = (...args) => {",
  '  const result = spawnSync("git", ["-c", "core.fsmonitor=false", ...args], { encoding: "utf8", timeout: 10000, maxBuffer: 1048576, env: { ...process.env, GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0" } });',
  '  if (result.status !== 0) stop("Git inspection failed");',
  "  return result.stdout.trim();",
  "};",
  'const remote = git("config", "--local", "--get", "remote.origin.url");',
  "const match = remote.match(/^(?:https:\\/\\/github\\.com\\/|git@github\\.com:|ssh:\\/\\/git@github\\.com\\/)([A-Za-z0-9_.-]+\\/[A-Za-z0-9_.-]+?)(?:\\.git)?$/i);",
  'if (!match || match[1].toLowerCase() !== job.target.repository.toLowerCase()) stop("Origin mismatch");',
  'if (git("branch", "--show-current") !== job.target.branch) stop("Branch mismatch");',
  'if (git("rev-parse", "HEAD") !== job.target.commit) stop("Commit mismatch");',
  'if (git("status", "--porcelain", "--untracked-files=all")) stop("Working tree is not clean");',
  'console.log("PASS: local Git target matches the exported snapshot. Confirm current approval in VibeForge before manually handing off PROMPT.md. No agent was executed.");',
].join("\n");

export function localHandoffFiles(project, taskId) {
  const task = missionBoard(project || {}).find((item) => item.id === taskId);
  if (!task?.assignment || !["Assigned", "Handed off"].includes(task.status))
    throw Error(
      "An approved assigned task with reviewed dependencies is required.",
    );
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
    ...(task.assignment.agent === "OpenCode"
      ? { "runner.mjs": openCodeRunner }
      : {}),
    "README.md": [
      "# Local agent handoff",
      "Extract this ZIP outside your Git worktree. Review all contents and remove private data before sharing.",
      "In your existing project repository, run node followed by the absolute path to preflight.mjs. Node.js and Git must be installed.",
      "The script checks origin, branch, exact commit and clean working tree. It does not connect to the network or execute the coding agent.",
      "If it fails, inspect the discrepancy manually. Never reset or discard work just to make a check pass.",
      "Reconfirm the task and current approval in VibeForge, then manually give PROMPT.md to your agent.",
      ...(task.assignment.agent === "OpenCode"
        ? [
            "OpenCode pilot: run node with the absolute path to runner.mjs for check-only mode, or add --launch to start the installed interactive CLI. Review its permissions and costs first; paste PROMPT.md manually. Requires a trusted isolated checkout and native executable on PATH; shell wrappers are not supported. No remote execution or sandbox.",
            "The optional RECEIPT.json records session exit only. It is unsigned and not proof of implementation. Review it before importing into Mission Control.",
          ]
        : []),
      "Return actual evidence through Mission Control. The report template is blank; export is not proof of work.",
    ].join("\n\n"),
  };
}
