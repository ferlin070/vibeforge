// External provider documentation, not runtime compatibility certification.
export const guideCheckedOn = "2026-11-25";

export const modelColumns = ["Gemini", "DeepSeek", "Local Ollama"];

export const agentGuides = [
  {
    name: "OpenCode",
    install: "https://opencode.ai/docs/",
    providers: "https://opencode.ai/docs/providers/",
    setup: "Follow the platform installer, then choose a provider and model.",
    models: ["Documented", "Documented", "Documented"],
  },
  {
    name: "Hermes Agent",
    install:
      "https://hermes-agent.nousresearch.com/docs/getting-started/quickstart",
    providers:
      "https://hermes-agent.nousresearch.com/docs/integrations/providers",
    setup: "Complete minimal setup, then use hermes model to choose inference.",
    models: ["Documented", "Documented", "Custom endpoint"],
  },
  {
    name: "OpenClaw",
    install: "https://docs.openclaw.ai/install",
    providers: "https://docs.openclaw.ai/providers",
    setup:
      "Install for your platform and review workspace permissions in onboarding.",
    models: ["Documented", "Documented", "Documented"],
  },
  {
    name: "OMP (oh-my-pi)",
    install: "https://github.com/can1357/oh-my-pi",
    providers:
      "https://github.com/can1357/oh-my-pi/blob/main/docs/providers.md",
    setup:
      "Choose the documented installer, then configure the model provider.",
    models: ["Documented", "Documented", "Documented"],
  },
  {
    name: "DeepSeek Harness",
    install: "https://www.deepseek.com/harness/en/",
    providers:
      "https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/guide/providers.md",
    setup: "Install the official release and configure models in settings.",
    models: ["Custom endpoint", "Documented", "Not verified"],
  },
];

export function guideFor(name) {
  return agentGuides.find((item) => item.name === name) || null;
}
