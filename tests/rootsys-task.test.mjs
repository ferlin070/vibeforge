import test from "node:test";
import assert from "node:assert/strict";
import { starterBlueprint } from "../lib/blueprint.mjs";
import { assignTask, handoffTask } from "../lib/mission.mjs";
import {
  taskPlanContext,
  validateTaskPlan,
  normalizeTask,
} from "../lib/rootsys-task.mjs";
import { POST } from "../app/api/rootsys/task/route.js";

const project = {
  name: "Fixture",
  idea: "Build a website",
  blueprintApproved: true,
  blueprint: starterBlueprint({ name: "Fixture", idea: "Build a website" }),
  evidence: {},
  repository: { repo: "private-fixture" },
};
const id = project.blueprint.tasks[0].id;
const now = "2026-01-01";
const assigned = {
  ...project,
  ...assignTask(project, id, "pm", "Codex", now),
};
const plan = {
  steps: ["Prepare the scope."],
  tests: ["Verify a visible result."],
  risks: ["Review assumptions."],
};

test("task planner requires local approval and an assigned ready task", () => {
  assert.throws(() => taskPlanContext(project, id));
  assert.throws(() =>
    taskPlanContext({ ...assigned, blueprintApproved: false }, id),
  );
  const context = taskPlanContext(assigned, id);
  assert.equal(context.id, id);
  assert.equal(context.role, "pm");
  assert.ok(!JSON.stringify(context).includes("private-fixture"));
  assert.throws(() =>
    taskPlanContext({ ...assigned, ...handoffTask(assigned, id, now) }, id),
  );
  assert.deepEqual(normalizeTask({ ...context, extra: "ignored" }), context);
});

test("advisory response only accepts bounded text sections", () => {
  assert.deepEqual(validateTaskPlan(plan), plan);
  assert.throws(() => validateTaskPlan({ ...plan, command: "untrusted" }));
  assert.throws(() => validateTaskPlan({ ...plan, tests: [] }));
  assert.throws(() => validateTaskPlan({ ...plan, risks: ["x".repeat(501)] }));
});

test("task route shares owner quota and calls only the fixed gateway", async () => {
  const env = {
    VERCEL_ENV: "preview",
    ROOTSYS_ENABLED: "true",
    ROOTSYS_OWNER_ID: "fixture-owner",
    ROOTSYS_API_KEY: "fixture-secret",
    ROOTSYS_DAILY_OUTPUT_BUDGET: "16000",
    NEXT_PUBLIC_SUPABASE_URL: "https://fixture.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fixture",
    UPSTASH_REDIS_REST_URL: "https://redis.example",
    UPSTASH_REDIS_REST_TOKEN: "fixture-redis",
  };
  const previous = { ...process.env };
  const original = globalThis.fetch;
  let owner = "fixture-owner";
  let allowed = 1;
  let calls = 0;
  const request = () =>
    new Request("https://app.example/api/rootsys/task", {
      method: "POST",
      headers: {
        origin: "https://app.example",
        "x-vibeforge-session": "fake.session.token",
      },
      body: JSON.stringify(taskPlanContext(assigned, id)),
    });
  try {
    Object.assign(process.env, env);
    globalThis.fetch = async (url, options) => {
      if (url === "https://fixture.supabase.co/auth/v1/user")
        return Response.json({ id: owner });
      if (url === "https://redis.example/") {
        assert.equal(JSON.parse(options.body)[5], "2");
        return Response.json({ result: allowed });
      }
      assert.equal(url, "https://rootsys.cloud/v1/chat/completions");
      assert.equal(options.redirect, "error");
      const body = JSON.parse(options.body);
      assert.equal(body.model, "deepseek-v4-flash");
      assert.equal(body.max_tokens, 8000);
      assert.equal(body.messages[1].role, "user");
      calls++;
      return Response.json({
        choices: [
          {
            finish_reason: "stop",
            message: { content: JSON.stringify(plan) },
          },
        ],
      });
    };
    owner = "other-user";
    assert.equal((await POST(request())).status, 403);
    owner = "fixture-owner";
    allowed = 0;
    assert.equal((await POST(request())).status, 429);
    assert.equal(calls, 0);
    allowed = 1;
    const response = await POST(request());
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { plan });
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = original;
    for (const name of Object.keys(env)) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  }
});
