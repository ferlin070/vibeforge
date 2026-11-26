import { redactData } from "./redact.mjs";
import { providerById, validModel } from "./providers.mjs";

export function generationContext(project, includeRepo = false) {
  return redactData({
    name: project.name,
    type: project.type,
    idea: project.idea,
    audience: project.audience,
    agent: project.agent,
    repositoryContext: includeRepo
      ? JSON.stringify(project.repository || {}).slice(0, 8000)
      : "",
  });
}

export function generationSummary(provider, model, project, includeRepo) {
  const selected = providerById(provider);
  return {
    provider: selected?.label || "Unknown provider",
    model,
    valid: Boolean(selected && validModel(provider, model)),
    custom: Boolean(selected?.custom),
    context: generationContext(project, includeRepo),
    notice:
      "Model availability and pricing are unverified. Each request may incur provider charges. No automatic retry or fallback.",
  };
}

export function geminiUsage(metadata) {
  const result = {};
  for (const field of [
    "promptTokenCount",
    "candidatesTokenCount",
    "thoughtsTokenCount",
    "totalTokenCount",
  ]) {
    const value = metadata?.[field];
    if (Number.isSafeInteger(value) && value >= 0) result[field] = value;
  }
  return Object.keys(result).length ? result : null;
}

export function estimateGeminiCost(usage, inputRate, outputRate) {
  const counts = geminiUsage(usage);
  const validRate = (value) =>
    typeof value === "string" && /^\d{1,6}(\.\d{1,6})?$/.test(value);
  if (!counts || !validRate(inputRate) || !validRate(outputRate)) {
    return null;
  }
  const input = counts.promptTokenCount;
  const output = counts.candidatesTokenCount;
  const thinking = counts.thoughtsTokenCount ?? 0;
  const total = counts.totalTokenCount;
  if (
    input === undefined ||
    output === undefined ||
    total === undefined ||
    total !== input + output + thinking
  ) {
    return null;
  }
  const inputCost = input * Number(inputRate);
  const outputCost = (output + thinking) * Number(outputRate);
  return (inputCost + outputCost) / 1000000;
}

export function generationRecord(provider, model, status, started, ended, usage) {
  const selected = providerById(provider);
  return {
    provider: selected?.label || "Unknown provider",
    model: selected?.example === model ? selected.example : "Other model",
    status: status === "success" ? "Candidate ready" : "Failed",
    at: new Date(ended).toISOString(),
    elapsedMs: Math.max(0, ended - started),
    usage: provider === "gemini" ? geminiUsage(usage) : null,
  };
}
