"use client";

import { useState } from "react";
import {
  addEndpoint,
  addEntity,
  addRelation,
  emptyArchitecture,
  exportArchitecture,
  httpMethods,
  relationKinds,
  removeEntity,
} from "../lib/architecture-model.mjs";

export default function ArchitectureModel() {
  const [model, setModel] = useState(emptyArchitecture);
  const [entity, setEntity] = useState("");
  const [fields, setFields] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [kind, setKind] = useState("one-to-many");
  const [method, setMethod] = useState("GET");
  const [path, setPath] = useState("");
  const [access, setAccess] = useState("Authenticated");
  const [purpose, setPurpose] = useState("");
  const [message, setMessage] = useState("");
  const change = (operation, success) => {
    try {
      setModel(operation());
      setMessage(success);
      return true;
    } catch (error) {
      setMessage(error.message);
      return false;
    }
  };
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([exportArchitecture(model)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "architecture-draft.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage("Draft export requested.");
  };
  return (
    <section
      className="panel studioPanel"
      aria-label="Visual Architecture Studio"
    >
      <div className="eyebrow">RC9 · DESIGN DRAFT</div>
      <h2>Visual Architecture Studio</h2>
      <p>
        Model proposed entities, relationships and API contracts. This draft is
        temporary, not an approved blueprint or a database migration. Export
        before leaving this view.
      </p>
      <div className="twocol">
        <label>
          Entity name
          <input
            value={entity}
            maxLength={63}
            onChange={(e) => setEntity(e.target.value)}
            placeholder="Booking"
          />
        </label>
        <label>
          Fields (name:type, comma separated)
          <input
            value={fields}
            maxLength={1800}
            onChange={(e) => setFields(e.target.value)}
            placeholder="id:uuid, status:text"
          />
        </label>
      </div>
      <small>Types: uuid, text, integer, boolean, timestamp, json.</small>
      <button
        className="ghost"
        onClick={() => {
          if (
            change(
              () => addEntity(model, entity, fields),
              "Entity added to draft.",
            )
          ) {
            setEntity("");
            setFields("");
          }
        }}
      >
        Add entity
      </button>
      <div className="architecture-entities">
        {model.entities.map((item) => (
          <article className="workflow-node" key={item.name}>
            <h3>{item.name}</h3>
            <dl>
              {item.fields.map((field) => (
                <div key={field.name}>
                  <dt>{field.name}</dt>
                  <dd>{field.type}</dd>
                </div>
              ))}
            </dl>
            <button
              className="ghost"
              onClick={() => {
                if (
                  confirm("Remove this entity and its draft relationships?")
                ) {
                  setModel(removeEntity(model, item.name));
                  setFrom("");
                  setTo("");
                }
              }}
            >
              Remove {item.name}
            </button>
          </article>
        ))}
      </div>
      <h3>Relationships</h3>
      <div className="twocol">
        <label>
          From entity
          <select value={from} onChange={(e) => setFrom(e.target.value)}>
            <option value="">Select entity</option>
            {model.entities.map((item) => (
              <option key={item.name}>{item.name}</option>
            ))}
          </select>
        </label>
        <label>
          To entity
          <select value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="">Select entity</option>
            {model.entities.map((item) => (
              <option key={item.name}>{item.name}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Relationship cardinality
        <select value={kind} onChange={(e) => setKind(e.target.value)}>
          {relationKinds.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
      <button
        className="ghost"
        disabled={model.entities.length < 2}
        onClick={() =>
          change(
            () => addRelation(model, from, to, kind),
            "Relationship added.",
          )
        }
      >
        Add relationship
      </button>
      {model.relations.map((item, index) => (
        <article className="taskrow" key={item.from + ":" + item.to}>
          <div>
            <strong>
              {item.from} → {item.to}
            </strong>
            <p>{item.kind}</p>
          </div>
          <button
            className="ghost"
            onClick={() =>
              setModel({
                ...model,
                relations: model.relations.filter((_, i) => i !== index),
              })
            }
          >
            Remove relationship
          </button>
        </article>
      ))}
      <h3>API contracts</h3>
      <div className="twocol">
        <label>
          HTTP method
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            {httpMethods.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          Endpoint path
          <input
            value={path}
            maxLength={160}
            onChange={(e) => setPath(e.target.value)}
            placeholder="/api/bookings/{id}"
          />
        </label>
        <label>
          Proposed access
          <select value={access} onChange={(e) => setAccess(e.target.value)}>
            <option>Authenticated</option>
            <option>Public candidate</option>
          </select>
        </label>
        <label>
          Endpoint purpose
          <input
            value={purpose}
            maxLength={300}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="Retrieve booking for current owner"
          />
        </label>
      </div>
      <button
        className="ghost"
        onClick={() => {
          if (
            change(
              () => addEndpoint(model, method, path, access, purpose),
              "API contract added.",
            )
          ) {
            setPath("");
            setPurpose("");
          }
        }}
      >
        Add endpoint
      </button>
      {model.endpoints.map((item, index) => (
        <article className="taskrow" key={item.method + ":" + item.path}>
          <div>
            <strong>
              {item.method} {item.path}
            </strong>
            <p>
              {item.access} · {item.purpose}
            </p>
          </div>
          <button
            className="ghost"
            onClick={() =>
              setModel({
                ...model,
                endpoints: model.endpoints.filter((_, i) => i !== index),
              })
            }
          >
            Remove endpoint
          </button>
        </article>
      ))}
      <p>
        Review primary and foreign keys, authorization, validation, ownership,
        retention and failure behavior before implementation. No SQL is run.
      </p>
      <button
        onClick={download}
        disabled={!model.entities.length && !model.endpoints.length}
      >
        Export architecture model
      </button>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
