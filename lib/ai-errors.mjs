export class AIError extends Error {
  constructor(code, message, status = 502) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
export function providerFailure(status) {
  if (status === 401 || status === 403)
    return new AIError("PROVIDER_AUTH", "Provider authentication or permission failed. Check API key and model access.");
  if (status === 402)
    return new AIError("PROVIDER_BILLING", "Provider billing or credit limit reached. Check your provider account.");
  if (status === 429)
    return new AIError("PROVIDER_RATE_LIMIT", "Provider rate limit or quota reached. Wait or check your quota before manually retrying.", 429);
  if (status === 404)
    return new AIError("MODEL_NOT_FOUND", "Provider endpoint or model not found. Check model ID and gateway URL.");
  if (status === 400 || status === 422)
    return new AIError("PROVIDER_CONFIGURATION", "Provider rejected the request. Check model capabilities, JSON support and configuration.");
  if (status >= 500)
    return new AIError("PROVIDER_UNAVAILABLE", "Provider service is unavailable. Check provider status before manually retrying.");
  return new AIError("PROVIDER_REJECTED", "Provider rejected the request. Check provider settings.");
}
export function incomplete(reason) {
  if (["length", "max_tokens", "MAX_TOKENS", "max_output_tokens"].includes(reason))
    return new AIError("OUTPUT_TRUNCATED", "AI output reached its token limit. Reduce project scope or choose a model with sufficient output capacity.");
  if (["content_filter", "SAFETY", "RECITATION", "BLOCKLIST", "PROHIBITED_CONTENT", "SPII", "refusal"].includes(reason))
    return new AIError("OUTPUT_BLOCKED", "Provider blocked or refused the response. Review the request; no blueprint was applied.");
  return new AIError("OUTPUT_INCOMPLETE", "Provider did not return a completed text response. Check model and protocol compatibility.");
}
export function transportFailure(error) {
  if (error?.name === "TimeoutError" || error?.name === "AbortError" || error?.message === "Request timeout" || error?.message === "DNS timeout")
    return new AIError("PROVIDER_TIMEOUT", "Provider request timed out. Check your gateway or reduce scope before manually retrying.", 504);
  if (error?.message === "Unsafe DNS address" || error?.message === "Redirect blocked")
    return new AIError("GATEWAY_BLOCKED", "Custom gateway failed the public HTTPS safety checks.");
  if (error?.message === "Response too large")
    return new AIError("OUTPUT_OVERSIZED", "Provider response exceeded the safe size limit.");
  return new AIError("PROVIDER_NETWORK", "Provider connection failed. Check endpoint, network and TLS configuration.");
}
