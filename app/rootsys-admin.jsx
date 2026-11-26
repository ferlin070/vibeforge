"use client";

import { useState } from "react";

export default function RootsysAdmin({ session }) {
  const [readiness, setReadiness] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function check() {
    setBusy(true);
    setReadiness(null);
    setMessage("");
    try {
      const response = await fetch("/api/rootsys/admin", {
        method: "POST",
        headers: { "x-vibeforge-session": session.token },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || "Readiness unavailable.");
      setReadiness(result);
    } catch (error) {
      setMessage(error.message || "Readiness unavailable.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="summary" aria-label="Rootsys admin readiness">
      <h3>Admin AI Command Center</h3>
      <p>Owner-only configuration check. No Rootsys request is sent.</p>
      <button type="button" onClick={check} disabled={busy}>
        {busy ? "Checking..." : "Check admin readiness"}
      </button>
      {message && <p role="status">{message}</p>}
      {readiness && (
        <>
          <div className="twocol">
            <div>
              <strong>Provider activation</strong>
              <p>{readiness.enabled ? "Enabled" : "Disabled"}</p>
              <strong>Server key format</strong>
              <p>{readiness.keyFormatValid ? "Valid" : "Missing or invalid"}</p>
              <strong>Owner identity</strong>
              <p>{readiness.ownerVerified ? "Verified" : "Unknown"}</p>
            </div>
            <div>
              <strong>Distributed limiter</strong>
              <p>{readiness.redisVerified ? "Verified" : "Unknown"}</p>
              <strong>Production access</strong>
              <p>{readiness.productionBlocked ? "Blocked" : "Unknown"}</p>
              <strong>Model</strong>
              <p>{readiness.model}</p>
            </div>
          </div>
          <p>Daily generation attempts: {readiness.dailyAttempts}</p>
          <p>Status checks per minute: {readiness.inspectionsPerMinute}</p>
          <small>
            Configuration checks do not validate provider authentication or
            guarantee a token budget. Settings are managed in Vercel.
          </small>
        </>
      )}
    </section>
  );
}
