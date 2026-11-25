import { missionBoard } from "./mission.mjs";

export function reviewLocalReceipt(project, taskId, raw) {
  if (typeof raw !== "string" || raw.length > 8192)
    throw Error("Receipt must be a JSON file of at most 8 KB.");
  let receipt;
  try {
    receipt = JSON.parse(raw);
  } catch {
    throw Error("Invalid receipt JSON.");
  }
  const task = missionBoard(project || {}).find((item) => item.id === taskId);
  const repository = project?.repository;
  if (
    !task?.assignment ||
    !["Assigned", "Handed off"].includes(task.status) ||
    task.assignment.agent !== "OpenCode" ||
    !repository
  )
    throw Error("Select a currently approved OpenCode assignment.");
  if (
    receipt?.schema !== 1 ||
    receipt.projectId !== project.id ||
    receipt.taskId !== taskId ||
    receipt.agent !== task.assignment.agent ||
    receipt.role !== task.assignment.role ||
    receipt.assignedAt !== task.assignment.assignedAt ||
    receipt.target?.repository !== repository.repo ||
    receipt.target?.branch !== repository.branch ||
    receipt.target?.commit !== repository.sha ||
    !Number.isInteger(receipt.exitCode) ||
    receipt.exitCode < 0 ||
    receipt.exitCode > 255 ||
    typeof receipt.finishedAt !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(receipt.finishedAt) ||
    !Number.isFinite(Date.parse(receipt.finishedAt)) ||
    !Number.isFinite(Date.parse(receipt.assignedAt)) ||
    Date.parse(receipt.finishedAt) < Date.parse(receipt.assignedAt)
  )
    throw Error(
      "Receipt does not match the current assignment and Git target. Older packages require manual evidence review.",
    );
  return [
    "Local OpenCode session receipt (operator supplied; unverified)",
    "Task: " + taskId,
    "Assigned role: " + task.assignment.role,
    "Assignment time: " + task.assignment.assignedAt,
    "Base commit: " + repository.sha,
    "Session exit code: " + receipt.exitCode,
    "Finished: " + receipt.finishedAt,
    "No implementation or test outcome is established by this receipt.",
    "Add actual changed files, commands, acceptance results and rollback notes before submitting.",
  ].join("\n");
}

export const openCodeRunner = [
  'import { readFileSync, writeFileSync } from "node:fs";',
  'import { spawnSync } from "node:child_process";',
  'import { createInterface } from "node:readline/promises";',
  'import { fileURLToPath } from "node:url";',
  "const fail = (message) => { console.error(message); process.exit(1); };",
  "let job;",
  'try { job = JSON.parse(readFileSync(new URL("./JOB.json", import.meta.url), "utf8")); } catch { fail("Invalid JOB.json"); }',
  'if (job?.schema !== 1 || job.agent !== "OpenCode" || typeof job.role !== "string" || !Number.isFinite(Date.parse(job.assignedAt))) fail("Current OpenCode assignment package required");',
  'const check = () => spawnSync(process.execPath, [fileURLToPath(new URL("./preflight.mjs", import.meta.url))], { stdio: "inherit", shell: false, timeout: 60000 }).status === 0;',
  'if (!check()) fail("Preflight failed; no agent launched.");',
  'if (process.argv.length !== 3 || process.argv[2] !== "--launch") { console.log("Check only. Pass --launch for interactive OpenCode."); process.exit(0); }',
  'if (!process.stdin.isTTY || !process.stdout.isTTY) fail("Interactive terminal required.");',
  'console.log("Review PROMPT.md, current VibeForge approval and installed OpenCode permissions. The agent has your local user permissions and may use paid models. No sandbox is provided. Use a trusted isolated checkout.");',
  "const rl = createInterface({ input: process.stdin, output: process.stdout });",
  'const answer = await rl.question("Type LAUNCH to start interactive OpenCode, then paste the reviewed prompt yourself: ");',
  "rl.close();",
  'if (answer !== "LAUNCH") fail("Cancelled.");',
  'if (!check()) fail("Preflight changed; no agent launched.");',
  'const run = spawnSync("opencode", [], { stdio: "inherit", shell: false });',
  'if (run.error || !Number.isInteger(run.status)) fail("Agent did not exit normally; no receipt created.");',
  "const receipt = { schema: 1, projectId: job.projectId, taskId: job.taskId, agent: job.agent, role: job.role, assignedAt: job.assignedAt, target: job.target, exitCode: run.status, finishedAt: new Date().toISOString() };",
  'try { writeFileSync(new URL("./RECEIPT.json", import.meta.url), JSON.stringify(receipt, null, 2), { flag: "wx", mode: 0o600 }); } catch { fail("Receipt not saved; existing file retained."); }',
  'console.log("RECEIPT.json saved. Exit code is not test evidence. Review and import manually.");',
  "process.exitCode = run.status;",
].join("\n");
