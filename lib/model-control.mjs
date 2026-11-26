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
