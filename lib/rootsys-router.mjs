import { providerById, ROOTSYS_OUTPUT_LIMIT } from "./providers.mjs";

export function rootsysRoutePlan(context = {}) {
  const length = (value, cap) =>
    typeof value === "string" ? Math.min(value.length, cap) : 0;
  const ideaLength = length(context.idea, 12000);
  const repositoryLength = length(context.repositoryContext, 8000);
  const extended = ideaLength >= 2000 || repositoryLength >= 1500;

  return {
    policy: "pilot-v1",
    model: providerById("rootsys").example,
    contextClass: extended ? "extended" : "standard",
    outputLimit: ROOTSYS_OUTPUT_LIMIT,
    evaluationCandidate: extended ? "DeepSeek V4 Pro" : null,
    reason: extended
      ? "Longer context may warrant comparative evaluation."
      : "Use the fixed approved pilot model.",
  };
}
