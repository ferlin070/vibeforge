"use client";

import { useEffect, useRef, useState } from "react";
import { cloudRequest } from "../lib/cloud-auth.mjs";
import { sharedBrief } from "../lib/team.mjs";
import {
  addMember,
  assignableRoles,
  canManageMember,
  canPublish,
  canRevoke,
  changeMember,
  createSpace,
  importTeamBrief,
  listSpaces,
  loadSpace,
  publishBrief,
  readTeamBrief,
  removeMember,
  revokeBrief,
} from "../lib/team-space.mjs";

export default function TeamSpaces({ project, session, onImport }) {
  const [spaces, setSpaces] = useState([]);
  const [workspace, setWorkspace] = useState(null);
  const [name, setName] = useState("");
  const [account, setAccount] = useState("");
  const [newRole, setNewRole] = useState("viewer");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const active = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const run = async (operation) => {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      await operation();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };
  const refresh = async (id) => {
    setSpaces(await listSpaces(session, cloudRequest));
    if (id) {
      setWorkspace(null);
      setWorkspace(await loadSpace(id, session, cloudRequest));
    }
  };
  const role = workspace?.role;
  const roles = assignableRoles(role);
  const teamId = workspace?.space.id;
  return (
    <section className="panel studioPanel" aria-label="Team workspaces">
      <div className="eyebrow">TEAM WORKSPACE PILOT</div>
      <h2>Team workspaces</h2>
      <p>
        Owner manages the workspace and all roles. Admin manages editors and
        viewers. Editor publishes project briefs. Viewer reads and imports
        independent drafts. Permissions are enforced by the database.
      </p>
      <label>
        Workspace name
        <input
          value={name}
          maxLength={120}
          onChange={(event) => setName(event.target.value)}
          placeholder="Product team"
          disabled={busy}
        />
      </label>
      <button
        className="ghost"
        disabled={busy || !name.trim()}
        onClick={() =>
          run(async () => {
            if (!confirm("Create this new team workspace?")) return;
            const team = await createSpace(name, session, cloudRequest);
            setName("");
            await refresh(team.id);
            setMessage("Workspace created.");
          })
        }
      >
        Create workspace
      </button>
      <button
        className="ghost"
        disabled={busy}
        onClick={() => run(() => refresh(teamId))}
      >
        Refresh workspaces
      </button>
      <label>
        Active team workspace
        <select
          value={teamId || ""}
          disabled={busy}
          onChange={(event) => {
            const id = event.target.value;
            setWorkspace(null);
            setAccount("");
            if (id) run(() => refresh(id));
          }}
        >
          <option value="">Select a workspace</option>
          {spaces.map((space) => (
            <option key={space.id} value={space.id}>
              {space.name}
            </option>
          ))}
        </select>
      </label>
      {workspace && (
        <>
          <div className="summary">
            <h3>{workspace.space.name}</h3>
            <p>Your role: {role}</p>
            <small>Owner account: {workspace.space.owner_id}</small>
          </div>
          <h3>Members</h3>
          <small>Showing up to 100 members. Account IDs are private contact data.</small>
          {roles.length > 0 && (
            <div className="twocol">
              <label>
                Member account ID
                <input
                  value={account}
                  maxLength={36}
                  disabled={busy}
                  onChange={(event) => setAccount(event.target.value)}
                />
              </label>
              <label>
                New member role
                <select
                  value={roles.includes(newRole) ? newRole : roles[0]}
                  disabled={busy}
                  onChange={(event) => setNewRole(event.target.value)}
                >
                  {roles.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <button
                className="ghost"
                disabled={busy || !account.trim()}
                onClick={() =>
                  run(async () => {
                    const desired = roles.includes(newRole) ? newRole : roles[0];
                    if (!confirm("Grant " + desired + " access to account " + account + "? They can read published briefs.")) return;
                    await addMember(teamId, account, desired, session, cloudRequest);
                    setAccount("");
                    await refresh(teamId);
                    setMessage("Member added.");
                  })
                }
              >
                Add member
              </button>
            </div>
          )}
          {workspace.roster.map((member) => (
            <article className="taskrow" key={member.user_id}>
              <div>
                <small>{member.user_id}</small>
                <p>{member.role}</p>
              </div>
              {canManageMember(role, member.role) && member.user_id !== session.id && (
                <>
                  <label>
                    Change member role
                    <select
                      aria-label={"Role for " + member.user_id}
                      value={member.role}
                      disabled={busy}
                      onChange={(event) => {
                        const next = event.target.value;
                        run(async () => {
                          if (!confirm("Change this member to " + next + "?")) return;
                          await changeMember(member, next, session, cloudRequest);
                          await refresh(teamId);
                          setMessage("Member role updated.");
                        });
                      }}
                    >
                      {roles.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="ghost"
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        if (!confirm("Remove this member's access to the workspace?")) return;
                        await removeMember(member, session, cloudRequest);
                        await refresh(teamId);
                        setMessage("Member access removed.");
                      })
                    }
                  >
                    Remove member
                  </button>
                </>
              )}
            </article>
          ))}
          {role !== "owner" && (
            <button
              className="ghost"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const own = workspace.roster.find((member) => member.user_id === session.id);
                  if (!own) throw Error("Refresh the member list before leaving.");
                  if (!confirm("Leave this workspace? Local imported copies remain.")) return;
                  await removeMember(own, session, cloudRequest);
                  setWorkspace(null);
                  await refresh();
                  setMessage("Workspace left.");
                })
              }
            >
              Leave workspace
            </button>
          )}
          <h3>Published project briefs</h3>
          <p>
            Publications are immutable planning copies, not live shared
            projects. Import creates a new unapproved local draft. Revocation
            cannot recall copies already imported.
          </p>
          {canPublish(role) && project && (
            <>
              <details>
                <summary>Preview team publication</summary>
                <pre>{JSON.stringify(sharedBrief(project), null, 2)}</pre>
              </details>
              <button
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    if (!confirm("Publish the previewed brief to all current and future workspace members?")) return;
                    await publishBrief(teamId, project, session, cloudRequest);
                    await refresh(teamId);
                    setMessage("Brief published.");
                  })
                }
              >
                Publish active project brief
              </button>
            </>
          )}
          {!workspace.publications.length && <p>No published briefs.</p>}
          {workspace.publications.map((brief) => (
            <article className="taskrow" key={brief.id}>
              <div>
                <h3>{brief.draft?.name || "Untitled brief"}</h3>
                <small>{brief.created_at}</small>
                <details>
                  <summary>Review publication</summary>
                  <pre>{JSON.stringify(brief.draft, null, 2)}</pre>
                </details>
              </div>
              <button
                className="ghost"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    if (!confirm("Import as a new unapproved local draft?")) return;
                    const current = await readTeamBrief(teamId, brief.id, session, cloudRequest);
                    if (!active.current) return;
                    onImport(importTeamBrief(current, session, crypto.randomUUID(), new Date().toISOString()));
                  })
                }
              >
                Import team draft
              </button>
              {canRevoke(role, brief.author_id, session.id) && (
                <button
                  className="ghost"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      if (!confirm("Revoke this publication for all members? Imported copies remain.")) return;
                      await revokeBrief(teamId, brief.id, session, cloudRequest);
                      await refresh(teamId);
                      setMessage("Publication revoked.");
                    })
                  }
                >
                  Revoke publication
                </button>
              )}
            </article>
          ))}
          <small>Showing up to 50 recent publications. Refresh before relying on access state.</small>
        </>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
