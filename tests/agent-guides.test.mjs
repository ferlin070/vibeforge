import test from "node:test";
import assert from "node:assert/strict";
import { agents } from "../lib/context.mjs";
import { agentGuides, guideFor, modelColumns } from "../lib/agent-guides.mjs";

test("setup guides match supported agent labels and use HTTPS", () => {
  assert.equal(agentGuides.length, 5);
  assert.equal(new Set(agentGuides.map((item) => item.name)).size, 5);
  for (const item of agentGuides) {
    assert.ok(agents.includes(item.name));
    assert.equal(new URL(item.install).protocol, "https:");
    assert.equal(new URL(item.providers).protocol, "https:");
    assert.equal(item.models.length, modelColumns.length);
    assert.equal(guideFor(item.name), item);
    for (const status of item.models) {
      assert.ok(
        ["Documented", "Custom endpoint", "Not verified"].includes(status),
      );
    }
  }
  assert.equal(guideFor("Unknown"), null);
  assert.equal(guideFor("Universal"), null);
});

test("unverified local Harness support is not presented as documented", () => {
  const guide = guideFor("DeepSeek Harness");
  assert.equal(
    guide.models[modelColumns.indexOf("Local Ollama")],
    "Not verified",
  );
});
