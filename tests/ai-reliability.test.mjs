import test from "node:test";
import assert from "node:assert/strict";
import { starterBlueprint } from "../lib/blueprint.mjs";
import {
  scoreBlueprint,
  observableCriterion,
  validateGeneratedBlueprint,
} from "../lib/blueprint-quality.mjs";
import {
  extractOutput,
  parseOutput,
  makeRequest,
} from "../lib/ai-adapters.mjs";
import { providerFailure, transportFailure } from "../lib/ai-errors.mjs";
import { POST } from "../app/api/blueprint/route.js";
const p = { name: "Fixture", idea: "Build a website" };
const b = starterBlueprint(p);
test("quality score identifies manual drafts, missing traceability and open questions", () => {
  const q = scoreBlueprint(b);
  assert.ok(q.score < 60);
  assert.equal(q.requirementCount, 0);
  assert.equal(q.openQuestions, 3);
  assert.ok(q.warnings.some((w) => w.includes("Placeholder")));
  assert.equal(scoreBlueprint(null).score, 0);
});
test("traceability references stable FR and NFR IDs and reports missing IDs", () => {
  const x = structuredClone(b);
  x.documents.prd = "FR-001 FR-002 NFR-003";
  x.tasks[0].description = "Implement FR-001 NFR-003";
  const q = scoreBlueprint(x);
  assert.equal(q.requirementCount, 3);
  assert.equal(q.tracedCount, 2);
  assert.ok(q.warnings.some((w) => w.includes("FR-002")));
});
test("strict generated output rejects unsafe fields, oversized acceptance and invalid structure", () => {
  assert.deepEqual(validateGeneratedBlueprint(b), b);
  assert.throws(() => validateGeneratedBlueprint({ ...b, unexpected: true }));
  assert.throws(() =>
    validateGeneratedBlueprint(
      JSON.parse(
        JSON.stringify(b).replace(
          '"documents":{',
          '"documents":{"__proto__":{},',
        ),
      ),
    ),
  );
  const x = structuredClone(b);
  x.tasks[0].acceptance = Array(161).fill("Test");
  assert.throws(() => validateGeneratedBlueprint(x));
  assert.throws(() =>
    validateGeneratedBlueprint({
      ...b,
      documents: { ...b.documents, brief: "sk-" + "A".repeat(24) },
    }),
  );
});
test("JSON accepts plain or fully fenced objects only", () => {
  assert.deepEqual(parseOutput('{"ok":true}'), { ok: true });
  assert.deepEqual(
    parseOutput(
      String.fromCharCode(96).repeat(3) +
        'json\n{"ok":true}\n' +
        String.fromCharCode(96).repeat(3),
    ),
    { ok: true },
  );
  for (const s of ["{", "[]", "null", "prefix {}", "{} trailing"])
    assert.throws(
      () => parseOutput(s),
      (e) => e.code === "OUTPUT_JSON",
    );
});
for (const [provider, result, custom, code] of [
  [
    "openai",
    {
      status: "incomplete",
      incomplete_details: { reason: "max_output_tokens" },
    },
    {},
    "OUTPUT_TRUNCATED",
  ],
  ["anthropic", { stop_reason: "max_tokens" }, {}, "OUTPUT_TRUNCATED"],
  [
    "gemini",
    { candidates: [{ finishReason: "MAX_TOKENS" }] },
    {},
    "OUTPUT_TRUNCATED",
  ],
  [
    "deepseek",
    { choices: [{ finish_reason: "length" }] },
    {},
    "OUTPUT_TRUNCATED",
  ],
  [
    "openrouter",
    { choices: [{ finish_reason: "content_filter" }] },
    {},
    "OUTPUT_BLOCKED",
  ],
  [
    "custom-openai",
    { choices: [{ finish_reason: "length" }] },
    { format: "chat" },
    "OUTPUT_TRUNCATED",
  ],
  [
    "custom-openai",
    {
      status: "incomplete",
      incomplete_details: { reason: "max_output_tokens" },
    },
    { format: "responses" },
    "OUTPUT_TRUNCATED",
  ],
  ["custom-anthropic", { stop_reason: "max_tokens" }, {}, "OUTPUT_TRUNCATED"],
  [
    "gemini",
    { promptFeedback: { blockReason: "SAFETY" } },
    {},
    "OUTPUT_BLOCKED",
  ],
  [
    "openai",
    { status: "completed", output: [{ content: [{ type: "refusal" }] }] },
    {},
    "OUTPUT_BLOCKED",
  ],
  ["anthropic", { stop_reason: "end_turn", content: [] }, {}, "OUTPUT_EMPTY"],
])
  test(provider + " " + code, () =>
    assert.throws(
      () => extractOutput(provider, result, custom),
      (e) => e.code === code,
    ),
  );
