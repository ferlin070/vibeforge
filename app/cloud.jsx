"use client";
import { redactData } from "../lib/redact.mjs";
import { useState } from "react";
import { validateBlueprint } from "../lib/blueprint.mjs";
const base = process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  pub = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
export default function Cloud({
  projects,
  selected,
  setProjects,
  setSelected,
  session,
  setSession,
  onContinue,
}) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [register, setRegister] = useState(false),
    [msg, setMsg] = useState(""),
    [busy, setBusy] = useState(false),
    [remote, setRemote] = useState([]);
  const configured =
    /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(base) &&
    pub.startsWith("sb_publishable_");
  const request = async (path, opts = {}, token = "") => {
    const res = await fetch(base + path, {
      ...opts,
      headers: {
        apikey: pub,
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...opts.headers,
      },
      cache: "no-store",
    });
    const data = await res.text();
    if (!res.ok)
      throw Error(
        "Cloud request failed (" +
          res.status +
          "). Check configuration or sign in again.",
      );
    return data ? JSON.parse(data) : null;
  };
  const auth = async (signup) => {
    setBusy(true);
    try {
      setRemote([]);
      const d = await request(
        signup ? "/auth/v1/signup" : "/auth/v1/token?grant_type=password",
        { method: "POST", body: JSON.stringify({ email, password }) },
      );
      if (d.access_token && d.user?.id) {
        setSession({
          token: d.access_token,
          id: d.user.id,
          email: d.user.email,
          expiresAt:
            Date.now() + Math.max(1, Number(d.expires_in) || 3600) * 1000,
        });
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
      setRemote(rows);
      setMsg(rows.length + " cloud snapshots found.");
    });
  const save = () =>
    run(async () => {
      const p = projects.find((x) => x.id === selected);
      if (!p) return;
      if (new TextEncoder().encode(JSON.stringify(p)).length > 1200000)
        throw Error(
          "Snapshot too large. Export the project and remove old checkpoints before saving.",
        );
      if (
        !confirm(
          "Save or replace this project snapshot in your cloud account? Recognized secret patterns will be redacted in the cloud copy; local text is unchanged.",
        )
      )
        return;
      await request(
        "/rest/v1/vibeforge_projects?on_conflict=owner_id,id",
        {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify({
            id: p.id,
            owner_id: session.id,
            project: redactData(p),
            updated_at: new Date().toISOString(),
          }),
        },
        session.token,
      );
      setMsg("Snapshot saved.");
    });
  const restore = (row) => {
    try {
      const p = row.project;
      if (
        !p ||
        p.id !== row.id ||
        typeof p.name !== "string" ||
        typeof p.idea !== "string" ||
        !Array.isArray(p.reviewed)
      )
        throw Error("Invalid snapshot");
      if (p.blueprint) validateBlueprint(p.blueprint);
      if (
        projects.some((x) => x.id === p.id) &&
        !confirm("Replace local copy with cloud snapshot?")
      )
        return;
      setProjects((xs) => [p, ...xs.filter((x) => x.id !== p.id)]);
      setSelected(p.id);
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
            <button className="ghost fullwidth" onClick={onContinue}>
              Continue in local mode →
            </button>
            <small>
              Session stays in memory across workspace navigation; sign in again
              after reload or expiry. Local data is not cleared when signing
              out.
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
                  setSession(null);
                  setRemote([]);
                  setMsg("Signed out locally.");
                }
              })
            }
          >
            Sign out
          </button>
          {remote.map((row) => (
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
                onClick={() =>
                  run(async () => {
                    if (!confirm("Delete this cloud snapshot?")) return;
                    await request(
                      "/rest/v1/vibeforge_projects?id=eq." +
                        encodeURIComponent(row.id),
                      { method: "DELETE" },
                      session.token,
                    );
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
