export const providers = Object.freeze([
  {
    id: "rootsys",
    label: "Rootsys (managed pilot)",
    example: "deepseek-v4-flash",
    note: "Server-managed key · private preview only",
    managed: true,
  },
  {
    id: "openai",
    label: "OpenAI",
    example: "gpt-4.1-mini",
    keyHint: "sk-…",
    note: "Responses API · JSON output",
  },
  {
    id: "anthropic",
    label: "Claude (Anthropic)",
    example: "claude-sonnet-4-6",
    keyHint: "sk-ant-…",
    note: "Messages API · validated JSON",
  },
  {
    id: "gemini",
    label: "Google Gemini",
    example: "gemini-2.5-flash",
    keyHint: "AIza…",
    note: "GenerateContent API · JSON mode",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    example: "deepseek-chat",
    keyHint: "sk-…",
    note: "Chat Completions · JSON mode",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    example: "openai/gpt-4.1-mini",
    keyHint: "sk-or-…",
    note: "Chat Completions · choose a JSON-capable model",
  },
  {
    id: "custom-openai",
    label: "Custom OpenAI",
    example: "your-model-id",
    keyHint: "Gateway API key",
    note: "OpenAI-compatible chat / responses",
    custom: true,
  },
  {
    id: "custom-anthropic",
    label: "Custom Anthropic",
    example: "your-model-id",
    keyHint: "Gateway API key",
    note: "Anthropic-compatible messages",
    custom: true,
  },
]);
export function providerById(id) {
  return providers.find((p) => p.id === id);
}
export function validModel(id, model) {
  if (typeof model !== "string" || model.length > 120) return false;
  if (id === "rootsys") return model === "deepseek-v4-flash";
  if (providerById(id)?.custom)
    return /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,119}$/.test(model);
  const patterns = {
    openai: /^(gpt-|o[134]-?)[a-zA-Z0-9._-]+$/,
    anthropic: /^claude-[a-zA-Z0-9._-]+$/,
    gemini: /^gemini-[a-zA-Z0-9._-]+$/,
    deepseek: /^deepseek-[a-zA-Z0-9._-]+$/,
    openrouter: /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._:-]+$/,
  };
  return !!patterns[id]?.test(model);
}
export function validKey(key) {
  return typeof key === "string" && /^[!-~]{8,512}$/.test(key);
}
