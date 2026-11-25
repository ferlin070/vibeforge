import test from "node:test";
import assert from "node:assert/strict";
import {redactText,redactData,redactExportText,hasSecret,redactReport} from "../lib/redact.mjs";
import {redactLog,addBug,changeBug,saveCheck} from "../lib/quality.mjs";
import {newMemory,agentFiles,agentPrompt,checkpoint} from "../lib/context.mjs";
import {starterBlueprint,contextPack} from "../lib/blueprint.mjs";
import {assignTask,handoffTask,submitMissionReport} from "../lib/mission.mjs";
import {makeZip} from "../lib/zip.mjs";
const samples=[
 ["Gemini","AIza"+"Z".repeat(35)],["Stripe live","sk_live_"+"Z".repeat(24)],["Stripe test","sk_test_"+"Z".repeat(24)],["Stripe restricted","rk_live_"+"Z".repeat(24)],["AWS","AKIA"+"Z".repeat(16)],["Slack","xoxb-"+"Z".repeat(25)],["npm","npm_"+"Z".repeat(36)],["GitLab","glpat-"+"Z".repeat(20)],["DB URL","postgresql://test-user:test-password@example.invalid/db"],["PEM","-----BEGIN RSA PRIVATE KEY-----\nFAKE-FIXTURE\n-----END RSA PRIVATE KEY-----"],["Anthropic","sk-ant-"+"Z".repeat(24)]
];
for(const [name,secret] of samples)test("redact "+name,()=>{assert.equal(hasSecret(secret),true);assert.ok(!redactLog(secret).includes(secret));assert.ok(redactLog(secret).includes("[REDACTED]"))});
test("normal identifiers remain unchanged",()=>{const s="risk-assessment task-001 ask-me-anything https://example.invalid/doc";assert.equal(redactText(s),s);assert.equal(hasSecret(s),false)});
test("20,000 character adversarial input under 100 ms",()=>{const s=("-----BEGIN RSA PRIVATE KEY-----"+"x".repeat(10)).repeat(500).slice(0,20000).padEnd(20000,"x");const start=performance.now();redactText(s);assert.ok(performance.now()-start<100)});
const key=samples[0][1],base={name:"Fixture",idea:"Build a site "+key,agent:"Codex",blueprintApproved:true,blueprint:starterBlueprint({name:"Fixture",idea:"Build a site"}),evidence:{}};
test("mission and Studio shared report sanitizer",()=>{let p={...base,...assignTask(base,"TASK-001","pm","Codex","now")};p={...p,...handoffTask(p,"TASK-001","now")};const r=submitMissionReport(p,"TASK-001","test evidence "+key,"now");assert.ok(!r.evidence["TASK-001"].report.includes(key));assert.equal(redactReport(key),"[REDACTED]")});
test("memory titles and bodies, bug details, evidence and release checks",()=>{const m=newMemory(base,{category:"Knowledge",title:key,body:key},"id","now");assert.equal(m.memory[0].title,"[REDACTED]");assert.equal(m.memory[0].body,"[REDACTED]");let q=addBug(base,{title:key,details:key,severity:"Low"},"bug","now");assert.ok(!JSON.stringify(q).includes(key));q=changeBug({...base,quality:q},"bug","Resolved",key,"now");assert.ok(!JSON.stringify(q).includes(key));assert.ok(!JSON.stringify(saveCheck(base,"functional",key,"now")).includes(key))});
test("context, handoff, checkpoints, JSON and ZIP redact without altering original idea",()=>{const p={...base,document:key,evidence:{"TASK-001":{report:key,reviewed:true}}};const files=agentFiles(p);assert.ok(Object.values(files).every(s=>!s.includes(key)));assert.ok(!agentPrompt(p).includes(key));assert.ok(!contextPack(p,p.blueprint,p.blueprint.tasks[0],p.evidence).includes(key));assert.ok(!JSON.stringify(checkpoint(p,"v","id","now")).includes(key));assert.ok(!new TextDecoder().decode(makeZip({"x.md":key,"x.json":JSON.stringify({secret:key})})).includes(key));assert.deepEqual(JSON.parse(redactExportText(JSON.stringify({note:samples[9][1]}))),{note:"[REDACTED]"});assert.equal(redactData(p).idea.includes(key),false);assert.ok(p.idea.includes(key))});
