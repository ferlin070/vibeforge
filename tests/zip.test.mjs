import test from "node:test";
import assert from "node:assert/strict";
import { makeZip } from "../lib/zip.mjs";
test("ZIP signatures and file count", () => {
  const z = makeZip({ "AGENTS.md": "hello", "docs/prd.md": "test" });
  const v = new DataView(z.buffer);
  assert.equal(v.getUint32(0, true), 0x04034b50);
  assert.equal(v.getUint32(z.length - 22, true), 0x06054b50);
  assert.equal(v.getUint16(z.length - 12, true), 2);
});
