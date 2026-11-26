"use client";

import { useState } from "react";

export default function RootsysStatus({ session }) {
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setBusy(true);
    setStatus(null);
    setMessage("");
    try {
      const response = await fetch("/api/rootsys/status", {
        method: "POST",
        headers: { "x-vibeforge-session": session.token },
        cache: "no-store",
        signal: AbortSignal.timeout(25000),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || "Status unavailable.");
      setStatus(result);
    } catch (error) {
      setMessage(error.message || "Status unavailable.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="summary" aria-label="Rootsys account status">
      <h3>Rootsys models and quota</h3>
      <p>Private owner inspection. No inference or automatic polling.</p>
      <button type="button" onClick={refresh} disabled={busy}>
        {busy ? "Checking..." : "Check Rootsys status"}
      </button>
      {message && <p role="status">{message}</p>}
      {status && (
        <>
          <p>
            Pilot model: {status.pilotAvailable ? "Listed" : "Not listed"}
          </p>
          <p>Remaining tokens: {status.quota.remaining ?? "Unknown"}</p>
          <p>Used tokens: {status.quota.used ?? "Unknown"}</p>
          <p>Total tokens: {status.quota.total ?? "Unknown"}</p>
          <p>Expires: {status.quota.expiresAt ?? "Unknown"}</p>
          <details>
            <summary>Available model IDs ({status.models.length})</summary>
            <ul>
              {status.models.map((id) => (
                <li key={id}>{id}</li>
              ))}
            </ul>
          </details>
          <small>Listing a model does not enable it for generation.</small>
        </>
      )}
    </section>
  );
}
