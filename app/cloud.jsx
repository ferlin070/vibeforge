"use client";
import {
  saveSnapshotSafely,
  deleteSnapshotSafely,
  snapshotDraft,
} from "../lib/workspace.mjs";
import { useEffect, useRef, useState } from "react";
import { validateSnapshot } from "../lib/project-schema.mjs";
import {
  cloudConfigured,
  cloudRequest,
  sessionFrom,
  emailAuthPath,
  requestAccountEmail,
  resetRecoveredPassword,
} from "../lib/cloud-auth.mjs";
export default function Cloud({
  projects,
  selected,
  setSelected,
  onRestore,
  session,
  setSession,
  recoveryToken,
  clearRecovery,
  onContinue,
  onDraftCopy,
}) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [register, setRegister] = useState(false),
    [msg, setMsg] = useState(""),
    [busy, setBusy] = useState(false),
    [remote, setRemote] = useState([]),
    [remoteOwner, setRemoteOwner] = useState(""),
    [newPassword, setNewPassword] = useState("");
  const active = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const configured = cloudConfigured;
  const request = cloudRequest;
  const auth = async (signup) => {
    setBusy(true);
    try {
      setRemote([]);
      const d = await request(
        signup
          ? emailAuthPath("signup", window.location.origin)
          : "/auth/v1/token?grant_type=password",
        { method: "POST", body: JSON.stringify({ email, password }) },
      );
      if (!active.current) return;
      if (d.access_token && d.user?.id) {
        setSession(sessionFrom(d));
        setMsg("Signed in. Cloud snapshots require explicit save/load.");
      } else setMsg("Registration submitted. Confirm your email and sign in.");
    } catch (e) {
      setMsg(e.message);
    } finally {
      setPassword("");
      setBusy(false);
    }
  };
  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };
  const load = () =>
    run(async () => {
      const rows = await request(
        "/rest/v1/vibeforge_projects?select=id,project,updated_at&order=updated_at.desc",
        {},
        session.token,
      );
      if (!Array.isArray(rows)) throw Error("Invalid snapshot list.");
      const valid = rows.filter((row) => {
        try {
          validateSnapshot(row);
          return true;
        } catch {
          return false;
        }
      });
      if (!active.current) return;
      setRemote(valid);
      setRemoteOwner(session.id);
      setMsg(
        valid.length +
          " valid snapshots; " +
          (rows.length - valid.length) +
          " invalid snapshots excluded. Invalid cloud data was not deleted.",
      );
    });
  const save = () =>
    run(async () => {
      const p = projects.find((x) => x.id === selected);
      if (!p) return;
      const result = await saveSnapshotSafely(p, session, request, (previous) =>
        confirm(
          (previous
            ? "Replace the cloud snapshot last saved " + previous + "?"
            : "Create a new cloud snapshot?") +
            "\nRecognized secret patterns will be redacted in the cloud copy. Local text is unchanged. If the cloud version changes during this operation, the save is rejected.",
        ),
      );
      if (!active.current) return;
      if (result.status === "cancelled") {
        setMsg("Save cancelled. Existing snapshot retained.");
        return;
      }
      setRemote((rows) => [
        result.row,
        ...rows.filter((row) => row.id !== result.row.id),
      ]);
      setRemoteOwner(session.id);
      setMsg("Snapshot saved.");
    });
  const restore = (row) => {
    try {
      if (!session || remoteOwner !== session.id)
        throw Error("Sign in and list snapshots again.");
      const p = validateSnapshot(row);
      if (
        projects.some((x) => x.id === p.id) &&
        !confirm("Replace local copy with cloud snapshot?")
      )
        return;
      onRestore(row);
      setMsg("Cloud snapshot restored to this browser.");
    } catch (e) {
      setMsg(e.message);
    }
  };
  return (
    <>
      <div className="eyebrow">ACCOUNT & BACKUPS</div>
      <h1>Cloud account</h1>
      <p>
        Optional account and explicit project backups. Local projects remain on
        this browser even when you sign out; use a private browser profile on
        shared computers.
      </p>
      {!configured ? (
        <section className="panel">
          <h2>Cloud not configured</h2>
          <p>
            Set the Supabase project URL and publishable key, and apply the
            database setup from docs/CLOUD_SETUP.md. Local mode remains
            available.
          </p>
        </section>
      ) : recoveryToken ? (
        <section className="panel form">
          <h2>Choose a new password</h2>
          <p>
            Use the recovery link to change your password. You will sign in
            again afterwards.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!busy)
                run(async () => {
                  await resetRecoveredPassword(recoveryToken, newPassword);
                  if (!active.current) return;
                  setNewPassword("");
                  clearRecovery();
                  setSession(null);
                  setMsg("Password updated. Sign in again.");
                });
            }}
          >
            <label>
              New password
              <input
                required
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </label>
            <button disabled={busy || newPassword.length < 8}>
              Update password
            </button>
          </form>
          <button
            className="ghost"
            disabled={busy}
            onClick={() => {
              clearRecovery();
              setNewPassword("");
            }}
          >
            Cancel recovery
          </button>
        </section>
      ) : !session ? (
        <div className="authlayout">
          <aside className="authart">
            <span className="eyebrow">VIBEFORGE CLOUD</span>
            <h2>
              Your ideas.
              <br />
              Always within reach.
            </h2>
            <p>
              Keep a cloud snapshot of your planning documents and restore them
              whenever you need them.
            </p>
            <div className="authbenefit">✓ Owner-only database access</div>
            <div className="authbenefit">✓ Manual save and restore</div>
            <div className="authbenefit">✓ Local-first workspace</div>
          </aside>
          <section className="panel form authform">
            <div className="authtabs">
              <button
                className={!register ? "" : "ghost"}
                onClick={() => {
                  setRegister(false);
                  setMsg("");
                  setPassword("");
                }}
                disabled={busy}
              >
                Sign in
              </button>
              <button
                className={register ? "" : "ghost"}
                onClick={() => {
                  setRegister(true);
                  setMsg("");
                  setPassword("");
                }}
                disabled={busy}
              >
                Register
              </button>
            </div>
            <h2>{register ? "Create your account" : "Welcome back"}</h2>
            <p>
              {register
                ? "Register and confirm your email to use cloud snapshots."
                : "Sign in to access cloud snapshots and authenticated services."}
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!busy && email.includes("@") && password.length >= 8)
                  auth(register);
              }}
            >
              <label>
                Email
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label>
                Password
                <input
                  required
                  minLength={8}
                  type="password"
                  autoComplete={register ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <button
                className="fullwidth"
                disabled={busy || !email.includes("@") || password.length < 8}
              >
                {busy
                  ? "Please wait…"
                  : register
                    ? "Create account"
                    : "Sign in"}
              </button>
            </form>
            <button
              className="ghost"
              disabled={busy || !email.includes("@")}
              onClick={() =>
                run(async () => {
                  await requestAccountEmail(
                    "recover",
                    email,
                    window.location.origin,
                  );
                  setMsg(
                    "If the address is eligible, check your email for a password reset link.",
                  );
                })
              }
            >
              Forgot password?
            </button>
            <button
              className="ghost"
              disabled={busy || !email.includes("@")}
              onClick={() =>
                run(async () => {
                  await requestAccountEmail(
                    "resend",
                    email,
                    window.location.origin,
                  );
                  setMsg(
                    "If confirmation is pending, check your email for a new link.",
                  );
                })
              }
            >
              Resend confirmation
            </button>
            <button className="ghost fullwidth" onClick={onContinue}>
              Continue in local mode →
            </button>
            <small>
              Registration and recovery emails require an approved callback URL
              and working email delivery. If unavailable, use local mode or
              contact the service operator.
            </small>
            <small>
              Session stays in memory across workspace navigation; sign in again
              after reload or refresh failure. Access and refresh tokens are
              held only in memory. Local data is not cleared when signing out.
            </small>
          </section>
        </div>
      ) : (
        <section className="panel">
          <div className="sectionhead">
            <div>
              <span className="eyebrow">AUTHENTICATED</span>
              <h2>{session.email}</h2>
            </div>
            <button className="ghost" onClick={onContinue}>
              Go to workspace →
            </button>
          </div>
          <label>
            Local project
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">Choose project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <p>
            Backups are manual. Saves check the existing cloud version and
            reject concurrent changes.
          </p>
          <button disabled={busy || !selected} onClick={save}>
            Save cloud snapshot
          </button>
          <button className="ghost" disabled={busy} onClick={load}>
            List snapshots
          </button>
          <button
            className="ghost"
            disabled={busy}
            onClick={() =>
              run(async () => {
                try {
                  await request(
                    "/auth/v1/logout",
                    { method: "POST" },
                    session.token,
                  );
                } finally {
                  // Explicit logout must clear the initiating session even
                  // when navigation unmounts the account panel.
                  setSession((current) =>
                    current?.id === session.id &&
                    current?.refreshToken === session.refreshToken
                      ? null
                      : current,
                  );
                  if (active.current) {
                    setRemote([]);
                    setMsg("Signed out locally.");
                  }
                }
              })
            }
          >
            Sign out
          </button>
          {remoteOwner === session.id &&
            remote.map((row) => (
              <article className="taskrow" key={row.id}>
                <div>
                  <h3>{row.project?.name}</h3>
                  <small>{row.updated_at}</small>
                </div>
                <button disabled={busy} onClick={() => restore(row)}>
                  Restore local copy
                </button>
                <button
                  className="ghost"
                  disabled={busy}
                  onClick={() => {
                    try {
                      if (!session || remoteOwner !== session.id)
                        throw Error("Sign in and list snapshots again.");
                      if (
                        !confirm(
                          "Create a separate local draft from this snapshot? The original is unchanged and approvals and release evidence are reset.",
                        )
                      )
                        return;
                      onDraftCopy(
                        snapshotDraft(
                          row,
                          crypto.randomUUID(),
                          new Date().toISOString(),
                        ),
                      );
                    } catch (e) {
                      setMsg(e.message);
                    }
                  }}
                >
                  Restore as new draft
                </button>
                <button
                  className="ghost"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      if (!session || remoteOwner !== session.id)
                        throw Error("Sign in and list snapshots again.");
                      const result = await deleteSnapshotSafely(
                        row,
                        session,
                        request,
                        (timestamp) =>
                          confirm(
                            "Delete the cloud snapshot saved " +
                              timestamp +
                              "?",
                          ),
                      );
                      if (result.status === "cancelled") return;
                      setRemote((xs) => xs.filter((x) => x.id !== row.id));
                      setMsg("Cloud snapshot deleted.");
                    })
                  }
                >
                  Delete
                </button>
              </article>
            ))}
        </section>
      )}
      <p role="status">{msg}</p>
    </>
  );
}
