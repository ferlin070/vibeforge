"use client";

import { useRef, useState } from "react";
import { backupLimit, prepareBackup } from "../lib/backup.mjs";

export default function BackupImport({ onRestore, recovery }) {
  const [candidate, setCandidate] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const reading = useRef(0);
  const select = async (event) => {
    const request = ++reading.current;
    const file = event.target.files?.[0];
    setCandidate(null);
    setMessage("");
    if (!file) {
      setBusy(false);
      return;
    }
    setBusy(true);
    try {
      if (file.size > backupLimit)
        throw Error("Backup must be a JSON file of at most 5 MiB.");
      const raw = await file.text();
      const projects = prepareBackup(raw);
      if (request !== reading.current) return;
      setCandidate({ raw, names: projects.map((project) => project.name) });
    } catch (error) {
      if (request === reading.current) setMessage(error.message);
    } finally {
      if (request === reading.current) setBusy(false);
    }
  };
  return (
    <section className="panel studioPanel" aria-label="Import local backup">
      <h2>Import local backup</h2>
      <p>
        Select a VibeForge project backup JSON. Import creates new local drafts
        with new IDs, without overwriting existing projects. Approvals, task
        evidence, release checks, bug records and checkpoints are not copied.
        Architecture files require separate import. Recognized secrets are
        redacted, but review all private content before use.
      </p>
      {recovery && (
        <p role="alert">Complete local storage recovery before importing.</p>
      )}
      <label>
        Backup JSON file
        <input
          type="file"
          accept=".json,application/json"
          disabled={recovery}
          onChange={select}
        />
      </label>
      {candidate && (
        <div className="summary">
          <h3>{candidate.names.length} valid project(s)</h3>
          <ul>
            {candidate.names.slice(0, 20).map((name, index) => (
              <li key={index}>{name}</li>
            ))}
          </ul>
          {candidate.names.length > 20 && <p>Additional projects omitted.</p>}
          <button
            disabled={recovery || busy}
            onClick={() => {
              if (
                !confirm("Import all validated projects as unapproved drafts?")
              )
                return;
              try {
                const count = onRestore(candidate.raw);
                setCandidate(null);
                setMessage(count + " recovered draft(s) saved locally.");
              } catch (error) {
                setMessage(error.message);
              }
            }}
          >
            Import as new drafts
          </button>
        </div>
      )}
      {busy && <p role="status">Validating backup…</p>}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
