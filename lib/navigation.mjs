export const workspaceViews = [
  "overview",
  "projects",
  "new",
  "templates",
  "workflow",
  "docs",
  "prompt",
  "studio",
  "repository",
  "context",
  "agents",
  "mission",
  "quality",
  "cloud",
  "team",
  "guide",
];
export const projectViews = [
  "workflow",
  "docs",
  "prompt",
  "studio",
  "repository",
  "context",
  "agents",
  "mission",
  "quality",
];
export function readRoute(search, projects) {
  const params = new URLSearchParams(search);
  const requested = params.get("view");
  const view = workspaceViews.includes(requested)
    ? requested
    : requested
      ? "overview"
      : "landing";
  const candidate = params.get("project");
  const selected = projects.some((p) => p.id === candidate)
    ? candidate
    : projects[0]?.id || "";
  return {
    view,
    selected,
    missingProject: !!candidate && !projects.some((p) => p.id === candidate),
  };
}
export function routeURL(view, selected) {
  if (view === "landing") return "/";
  const params = new URLSearchParams({
    view: workspaceViews.includes(view) ? view : "overview",
  });
  if (
    projectViews.includes(view) &&
    typeof selected === "string" &&
    /^[A-Za-z0-9_-]{1,100}$/.test(selected)
  )
    params.set("project", selected);
  return "/?" + params.toString();
}
export function unsavedReasons({
  view,
  draft,
  empty,
  doc,
  baseline,
  studioDirty,
}) {
  const reasons = [];
  if (view === "new" && JSON.stringify(draft) !== JSON.stringify(empty))
    reasons.push("unfinished project wizard");
  if (view === "docs" && doc !== baseline)
    reasons.push("unsaved project document");
  if (view === "studio" && studioDirty)
    reasons.push("unapplied AI candidate or task report");
  return reasons;
}
export function canLeave(reasons, confirmFn) {
  return (
    !reasons.length ||
    confirmFn(
      "Leave this view? Unsaved work may be lost: " +
        reasons.join(", ") +
        ". Cancel to continue editing.",
    )
  );
}
