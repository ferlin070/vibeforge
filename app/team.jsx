"use client";

import { useEffect, useRef, useState } from "react";
import TeamSpaces from "./team-space.jsx";
import { cloudRequest } from "../lib/cloud-auth.mjs";
import {
  getReceivedDraft,
  importSharedDraft,
  listSharedDrafts,
  revokeSharedDraft,
  sendSharedDraft,
  sharedBrief,
} from "../lib/team.mjs";

export default function Team({ project, session, go, onImport }) {
  const [recipient, setRecipient] = useState("");
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const active = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const run = async (operation) => {
    setBusy(true);
    try {
      await operation();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };
  const refresh = async () => {
    setRows(await listSharedDrafts(session, cloudRequest));
  };
  return (
    <>
      <div className="eyebrow">COLLABORATION PILOT</div>
      <h1>Team collaboration</h1>
      <p>
        Share a project brief with a specific account. Recipients can import
        their own independent draft. This is not a shared editing workspace.
      </p>
      {!session ? (
        <section className="panel">
          <h2>Sign in to collaborate</h2>
          <button onClick={() => go("cloud")}>Open cloud account</button>
        </section>
      ) : (
        <>
          <section className="panel studioPanel">
            <h2>Your collaboration account ID</h2>
            <p>Share this ID privately with trusted collaborators.</p>
            <code>{session.id}</code>
            <button
              className="ghost"
              onClick={() =>
                run(async () => {
                  await navigator.clipboard.writeText(session.id);
                  setMessage("Account ID copied.");
                })
              }
              disabled={busy}
            >
              Copy account ID
            </button>
          </section>
          <TeamSpaces project={project} session={session} onImport={onImport} />
          <section className="panel studioPanel">
            <h2>Share active project brief</h2>
            {!project ? (
              <p>Select a project in My projects first.</p>
            ) : (
              <>
                <h3>{project.name}</h3>
                <p>
                  Only name, type, idea, audience and preferred agent are
                  included. No approval, repository, memory or evidence is
                  shared. Recognized credentials are redacted, but inspect the
                  entire brief for private data.
                </p>
                <details>
                  <summary>Preview exact shared brief</summary>
                  <pre>{JSON.stringify(sharedBrief(project), null, 2)}</pre>
                </details>
                <label>
                  Recipient account ID
                  <input
                    maxLength={36}
                    value={recipient}
                    onChange={(event) => setRecipient(event.target.value)}
                    placeholder="Recipient UUID"
                  />
                </label>
                <button
                  disabled={busy || !recipient.trim()}
                  onClick={() =>
                    run(async () => {
                      const result = await sendSharedDraft(
                        project,
                        recipient,
                        session,
                        cloudRequest,
                        (_, target) =>
                          confirm(
                            "Send the previewed brief to account " +
                              target +
                              "? They may retain their own copy.",
                          ),
                      );
                      if (result.status === "cancelled") {
                        setMessage("Share cancelled.");
                        return;
                      }
                      setRecipient("");
                      setMessage(
                        "Brief shared. Refresh to see it in your list.",
                      );
                    })
                  }
                >
                  Share brief
                </button>
              </>
            )}
          </section>
          <section className="panel studioPanel">
            <h2>Shared drafts</h2>
            <p>Refresh to view up to 50 recent incoming and outgoing shares.</p>
            <button
              className="ghost"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await refresh();
                  setMessage("Share list refreshed.");
                })
              }
            >
              Refresh shares
            </button>
            {!rows.length && <p>No shares loaded.</p>}
            {rows.map((row) => (
              <article className="taskrow" key={row.id}>
                <div>
                  <small>
                    {row.sender_id === session.id ? "Outgoing" : "Incoming"}
                  </small>
                  <h3>{row.draft?.name || "Untitled brief"}</h3>
                  <p>{row.created_at}</p>
                  <details>
                    <summary>Review shared brief</summary>
                    <pre>{JSON.stringify(row.draft, null, 2)}</pre>
                  </details>
                </div>
                {row.sender_id === session.id ? (
                  <button
                    className="ghost"
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        const result = await revokeSharedDraft(
                          row,
                          session,
                          cloudRequest,
                          () =>
                            confirm(
                              "Revoke access to this share? Existing downloaded or imported copies cannot be recalled.",
                            ),
                        );
                        if (result.status === "revoked") {
                          setRows((items) =>
                            items.filter((item) => item.id !== row.id),
                          );
                          setMessage("Share revoked.");
                        }
                      })
                    }
                  >
                    Revoke share
                  </button>
                ) : (
                  <button
                    className="ghost"
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        if (!confirm("Import as a new unapproved local draft?"))
                          return;
                        const current = await getReceivedDraft(
                          row.id,
                          session,
                          cloudRequest,
                        );
                        if (!active.current) return;
                        onImport(
                          importSharedDraft(
                            current,
                            session,
                            crypto.randomUUID(),
                            new Date().toISOString(),
                          ),
                        );
                      })
                    }
                  >
                    Import as new draft
                  </button>
                )}
              </article>
            ))}
          </section>
        </>
      )}
      {message && <p role="status">{message}</p>}
    </>
  );
}