test("custom gateway configuration rejects invalid enum values", () => {
  const args = ["vendor/model", "test-key-1234", "system", "input"];
  assert.throws(() =>
    makeRequest("custom-openai", ...args, {
      baseURL: "https://gateway.example.com",
      format: "bad",
    }),
  );
  assert.throws(() =>
    makeRequest("custom-anthropic", ...args, {
      baseURL: "https://gateway.example.com",
      auth: "bad",
    }),
  );
});
test("provider errors and timeout have safe stable codes", () => {
  for (const [status, code] of [
    [401, "PROVIDER_AUTH"],
    [402, "PROVIDER_BILLING"],
    [404, "MODEL_NOT_FOUND"],
    [429, "PROVIDER_RATE_LIMIT"],
    [503, "PROVIDER_UNAVAILABLE"],
  ])
    assert.equal(providerFailure(status).code, code);
  assert.equal(
    transportFailure(new DOMException("private", "TimeoutError")).status,
    504,
  );
});
test("route returns safe failure, no automatic retry, and malformed JSON does not produce blueprint", async () => {
  process.env.NODE_ENV = "development";
  delete process.env.VERCEL_ENV;
  delete process.env.VIBEFORGE_REQUIRE_AUTH;
  const old = globalThis.fetch;
  const req = () =>
    new Request("http://localhost/api/blueprint", {
      method: "POST",
      headers: {
        origin: "http://localhost",
        "x-provider-key": "fixture-key-1234",
      },
      body: JSON.stringify({
        provider: "openai",
        model: "gpt-4.1-mini",
        project: p,
      }),
    });
  try {
    for (const [response, status, code] of [
      [
        () => new Response("private upstream secret", { status: 401 }),
        502,
        "PROVIDER_AUTH",
      ],
      [
        () =>
          Response.json({
            status: "incomplete",
            incomplete_details: { reason: "max_output_tokens" },
          }),
        502,
        "OUTPUT_TRUNCATED",
      ],
      [
        () =>
          Response.json({
            status: "completed",
            output: [{ content: [{ type: "output_text", text: "{" }] }],
          }),
        422,
        "OUTPUT_JSON",
      ],
      [
        () => {
          throw new DOMException("private upstream secret", "TimeoutError");
        },
        504,
        "PROVIDER_TIMEOUT",
      ],
    ]) {
      let calls = 0;
      globalThis.fetch = async () => {
        calls++;
        return response();
      };
      const r = await POST(req());
      const d = await r.json();
      assert.equal(r.status, status);
      assert.equal(d.code, code);
      assert.equal(calls, 1);
      assert.equal(d.blueprint, undefined);
      assert.ok(!JSON.stringify(d).includes("private upstream secret"));
    }
  } finally {
    globalThis.fetch = old;
  }
});

test("quality diagnostics flag vague acceptance and undeclared references", () => {
  assert.equal(observableCriterion("FR-001 must be implemented"), false);
  assert.equal(observableCriterion("Test the feature"), false);
  assert.equal(
    observableCriterion("Unauthorized request returns HTTP 403"),
    true,
  );
  const x = structuredClone(b);
  x.documents.prd = "FR-001";
  x.tasks[0].description = "FR-001 and FR-999";
  x.tasks[0].acceptance = ["FR-001 must work"];
  const q = scoreBlueprint(x);
  assert.deepEqual(q.unknownReferences, ["FR-999"]);
  assert.ok(
    q.taskFindings.some((t) => t.id === "TASK-001" && t.observable === 0),
  );
});
