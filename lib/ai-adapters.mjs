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
  if (id === "custom-openai")
    id = custom.format === "responses" ? "openai" : "deepseek";
  if (id === "custom-anthropic") id = "anthropic";
  if (id === "openai") {
    if (result.status !== "completed") throw Error("Incomplete");
    return (
      result.output
        ?.flatMap((x) => x.content || [])
        .filter((x) => x.type === "output_text")
        .map((x) => x.text)
        .join("") || ""
    );
  }
  if (id === "anthropic") {
    if (
      result.stop_reason !== "end_turn" &&
      result.stop_reason !== "stop_sequence"
    )
      throw Error("Incomplete");
    return (
      result.content
        ?.filter((x) => x.type === "text")
        .map((x) => x.text)
        .join("") || ""
    );
  }
  if (id === "gemini") {
    const c = result.candidates?.[0];
    if (c?.finishReason !== "STOP") throw Error("Incomplete");
    return (
      c.content?.parts
        ?.filter((x) => !x.thought && typeof x.text === "string")
        .map((x) => x.text)
        .join("") || ""
    );
  }
  const c = result.choices?.[0];
  if (c?.finish_reason !== "stop" || result.error) throw Error("Incomplete");
  return typeof c.message?.content === "string" ? c.message.content : "";
}
export function parseOutput(text) {
  if (typeof text !== "string" || text.length > 400000 || !text.trim())
    throw Error("Empty or oversized output");
  const trimmed = text.trim();
  const fenced = trimmed.match(
    /^\x60\x60\x60(?:json)?\s*([\s\S]*?)\s*\x60\x60\x60$/i,
  );
  return JSON.parse(fenced ? fenced[1] : trimmed);
}
