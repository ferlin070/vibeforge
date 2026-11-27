import test from "node:test";
import assert from "node:assert/strict";
import {
  addEndpoint,
  addEntity,
  addRelation,
  clearArchitectureDraft,
  emptyArchitecture,
  exportArchitecture,
  loadArchitectureDraft,
  parseArchitecture,
  removeEntity,
  saveArchitectureDraft,
} from "../lib/architecture-model.mjs";

test("architecture draft models entities and removes dangling relationships", () => {
  const original = emptyArchitecture();
  let model = addEntity(original, "Customer", "id:uuid, name:text");
  model = addEntity(model, "Booking", "id:uuid, status:text");
  model = addRelation(model, "Customer", "Booking", "one-to-many");
  assert.equal(model.entities.length, 2);
  assert.equal(model.relations.length, 1);
  assert.deepEqual(original, emptyArchitecture());
  assert.equal(removeEntity(model, "Booking").relations.length, 0);
  assert.throws(() => addEntity(model, "Booking", "id:uuid"));
  assert.throws(() => addEntity(model, "Unsafe;DROP", "id:uuid"));
  assert.throws(() => addEntity(model, "Invalid", "id:unknown"));
  assert.throws(() => addRelation(model, "Customer", "Missing", "one-to-many"));
});

test("API draft validates unique routes and defaults to no execution", () => {
  const model = addEndpoint(
    emptyArchitecture(),
    "GET",
    "/api/bookings/{id}",
    "Authenticated",
    "Get current owner's booking",
  );
  assert.throws(() =>
    addEndpoint(
      model,
      "GET",
      "/api/bookings/{id}",
      "Authenticated",
      "Duplicate",
    ),
  );
  assert.throws(() =>
    addEndpoint(
      model,
      "GET",
      "https://example.com",
      "Authenticated",
      "External",
    ),
  );
  const exported = JSON.parse(exportArchitecture(model));
  assert.equal(exported.status, "Proposed only");
  assert.match(exported.notice, /Not a SQL migration/);
  assert.equal(exported.endpoints[0].access, "Authenticated");
});

test("architecture imports validate references and remain proposed only", () => {
  const model = addEntity(emptyArchitecture(), "Booking", "id:uuid");
  assert.deepEqual(parseArchitecture(exportArchitecture(model)), model);
  assert.throws(() =>
    parseArchitecture(
      JSON.stringify({
        ...JSON.parse(exportArchitecture(model)),
        relations: [{ from: "Booking", to: "Missing", kind: "one-to-many" }],
      }),
    ),
  );
  assert.throws(() => parseArchitecture("x".repeat(65537)));
  assert.throws(() => parseArchitecture('{"schema":2}'));
});

test("local draft storage is isolated by project and never overwrites without consent", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const model = addEntity(emptyArchitecture(), "Booking", "id:uuid");
  assert.equal(
    saveArchitectureDraft(storage, "one", model, () => false),
    true,
  );
  assert.deepEqual(loadArchitectureDraft(storage, "one"), model);
  assert.throws(() => loadArchitectureDraft(storage, "two"), /No saved/);
  assert.equal(
    saveArchitectureDraft(storage, "one", emptyArchitecture(), () => false),
    false,
  );
  assert.deepEqual(loadArchitectureDraft(storage, "one"), model);
  assert.equal(
    saveArchitectureDraft(storage, "two", emptyArchitecture(), () => true),
    true,
  );
  clearArchitectureDraft(storage, "one");
  assert.throws(() => loadArchitectureDraft(storage, "one"), /No saved/);
  assert.deepEqual(loadArchitectureDraft(storage, "two"), emptyArchitecture());
  assert.throws(() => loadArchitectureDraft(storage, "../bad"), /Invalid/);
});
