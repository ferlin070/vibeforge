import { sections, validateBlueprint } from "./blueprint.mjs";
import { assertSafeJson } from "./project-schema.mjs";
import { hasSecret } from "./redact.mjs";
const reqPattern = /\b(?:NFR|FR)-[0-9]{1,5}\b/gi;
const ids = (s) => [...new Set((s.match(reqPattern) || []).map(x => x.toUpperCase()))];
const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;
const placeholders = /\b(?:TBD|TODO|TBC|placeholder|to be defined|manual specification required)\b/i;
const observable = /\b(?:must|returns?|shows?|rejects?|displays?|responds?|passes?|fails?|within|exactly|at least|no more than|status|HTTP|verify|test|shall|mesti|memaparkan|menolak|dalam|sekurang-kurangnya)\b|\d/iu;
export function scoreBlueprint(b) {
  const docs = b?.documents || {};
  const tasks = Array.isArray(b?.tasks) ? b.tasks : [];
  const details = sections.map(([key, label]) => {
    const value = typeof docs[key] === "string" ? docs[key] : "";
    const count = words(value);
    const placeholder = placeholders.test(value);
    const points = count >= 50 && !placeholder ? 5 : count >= 20 && !placeholder ? 3 : count > 0 ? 1 : 0;
    return { key, label, words: count, points, max: 5, warning: !value.trim() ? "Missing document" : placeholder ? "Placeholder or manual draft marker" : count < 50 ? "Review depth and specificity" : "" };
  });
  const requirements = ids([docs.prd, docs.srs].filter(x=>typeof x==="string").join(" "));
  const traced = new Set(tasks.flatMap(t=>ids([t?.title,t?.description,...(Array.isArray(t?.acceptance)?t.acceptance:[])].filter(x=>typeof x==="string").join(" "))));
  const missing = requirements.filter(x=>!traced.has(x));
  const criteria = tasks.flatMap(t=>Array.isArray(t?.acceptance)?t.acceptance.filter(x=>typeof x==="string"):[]);
  const measurable = criteria.filter(x=>observable.test(x)&&!placeholders.test(x)).length;
  let structurallyValid=false;
  try { validateBlueprint(b); structurallyValid=true; } catch {}
  const breakdown = [
    { label: "Document depth", score: details.reduce((n,x)=>n+x.points,0), max:45 },
    { label: "Requirement traceability", score:requirements.length?Math.round(25*(requirements.length-missing.length)/requirements.length):0,max:25 },
    { label: "Acceptance criteria signals", score:criteria.length?Math.round(20*measurable/criteria.length):0,max:20 },
    { label: "Structure and dependency validation", score:structurallyValid?10:0,max:10 }
  ];
  const warnings=details.filter(x=>x.warning).map(x=>x.label+": "+x.warning);
  if(!requirements.length) warnings.push("Add stable FR/NFR identifiers in PRD or SRS.");
  if(missing.length) warnings.push("Requirements without task references: "+missing.slice(0,30).join(", "));
  if(measurable<criteria.length) warnings.push("Some acceptance criteria lack observable test signals.");
  if(!structurallyValid) warnings.push("Blueprint structure or dependencies are invalid.");
  return { score:breakdown.reduce((n,x)=>n+x.score,0), breakdown, documents:details, warnings, structurallyValid, requirementCount:requirements.length, tracedCount:requirements.length-missing.length, openQuestions:Array.isArray(b?.questions)?b.questions.length:0 };
}
export function validateGeneratedBlueprint(raw) {
  assertSafeJson(raw);
  const b=validateBlueprint(raw);
  if (Object.keys(raw).some(k=>!["documents","tasks","assumptions","questions"].includes(k)) ||
      Object.keys(raw.documents).some(k=>!sections.some(([id])=>id===k)) ||
      raw.tasks.some(t=>Object.keys(t).some(k=>!["id","title","description","dependencies","acceptance"].includes(k))))
    throw Error("Unexpected blueprint fields");
  if(hasSecret(JSON.stringify(raw))) throw Error("Sensitive output");
  return b;
}
