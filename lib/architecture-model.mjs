import { redactText } from "./redact.mjs";

export const httpMethods = ["GET", "POST", "PATCH", "PUT", "DELETE"];
export const relationKinds = ["one-to-one", "one-to-many", "many-to-many"];
const identifier = /^[A-Za-z][A-Za-z0-9_]{0,62}$/;
const routePattern = /^\/(?:[A-Za-z0-9_{}:/-]{0,159})$/;
const fieldTypes = ["uuid", "text", "integer", "boolean", "timestamp", "json"];
const clean = (value) => redactText(typeof value === "string" ? value : "").trim();

export function emptyArchitecture() {
  return { entities: [], relations: [], endpoints: [] };
}

export function addEntity(model, name, fields) {
  const id = clean(name);
  if (!identifier.test(id) || model.entities.some((item) => item.name === id))
    throw Error("Use a unique entity identifier.");
  if (model.entities.length >= 12) throw Error("Entity limit reached.");
  const parsed = clean(fields)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [field, type, ...extra] = item.split(":").map((part) => part.trim());
      if (extra.length || !identifier.test(field) || !fieldTypes.includes(type))
        throw Error("Use field:type with a supported data type.");
      return { name: field, type };
    });
  if (
    !parsed.length ||
    parsed.length > 20 ||
    new Set(parsed.map((item) => item.name)).size !== parsed.length
  )
    throw Error("Provide 1–20 unique fields.");
  return { ...model, entities: [...model.entities, { name: id, fields: parsed }] };
}

export function addRelation(model, from, to, kind) {
  if (
    from === to ||
    !model.entities.some((item) => item.name === from) ||
    !model.entities.some((item) => item.name === to) ||
    !relationKinds.includes(kind)
  )
    throw Error("Select two distinct entities and a relationship.");
  if (model.relations.length >= 30) throw Error("Relationship limit reached.");
  if (model.relations.some((item) => item.from === from && item.to === to))
    throw Error("Relationship already exists.");
  return { ...model, relations: [...model.relations, { from, to, kind }] };
}

export function addEndpoint(model, method, path, access, purpose) {
  const route = clean(path);
  const description = clean(purpose).slice(0, 300);
  if (
    !httpMethods.includes(method) ||
    !routePattern.test(route) ||
    route.includes("//") ||
    !["Authenticated", "Public candidate"].includes(access) ||
    !description
  )
    throw Error("Provide a valid method, route, access and purpose.");
  if (model.endpoints.length >= 30) throw Error("Endpoint limit reached.");
  if (model.endpoints.some((item) => item.method === method && item.path === route))
    throw Error("Endpoint already exists.");
  return {
    ...model,
    endpoints: [...model.endpoints, { method, path: route, access, purpose: description }],
  };
}

export function removeEntity(model, name) {
  return {
    ...model,
    entities: model.entities.filter((item) => item.name !== name),
    relations: model.relations.filter((item) => item.from !== name && item.to !== name),
  };
}

export function exportArchitecture(model) {
  return JSON.stringify(
    {
      schema: 1,
      status: "Proposed only",
      notice: "Not a SQL migration, approved specification or verified security design.",
      ...model,
    },
    null,
    2,
  );
}
