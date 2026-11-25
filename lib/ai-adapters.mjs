import { AIError, incomplete } from "./ai-errors.mjs";
import { endpoint } from "./custom-endpoint.mjs";
import { providerById, validModel, validKey } from "./providers.mjs";
export function makeRequest(id, model, key, system, input, custom = {}) {
  if (!providerById(id) || !validModel(id, model) || !validKey(key))
    throw Error("Invalid provider configuration");
  const headers = { "Content-Type": "application/json" };
  const bearer = { ...headers, Authorization: "Bearer " + key };
  const chat = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: input },
    ],
    response_format: { type: "json_object" },
    max_tokens: 8000,
    stream: false,
  };
  switch (id) {
    case "custom-openai": {
      if (
        custom.format !== undefined &&
        !["chat", "responses"].includes(custom.format)
      )
        throw Error("Invalid custom format");
      if (custom.jsonMode !== undefined && typeof custom.jsonMode !== "boolean")
        throw Error("Invalid JSON mode");
      const kind = custom.format === "responses" ? "responses" : "chat";
      return {
        url: endpoint(custom.baseURL, kind),
        headers: bearer,
        body:
          kind === "responses"
            ? {
                model,
                instructions: system,
                input,
                max_output_tokens: 12000,
                text: { format: { type: "json_object" } },
                store: false,
              }
            : {
                model,
                messages: chat.messages,
                max_tokens: 8000,
                stream: false,
                ...(custom.jsonMode
                  ? { response_format: { type: "json_object" } }
                  : {}),
              },
      };
    }
    case "custom-anthropic":
      if (custom.auth !== undefined && !["key", "bearer"].includes(custom.auth))
        throw Error("Invalid custom auth");
      return {
        url: endpoint(custom.baseURL, "messages"),
        headers: {
          ...headers,
          ...(custom.auth === "bearer"
            ? { Authorization: "Bearer " + key }
            : { "x-api-key": key }),
          "anthropic-version": "2023-06-01",
        },
        body: {
          model,
          system,
          messages: [{ role: "user", content: input }],
          max_tokens: 12000,
        },
      };
    case "openai":
      return {
        url: "https://api.openai.com/v1/responses",
        headers: bearer,
        body: {
          model,
          instructions: system,
          input,
          text: { format: { type: "json_object" } },
          max_output_tokens: 12000,
          store: false,
        },
      };
    case "anthropic":
      return {
        url: "https://api.anthropic.com/v1/messages",
        headers: {
          ...headers,
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        body: {
          model,
          system,
          messages: [{ role: "user", content: input }],
          max_tokens: 12000,
        },
      };
    case "gemini":
      return {
        url:
          "https://generativelanguage.googleapis.com/v1beta/models/" +
          encodeURIComponent(model) +
          ":generateContent",
        headers: { ...headers, "x-goog-api-key": key },
        body: {
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: input }] }],
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 12000,
          },
        },
      };
    case "deepseek":
      return {
        url: "https://api.deepseek.com/chat/completions",
        headers: bearer,
        body: chat,
      };
    case "openrouter":
      return {
        url: "https://openrouter.ai/api/v1/chat/completions",
        headers: bearer,
        body: {
          ...chat,
          max_tokens: 12000,
          provider: { require_parameters: true },
        },
      };
  }
}
export function extractOutput(id, result, custom = {}) {
  if (!result || typeof result !== "object" || result.error)
    throw new AIError(
      "PROVIDER_RESPONSE",
      "Provider returned an error or invalid response envelope.",
    );
  if (id === "custom-openai")
    id = custom.format === "responses" ? "openai" : "deepseek";
  if (id === "custom-anthropic") id = "anthropic";
  let output = "";
  if (id === "openai") {
    if (result.status !== "completed")
      throw incomplete(result.incomplete_details?.reason);
    const content = Array.isArray(result.output)
      ? result.output.flatMap((x) =>
          Array.isArray(x?.content) ? x.content : [],
        )
      : [];
    if (content.some((x) => x?.type === "refusal")) throw incomplete("refusal");
    output = content
      .filter((x) => x?.type === "output_text" && typeof x.text === "string")
      .map((x) => x.text)
      .join("");
  } else if (id === "anthropic") {
    if (!["end_turn", "stop_sequence"].includes(result.stop_reason))
      throw incomplete(result.stop_reason);
    output = (Array.isArray(result.content) ? result.content : [])
      .filter((x) => x?.type === "text" && typeof x.text === "string")
      .map((x) => x.text)
      .join("");
  } else if (id === "gemini") {
    if (
      result.promptFeedback?.blockReason &&
      result.promptFeedback.blockReason !== "BLOCK_REASON_UNSPECIFIED"
    )
      throw incomplete("SAFETY");
    const c = result.candidates?.[0];
    if (c?.finishReason !== "STOP") throw incomplete(c?.finishReason);
    output = (Array.isArray(c.content?.parts) ? c.content.parts : [])
      .filter((x) => !x?.thought && typeof x?.text === "string")
      .map((x) => x.text)
      .join("");
  } else {
    const c = result.choices?.[0];
    if (c?.message?.refusal) throw incomplete("refusal");
    if (c?.finish_reason !== "stop") throw incomplete(c?.finish_reason);
    output = typeof c.message?.content === "string" ? c.message.content : "";
  }
  if (!output.trim())
    throw new AIError("OUTPUT_EMPTY", "Provider returned no usable text.");
  if (output.length > 400000)
    throw new AIError(
      "OUTPUT_OVERSIZED",
      "Provider response exceeded the safe size limit.",
    );
  return output;
}
export function parseOutput(text) {
  if (typeof text !== "string" || !text.trim())
    throw new AIError("OUTPUT_EMPTY", "Provider returned no usable text.", 422);
  if (text.length > 400000)
    throw new AIError(
      "OUTPUT_OVERSIZED",
      "Provider response exceeded the safe size limit.",
      422,
    );
  const trimmed = text.trim();
  const fenced = trimmed.match(
    /^\x60\x60\x60(?:json)?\s*([\s\S]*?)\s*\x60\x60\x60$/i,
  );
  try {
    const parsed = JSON.parse(fenced ? fenced[1] : trimmed);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw Error();
    return parsed;
  } catch {
    throw new AIError(
      "OUTPUT_JSON",
      "AI returned malformed JSON. No project data was changed.",
      422,
    );
  }
}
