import test from "node:test";
import assert from "node:assert/strict";
import {
  generationContext,
  generationSummary,
  geminiUsage,
  estimateGeminiCost,
} from "../lib/model-control.mjs";

const project = {
  name: "Fixture",
  type: "Website",
  idea: "Build an app password=synthetic-secret-value",
  audience: "",
  agent: "Universal",
  repository: { repo: "example/project", branch: "main" },
};

test("generation preview excludes repository unless explicitly included", () => {
  const summary = generationSummary(
    "gemini",
    "gemini-2.5-flash",
    project,
    false,
  );
  assert.equal(summary.valid, true);
  assert.deepEqual(summary.context, generationContext(project, false));
  assert.equal(summary.context.repositoryContext, "");
  assert.doesNotMatch(JSON.stringify(summary), /synthetic-secret-value/);
  assert.match(summary.notice, /pricing are unverified/);
  assert.match(
    generationContext(project, true).repositoryContext,
    /example\/project/,
  );
});

test("model control does not mark arbitrary model IDs as available", () => {
  assert.equal(
    generationSummary("gemini", "gpt-4.1-mini", project, false).valid,
    false,
  );
  assert.equal(
    generationSummary("unknown", "model", project, false).valid,
    false,
  );
});

test("Gemini usage filters provider metadata", () => {
  const metadata = {
    promptTokenCount: 100,
    candidatesTokenCount: 200,
    thoughtsTokenCount: 0,
    totalTokenCount: 300,
    secret: "synthetic-key",
  };
  assert.deepEqual(geminiUsage(metadata), {
    promptTokenCount: 100,
    candidatesTokenCount: 200,
    thoughtsTokenCount: 0,
    totalTokenCount: 300,
  });
  const partial = geminiUsage({ totalTokenCount: 7, promptTokenCount: -1 });
  assert.deepEqual(partial, { totalTokenCount: 7 });
  assert.equal(geminiUsage({ totalTokenCount: "123" }), null);
  assert.equal(geminiUsage({ totalTokenCount: Infinity }), null);
  assert.equal(geminiUsage(undefined), null);
});

test("Gemini cost uses explicit rates and reconciled usage", () => {
  const usage = {
    promptTokenCount: 500,
    candidatesTokenCount: 900,
    thoughtsTokenCount: 100,
    totalTokenCount: 1500,
  };
  assert.equal(estimateGeminiCost(usage, "1", "2"), 0.0025);
  assert.equal(estimateGeminiCost(usage, "0", "0"), 0);
  for (const rate of ["", "-1", "Infinity", "1e2", " 1"]) {
    assert.equal(estimateGeminiCost(usage, rate, "2"), null);
    assert.equal(estimateGeminiCost(usage, "1", rate), null);
  }
  const { thoughtsTokenCount, ...partial } = usage;
  assert.equal(thoughtsTokenCount, 100);
  assert.equal(estimateGeminiCost(partial, "1", "2"), null);
  partial.totalTokenCount = 1400;
  assert.equal(estimateGeminiCost(partial, "1", "2"), 0.0023);
  assert.equal(estimateGeminiCost(null, "1", "2"), null);
});
