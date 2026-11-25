"use client";
import { redactText, redactExportText, hasSecret } from "../lib/redact.mjs";
import { useState, useEffect, useRef } from "react";
import { readRoute, routeURL, unsavedReasons, canLeave } from "../lib/navigation.mjs";
import Studio from "./studio.jsx";
import Cloud from "./cloud.jsx";
import Repository from "./repository.jsx";
import ContextManager from "./context.jsx";
import Mission from "./mission.jsx";
import Quality from "./quality.jsx";
import Guide from "./guide.jsx";
import {
  applyProjectPatch,
  impactOf,
  impactMessage,
  requiresImpactConfirmation,
} from "../lib/mission.mjs";
import { agents } from "../lib/context.mjs";
import { stages, makeBrief, makePrompt } from "../lib/planner.mjs";
import { recoverLocal, validateProject } from "../lib/project-schema.mjs";
import { refreshSession, recoveryFromFragment } from "../lib/cloud-auth.mjs";
const empty = {
  name: "",
  type: "Web application",
  idea: "",
  audience: "",
  agent: "Universal",
};
const nav = [
  ["overview", "◈", "Overview"],
  ["projects", "▤", "My projects"],
  ["new", "＋", "Project studio"],
  ["workflow", "↳", "Workflow"],
  ["docs", "▧", "Documentation"],
  ["prompt", "⌘", "Prompt lab"],
  ["studio", "✧", "AI blueprint"],
  ["repository", "⌘", "GitHub intelligence"],
  ["context", "▧", "Context manager"],
  ["mission", "◎", "Mission control"],
  ["quality", "✓", "Quality studio"],
  ["cloud", "☁", "Cloud account"],
  ["guide", "?", "Help & privacy"],
];
const modes = ["Plan", "Build", "Debug", "Audit", "Improve"];
export default function Home() {
  const [view, setView] = useState("landing"),
    [projects, setProjects] = useState([]),
    [selected, setSelected] = useState(""),
    [draft, setDraft] = useState(empty),
    [ready, setReady] = useState(false),
    [stage, setStage] = useState("discovery"),
    [mode, setMode] = useState("Plan"),
    [notice, setNotice] = useState(""),
    [step, setStep] = useState(0),
    [mobile, setMobile] = useState(false),
    [doc, setDoc] = useState(""),
    [session, setSession] = useState(null),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [recovery, setRecovery] = useState(null),
    [recoveryToken, setRecoveryToken] = useState(null),
    [docBaseline, setDocBaseline] = useState(""),
    [studioDirty, setStudioDirty] = useState(false);
  const mobileDialog = useRef(null);
  const menuButton = useRef(null);
  const mainRegion = useRef(null);
  const latestProjects = useRef(projects);
  useEffect(() => {
    latestProjects.current = projects;
  }, [projects]);
  // Browser-only hydration and persistence errors must update state after mount.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const raw = localStorage.getItem("vibeforge-v2");
      const result = recoverLocal(raw);
      setProjects(result.projects);
      const route = readRoute(window.location.search, result.projects);
      setSelected(route.selected);
      setView(route.view);
      if (route.missingProject) setNotice("Requested project is not available in this browser. Showing an available local project.");
      if (result.recovery) {
        setRecovery({ raw, rejected: result.rejected });
        setView("guide");
      }
    } catch {
      setRecovery({ raw: null, rejected: 0 });
      setView("guide");
    }
    const link = recoveryFromFragment(window.location.hash);
    if (link.recognized) {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
      setRecoveryToken(link.token);
      setView("cloud");
      if (!link.token)
        setNotice(
          "Email link handled. Sign in, or request a fresh recovery link.",
        );
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready && !recovery) {
      try {
        localStorage.setItem("vibeforge-v2", JSON.stringify(projects));
      } catch {
        setNotice(
          "Local storage unavailable. Export your work before closing.",
        );
      }
    }
  }, [projects, ready, recovery]);
  /* eslint-enable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!session) return;
    let active = true;
    const timer = setTimeout(
      async () => {
        try {
          const next = await refreshSession(session);
          if (active)
            setSession((current) => (current === session ? next : current));
        } catch {
          if (active)
            setSession((current) => (current === session ? null : current));
        }
      },
      Math.max(1000, session.expiresAt - Date.now() - 60000),
    );
    const expiry = setTimeout(
      () => {
        if (active)
          setSession((current) => (current === session ? null : current));
      },
      Math.max(0, session.expiresAt - Date.now()),
    );
    return () => {
      active = false;
      clearTimeout(timer);
      clearTimeout(expiry);
    };
  }, [session]);
  const p = projects.find((x) => x.id === selected);
  // Preserve unsaved editor text when unrelated project fields change.
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    const saved = p?.document ?? (p ? makeBrief(p) : "");
    setDoc(saved);
    setDocBaseline(saved);
  }, [selected, p?.document]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  const dirty = unsavedReasons({view,draft,empty,doc,baseline:docBaseline,studioDirty}).join("; ");
  useEffect(() => {
    if (!dirty) return;
    const warn = (event) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload",warn);
    return () => window.removeEventListener("beforeunload",warn);
  },[dirty]);
  useEffect(() => {
    if (!ready) return;
    const pop = () => {
      const route = readRoute(window.location.search,projects);
      if (route.view === view && route.selected === selected) return;
      if (!canLeave(dirty ? [dirty] : [],window.confirm.bind(window))) {
        window.history.pushState(null,"",routeURL(view,selected));
        return;
      }
      setView(route.view); setSelected(route.selected); setMobile(false);
      setStudioDirty(false);
      if(view==="new"){setDraft(empty);setStep(0);}
      if(view==="docs")setDoc(docBaseline);
      setNotice(route.missingProject?"Requested project is not available in this browser.":"");
    };
    window.addEventListener("popstate",pop);
    return () => window.removeEventListener("popstate",pop);
  },[ready,projects,view,selected,dirty,docBaseline]);
  useEffect(() => {
    if (!ready) return;
    const canonical = routeURL(view, selected);
    if (window.location.pathname + window.location.search !== canonical)
      window.history.replaceState(null,"",canonical+(view==="landing"?window.location.hash:""));
  },[ready,view,selected]);
  useEffect(() => {
    const dialog=mobileDialog.current;
    if (!dialog) return;
    if (mobile && !dialog.open) dialog.showModal();
    if (!mobile && dialog.open) dialog.close();
  },[mobile,view]);
  useEffect(() => {
    const media=window.matchMedia("(min-width: 651px)");
    const close=()=>{if(media.matches)setMobile(false)};
    media.addEventListener("change",close);
    return ()=>media.removeEventListener("change",close);
  },[]);
  useEffect(() => {
    if(ready && view!=="landing")mainRegion.current?.focus({preventScroll:true});
  },[view,ready]);
  const navigate = (v, id=selected, bypass=false) => {
    if(v===view&&id===selected){setMobile(false);return true;}
    if(!bypass&&!canLeave(dirty?[dirty]:[],window.confirm.bind(window)))return false;
    if(view==="new"||v==="new"){setStep(0);setDraft(empty);}
    if(view==="docs"&&doc!==docBaseline)setDoc(docBaseline);
    setStudioDirty(false);
    window.history.pushState(null,"",routeURL(v,id));
    setView(v);setSelected(id);setMobile(false);setNotice("");
    return true;
  };
  const go = (v) => navigate(v);
  const selectProject = (id) => navigate(view,id);
  const field = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const create = () => {
    if (!draft.name.trim() || !draft.idea.trim()) return;
    const item = {
      ...draft,
      name: draft.name.trim(),
      idea: draft.idea.trim(),
      id: globalThis.crypto?.randomUUID?.() || Date.now().toString(),
      reviewed: [],
      createdAt: new Date().toISOString(),
    };
    try {
      validateProject(item);
    } catch (e) {
      setNotice(e.message);
      return;
    }
    setProjects((x) => [item, ...x]);
    setStage("discovery");
    navigate("studio",item.id,true);
  };
  const toggle = (id) => {
    if (!p) return;
    setProjects((x) =>
      x.map((y) =>
        y.id !== p.id
          ? y
          : {
              ...y,
              reviewed: y.reviewed.includes(id)
                ? y.reviewed.filter((i) => i !== id)
                : [...y.reviewed, id],
            },
      ),
    );
  };
  const updateActive = (patch) => {
    if (!p) return false;
    const current = latestProjects.current.find((x) => x.id === p.id);
    if (current !== p) {
      setNotice("Project changed during this operation. Please try again.");
      return false;
    }
    const impact = impactOf(current, patch);
    if (requiresImpactConfirmation(impact) && !confirm(impactMessage(impact)))
      return false;
    let next;
    try {
      next = validateProject(applyProjectPatch(current, patch));
    } catch (e) {
      setNotice(e.message);
      return false;
    }
    setProjects((xs) => xs.map((x) => (x === current ? next : x)));
    return true;
  };
  const saveDoc = () => {
    if (updateActive({ document: doc })) {
      setDocBaseline(doc);
      setNotice("Document saved on this browser.");
    }
  };
  const copy = async (t) => {
    try {
      await navigator.clipboard.writeText(redactExportText(t));
      setNotice("Copied to clipboard.");
    } catch {
      setNotice("Clipboard unavailable. Select and copy the text manually.");
    }
  };
  const download = (t, name, type = "text/markdown") => {
    const u = URL.createObjectURL(new Blob([redactExportText(t)], { type }));
    const a = document.createElement("a");
    a.href = u;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(u), 1000);
    setNotice("Markdown export requested.");
  };
  const brand = (
    <span className="brand">
      <span className="logo">◈</span>Vibe<span>Forge</span>
    </span>
  );
  const visible = projects.filter(
    (x) =>
      (filter === "all" || x.reviewed.length < stages.length) &&
      [x.name, x.idea, x.type]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const count = projects.reduce((n, x) => n + (x.reviewed?.length || 0), 0);
  if (!ready) return <main className="boot-screen" aria-busy="true"><div className="brand">◈ VibeForge</div><p role="status">Loading your workspace…</p><div className="loading-track" aria-hidden="true"/></main>;
  if (view === "landing")
    return (
      <main className="landing" id="main-content">
        <header className="top">
          {brand}
          <nav>
            <a href="#workflow">How it works</a>
            <a href="#features">Features</a>
            <button className="ghost" onClick={() => go("cloud")}>
              Sign in
            </button>
            <button onClick={() => go("new")}>Get started ↗</button>
          </nav>
        </header>
        <section className="hero">
          <div className="eyebrow">
            <i /> THE AI DEVELOPMENT WORKSPACE
          </div>
          <h1>
            Build with direction.
            <br />
            <em>Ship with confidence.</em>
          </h1>
          <p>
            Turn your ideas into structured specifications, actionable workflows
            and precise coding agent instructions. Build with clarity, not
            guesswork.
          </p>
          <div className="actions">
            <button onClick={() => go("new")}>
              Start building <span>↗</span>
            </button>
            <button className="ghost" onClick={() => go("overview")}>
              Explore workspace
            </button>
          </div>
          <small>
            Release candidate 1.0 · Local-first workspace · By Ghazwah Group
          </small>
          <div className="agentstrip">
            <span>YOUR AGENT. YOUR WORKFLOW.</span>
            {[
              "Codex",
              "Claude Code",
              "Cursor",
              "Gemini CLI",
              "GitHub Copilot",
            ].map((a) => (
              <b key={a}>{a}</b>
            ))}
          </div>
        </section>
        <section id="workflow" className="showcase">
          <div className="window">
            <i />
            <i />
            <i />
            <span>VibeForge / project workspace</span>
          </div>
          <div className="preview">
            <aside>
              <strong>◈ VibeForge</strong>
              {nav.map((n) => (
                <div key={n[0]}>
                  {n[1]} &nbsp; {n[2]}
                </div>
              ))}
            </aside>
            <div>
              <div className="eyebrow">PROJECT PIPELINE</div>
              <h2>From idea to production.</h2>
              <div className="previewgrid">
                {stages.map((s, i) => (
                  <article key={s[0]}>
                    <span>0{i + 1}</span>
                    <h3>{s[1]}</h3>
                    <small>{s[2]}</small>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
        <section id="features" className="features">
          <div className="eyebrow">THE WORKSPACE</div>
          <h2>One source of truth for every build.</h2>
          <div className="tiles">
            {[
              [
                "01",
                "Structured planning",
                "Turn a rough idea into a project brief and staged workflow.",
              ],
              [
                "02",
                "Agent handoff",
                "Generate targeted prompt templates for Codex, Claude Code and more.",
              ],
              [
                "03",
                "Portable context",
                "Edit, save and export project documentation as Markdown.",
              ],
              [
                "04",
                "AI blueprint",
                "Generate a structured blueprint with your own API key or use manual mode.",
              ],
              [
                "05",
                "Task dependencies",
                "Review tasks in dependency order and record implementation evidence.",
              ],
              [
                "06",
                "Cloud snapshots",
                "Keep optional backups in your own authenticated cloud account.",
              ],
            ].map((x) => (
              <article key={x[0]}>
                <span className="eyebrow">{x[0]}</span>
                <h3>{x[1]}</h3>
                <p>{x[2]}</p>
              </article>
            ))}
          </div>
        </section>
        <footer>
          © VibeForge · Powered by Ghazwah Group{" "}
          <button className="ghost" onClick={() => go("guide")}>
            Help & privacy
          </button>{" "}
          <button className="ghost" onClick={() => go("overview")}>
            Open workspace ↗
          </button>
        </footer>
      </main>
    );
  const sidebarContent = <>        {brand}
        <div className="workspace-id">
          <span className="workspace-icon">VF</span>
          <div>
            <b>My workspace</b>
            <small>Personal workspace</small>
          </div>
        </div>
        <nav aria-label="Workspace navigation">
        {[["Workspace",nav.slice(0,3)],["Build",nav.slice(3,9)],["Verify",nav.slice(9,11)],["Account",nav.slice(11)]].map(([label,items])=>(<div className="navgroup" key={label}><div className="side-label">{label}</div>{items.map((n) => (
          <button
            key={n[0]}
            className={view === n[0] ? "nav active" : "nav"}
            aria-current={view===n[0]?"page":undefined}
            onClick={() => go(n[0])}
          >
            <span aria-hidden="true">{n[1]}</span>
            {n[2]}
          </button>
        ))}</div>))}</nav>
        <div className="sidebottom">
          <div className="local">
            <i /> {session ? "Cloud session active" : "Local-first mode"}
          </div>
          <p>
            {session
              ? "Cloud backups are manual. Local data stays on this browser."
              : "Local projects stay on this browser. Sign in for cloud snapshots."}
          </p>
          <button className="nav" onClick={() => go("landing")}>
            ↖ &nbsp; Back to website
          </button>
        </div>
</>;
  return (
    <div className="shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <aside className="sidebar" aria-label="Workspace sidebar">{sidebarContent}</aside>
      <dialog ref={mobileDialog} id="mobile-navigation" className="mobile-drawer" aria-label="Workspace navigation" onClose={()=>{setMobile(false);menuButton.current?.focus();}}>
        <button className="ghost drawer-close" onClick={()=>setMobile(false)}>Close navigation ×</button>
        {sidebarContent}
      </dialog>
      <div className="work">
        <header className="worktop">
          <button
            className="ghost mobile"
            ref={menuButton}
            aria-label="Toggle navigation"
            aria-expanded={mobile}
            aria-controls="mobile-navigation"
            onClick={() => setMobile(!mobile)}
          >
            ☰
          </button>
          <span>
            Workspace <b>/ {nav.find((n) => n[0] === view)?.[2]}</b>
          </span>
          <div className="topactions">
            <button
              className="ghost accountchip"
              onClick={() => go("cloud")}
              title={session?.email || "Sign in"}
            >
              {session ? "● Account" : "Sign in"}
            </button>
            <button onClick={() => go("new")}>＋ New project</button>
          </div>
        </header>
        <main className="content" id="main-content" ref={mainRegion} tabIndex={-1}>
          {dirty && <p className="draft-status" role="status">Unsaved work · {dirty}</p>}
          {view === "overview" && (
            <>
              <div className="banner">
                <div>
                  <div className="eyebrow">YOUR DEVELOPMENT HQ</div>
                  <h1>What will you build today?</h1>
                  <p>
                    Plan smarter. Give every coding agent the context it
                    deserves.
                  </p>
                  <button onClick={() => go("new")}>Create a project ↗</button>
                </div>
                <div className="forgegraphic" aria-hidden="true">
                  <div className="forge-ring">
                    <div className="forge-ring inner">
                      <span>◈</span>
                    </div>
                  </div>
                  <div className="forge-node n1">PLAN</div>
                  <div className="forge-node n2">BUILD</div>
                  <div className="forge-node n3">VERIFY</div>
                </div>
              </div>
              <div className="stats">
                {[
                  ["Projects", projects.length],
                  ["Reviewed stages", count],
                  ["Workflow stages", stages.length],
                  ["Cloud", session ? "Signed in" : "Optional"],
                ].map((s) => (
                  <article key={s[0]}>
                    <small>{s[0]}</small>
                    <strong>{s[1]}</strong>
                  </article>
                ))}
              </div>
              <div className="quickstart">
                <div>
                  <span className="eyebrow">GET STARTED</span>
                  <h2>Choose your next step</h2>
                </div>
                {[
                  ["studio", "AI blueprint", "Plan an application"],
                  [
                    "repository",
                    "Repository",
                    "Inspect existing code inventory",
                  ],
                  [
                    "mission",
                    "Mission control",
                    "Coordinate your coding agent",
                  ],
                  ["quality", "Quality studio", "Review release evidence"],
                ].map(([id, t, d]) => (
                  <button className="ghost" key={id} onClick={() => go(id)}>
                    <strong>{t} →</strong>
                    <small>{d}</small>
                  </button>
                ))}
              </div>
              <div className="sectionhead">
                <div>
                  <div className="eyebrow">PROJECTS</div>
                  <h2>Continue building</h2>
                </div>
                <button className="ghost" onClick={() => go("projects")}>
                  View all →
                </button>
              </div>
              <div className="tiles">
                {projects.length ? (
                  projects.map((x) => (
                    <article key={x.id}>
                      <small>{x.type}</small>
                      <h3>{x.name}</h3>
                      <progress aria-label={"Reviewed stages for "+x.name} max={8} value={x.reviewed.length} />
                      <p>{x.reviewed.length}/8 stages manually reviewed</p>
                      <button
                        className="ghost"
                        onClick={() => {
                          navigate("workflow",x.id);
                        }}
                      >
                        Open workspace →
                      </button>
                    </article>
                  ))
                ) : (
                  <article className="empty">
                    <h3>No projects yet</h3>
                    <p>Create your first project to start the workflow.</p>
                    <button onClick={() => go("new")}>Start a project</button>
                  </article>
                )}
              </div>
            </>
          )}
          {view === "projects" && (
            <>
              <div className="eyebrow">PROJECT LIBRARY</div>
              <h1>My projects</h1>
              <p>Manage your local project collection.</p>
              <div className="filterbar">
                <label>
                  Search projects
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name, type or idea…"
                  />
                </label>
                <label>
                  Review status
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="all">All projects</option>
                    <option value="inprogress">In progress</option>
                  </select>
                </label>
                <small>
                  {visible.length} of {projects.length} projects
                </small>
              </div>
              {!visible.length && <section className="panel empty"><h2>{projects.length?"No matching projects":"No projects yet"}</h2><p>{projects.length?"Try a different search or reset the filters.":"Create a project to start planning."}</p>{projects.length?<button className="ghost" onClick={()=>{setQuery("");setFilter("all");}}>Reset filters</button>:<button onClick={()=>go("new")}>Create project</button>}</section>}
              <div className="tiles">
                {visible.map((x) => (
                  <article key={x.id}>
                    <small>{x.type}</small>
                    <h3>{x.name}</h3>
                    <p>{x.idea.slice(0, 150)}</p>
                    <button
                      onClick={() => {
                        navigate("workflow",x.id);
                      }}
                    >
                      Open →
                    </button>
                    <button
                      className="ghost"
                      onClick={() => {
                        if (confirm("Delete this local project?")) {
                          setProjects((a) => a.filter((y) => y.id !== x.id));
                          if (selected === x.id)
                            setSelected(
                              projects.find((y) => y.id !== x.id)?.id || "",
                            );
                        }
                      }}
                    >
                      Delete
                    </button>
                  </article>
                ))}
                <article>
                  <h3>New project</h3>
                  <button onClick={() => go("new")}>＋ Create</button>
                </article>
              </div>
            </>
          )}
          {view === "new" && (
            <>
              <div className="eyebrow">PROJECT STUDIO</div>
              <h1>Let&apos;s forge your idea.</h1>
              <p>Three simple steps to a structured project brief.</p>
              <div className="steps">
                {["Project", "Discovery", "Handoff"].map((s, i) => (
                  <span key={s} aria-current={i===step?"step":undefined} className={i === step ? "current" : ""}>
                    {i + 1}. {s}
                  </span>
                ))}
              </div>
              <section className="panel form">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (step < 2) setStep(step + 1);
                    else create();
                  }}
                >
                  {step === 0 && (
                    <>
                      <label>
                        Project name
                        <input
                          required
                          maxLength={200}
                          value={draft.name}
                          onChange={(e) => field("name", e.target.value)}
                          placeholder="e.g. Smart Booking"
                        />
                      </label>
                      <label>
                        Project type
                        <select
                          value={draft.type}
                          onChange={(e) => field("type", e.target.value)}
                        >
                          {[
                            "Website",
                            "Web application",
                            "Mobile application",
                            "Desktop software",
                            "SaaS",
                            "AI agent",
                            "Game",
                          ].map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </label>
                    </>
                  )}
                  {step === 1 && (
                    <>
                      <label>
                        What do you want to build?
                        <textarea
                          required
                          rows={7}
                          maxLength={12000}
                          value={draft.idea}
                          onChange={(e) => field("idea", e.target.value)}
                          placeholder="Describe your idea, business problem and desired features..."
                        />
                      </label>
                      {hasSecret(draft.idea) && (
                        <div className="summary" role="status">
                          <p>
                            Possible credential detected. Your idea is unchanged
                            unless you choose to redact.
                          </p>
                          <button
                            type="button"
                            className="ghost"
                            onClick={() =>
                              field("idea", redactText(draft.idea))
                            }
                          >
                            Redact recognized secrets
                          </button>
                        </div>
                      )}
                      <label>
                        Target users (optional)
                        <input
                          maxLength={500}
                          value={draft.audience}
                          onChange={(e) => field("audience", e.target.value)}
                          placeholder="e.g. small business owners"
                        />
                      </label>
                    </>
                  )}
                  {step === 2 && (
                    <>
                      <label>
                        Preferred coding agent
                        <select
                          value={draft.agent}
                          onChange={(e) => field("agent", e.target.value)}
                        >
                          {[
                            "Universal",
                            "Codex",
                            "Claude Code",
                            "Cursor",
                            "Gemini CLI",
                            "GitHub Copilot",
                            "Lovable",
                            "Bolt",
                            "Replit",
                          ].map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </label>
                      <div className="summary">
                        <h3>{draft.name}</h3>
                        <p>
                          {draft.type} · {draft.agent}
                        </p>
                        <p>{draft.idea}</p>
                        <small>
                          Creates a local project and template-based brief, not
                          generated AI research.
                        </small>
                      </div>
                    </>
                  )}
                  <div className="actions">
                    {step > 0 && (
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => setStep(step - 1)}
                      >
                        Back
                      </button>
                    )}
                    <button
                      disabled={
                        (step === 0 && !draft.name.trim()) ||
                        (step === 1 && !draft.idea.trim())
                      }
                    >
                      {step === 2 ? "Create project" : "Continue →"}
                    </button>
                  </div>
                </form>
              </section>
            </>
          )}
          {view === "studio" && (
            <Studio
              session={session}
              key={p?.id || "none"}
              project={p}
              projects={projects}
              selected={selected}
              select={selectProject}
              update={updateActive}
              onDirtyChange={setStudioDirty}
              newProject={() => go("new")}
            />
          )}
          {view === "repository" && (
            <Repository
              session={session}
              key={p?.id || "none"}
              project={p}
              projects={projects}
              selected={selected}
              select={selectProject}
              update={updateActive}
              newProject={() => go("new")}
            />
          )}
          {view === "context" && (
            <ContextManager
              key={p?.id || "none"}
              project={p}
              projects={projects}
              selected={selected}
              select={selectProject}
              update={updateActive}
              newProject={() => go("new")}
            />
          )}
          {view === "mission" && (
            <Mission
              key={p?.id || "none"}
              project={p}
              projects={projects}
              selected={selected}
              select={selectProject}
              update={updateActive}
              newProject={() => go("new")}
              openStudio={() => go("studio")}
            />
          )}
          {view === "quality" && (
            <Quality
              session={session}
              key={p?.id || "none"}
              project={p}
              projects={projects}
              selected={selected}
              select={selectProject}
              update={updateActive}
              newProject={() => go("new")}
            />
          )}
          {view === "guide" && (
            <Guide
              go={go}
              projects={projects}
              exportAll={() =>
                download(
                  JSON.stringify(projects, null, 2),
                  "vibeforge-local-backup.json",
                  "application/json",
                )
              }
              clearAll={() => {
                if (
                  confirm(
                    "Permanently remove every local project from this browser? Cloud snapshots are not deleted. Export first if needed.",
                  )
                ) {
                  setProjects([]);
                  setSelected("");
                  setNotice("Local projects cleared.");
                }
              }}
            />
          )}
          {view === "cloud" && (
            <Cloud
              projects={projects}
              selected={selected}
              setProjects={setProjects}
              setSelected={setSelected}
              session={session}
              setSession={setSession}
              recoveryToken={recoveryToken}
              clearRecovery={() => setRecoveryToken(null)}
              onContinue={() => go("overview")}
            />
          )}
          {["workflow", "docs", "prompt"].includes(view) && (
            <>
              <div className="projectcontext">
                <div className="projectcontext-icon">◈</div>
                <div className="projectselect">
                  <label>
                    Active project
                    <select
                      value={selected}
                      onChange={(e) => {
                        selectProject(e.target.value);
                      }}
                    >
                      <option value="">Select a project</option>
                      {projects.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="contextmeta">
                  <small>AGENT</small>
                  <b>{p?.agent || "Not selected"}</b>
                </div>
                <div className="contextmeta">
                  <small>REVIEWED</small>
                  <b>
                    {p?.reviewed.length || 0}/{stages.length} stages
                  </b>
                </div>
              </div>
              {!p ? (
                <section className="panel">
                  <h2>No active project</h2>
                  <button onClick={() => go("new")}>Create a project</button>
                </section>
              ) : view === "workflow" ? (
                <>
                  <h1>{p.name}</h1>
                  <p>
                    {p.type} · {p.agent} · {p.reviewed.length}/8 stages manually
                    reviewed
                  </p>
                  <progress aria-label="Reviewed workflow stages" max={8} value={p.reviewed.length} />
                  <div className="workflow">
                    {stages.map((s, i) => (
                      <article key={s[0]}>
                        <span className="num">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <h3>{s[1]}</h3>
                          <p>{s[2]}</p>
                        </div>
                        <label className="check">
                          <input
                            type="checkbox"
                            checked={p.reviewed.includes(s[0])}
                            onChange={() => toggle(s[0])}
                          />{" "}
                          Reviewed
                        </label>
                        <button
                          className="ghost"
                          onClick={() => {
                            setStage(s[0]);
                            go("prompt");
                          }}
                        >
                          Prompt →
                        </button>
                      </article>
                    ))}
                  </div>
                  <small>
                    Manual review is not evidence of implementation or passed
                    tests.
                  </small>
                </>
              ) : view === "docs" ? (
                <>
                  <h1>Documentation studio</h1>
                  <p>
                    Editable project brief. Save changes or export Markdown.
                  </p>
                  <section className="panel">
                    <textarea
                      className="editor"
                      value={doc}
                      onChange={(e) => setDoc(e.target.value)}
                      rows={20}
                      aria-label="Project document"
                    />
                    {hasSecret(doc) && (
                      <div className="summary" role="status">
                        <p>
                          Possible credential detected. Redact before saving or
                          sharing.
                        </p>
                        <button
                          className="ghost"
                          onClick={() => setDoc(redactText(doc))}
                        >
                          Redact recognized secrets
                        </button>
                      </div>
                    )}
                    <button onClick={saveDoc}>Save document</button>
                    <button
                      className="ghost"
                      onClick={() => download(doc, "project-brief.md")}
                    >
                      Export
                    </button>
                    <button className="ghost" onClick={() => copy(doc)}>
                      Copy
                    </button>
                  </section>
                </>
              ) : (
                <>
                  <h1>Agent prompt lab</h1>
                  <p>
                    Generate a stage-specific prompt template from the project
                    context.
                  </p>
                  <div className="promptgrid">
                    <section className="panel">
                      <label>
                        Workflow stage
                        <select
                          value={stage}
                          onChange={(e) => setStage(e.target.value)}
                        >
                          {stages.map((s) => (
                            <option key={s[0]} value={s[0]}>
                              {s[1]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Mode
                        <select
                          value={mode}
                          onChange={(e) => setMode(e.target.value)}
                        >
                          {modes.map((m) => (
                            <option key={m}>{m}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Preferred coding agent
                        <select
                          value={p.agent}
                          onChange={(e) =>
                            updateActive({ agent: e.target.value })
                          }
                        >
                          {agents.map((agent) => (
                            <option key={agent}>{agent}</option>
                          ))}
                        </select>
                      </label>
                      <small>
                        Changes future prompts only; existing assignments and
                        reviews stay intact.
                      </small>
                      <small>
                        Template-based output. Review and approve the task
                        before giving it to a coding agent.
                      </small>
                    </section>
                    <section className="panel">
                      <pre>{makePrompt(p, stage, mode)}</pre>
                      <button onClick={() => copy(makePrompt(p, stage, mode))}>
                        Copy prompt
                      </button>
                      <button
                        className="ghost"
                        onClick={() =>
                          download(
                            makePrompt(p, stage, mode),
                            "agent-prompt.md",
                          )
                        }
                      >
                        Export
                      </button>
                    </section>
                  </div>
                </>
              )}
            </>
          )}
          {recovery && (
            <section className="panel" role="alert">
              <h2>Local data recovery</h2>
              <p>
                Local storage could not be fully validated. Automatic writes are
                paused. {recovery.rejected} record(s) rejected. Valid projects
                remain available in memory. Download the original backup before
                replacing stored data.
              </p>
              <button
                disabled={recovery.raw === null}
                onClick={() => {
                  if (
                    !confirm(
                      "Export the original stored data without redaction? It may contain sensitive information. Keep it private.",
                    )
                  )
                    return;
                  const url = URL.createObjectURL(
                    new Blob([recovery.raw], {
                      type: "application/octet-stream",
                    }),
                  );
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = "vibeforge-emergency-backup.txt";
                  link.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                }}
              >
                Emergency original backup
              </button>
              <button
                className="ghost"
                onClick={() => {
                  if (
                    !confirm(
                      "Replace local storage with only the current validated projects? Rejected data will no longer be available here. Export first.",
                    )
                  )
                    return;
                  try {
                    localStorage.setItem(
                      "vibeforge-v2",
                      JSON.stringify(projects),
                    );
                    setRecovery(null);
                    setNotice("Local storage recovered.");
                  } catch {
                    setNotice("Storage still unavailable. Export your work.");
                  }
                }}
              >
                Keep validated projects and resume saving
              </button>
            </section>
          )}
          {notice && (
            <p className="notice" role="status">
              {notice}
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
