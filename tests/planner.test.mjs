import test from "node:test";import assert from "node:assert/strict";import {stages,makeBrief,makePrompt} from "../lib/planner.mjs";
const p={name:"Demo",type:"Website",audience:"Owners",agent:"Codex",idea:"Test idea"};
test("brief retains user context and all eight stages",()=>{const b=makeBrief(p);assert.ok(b.includes(p.idea));for(const s of stages)assert.ok(b.includes(s[1]));});
test("audit mode is read-only and requires evidence",()=>{const b=makePrompt(p,"verification","Audit");assert.match(b,/Inspect read-only/);assert.match(b,/Unverified work/);});
test("all workflow stages and prompt modes produce a handoff",()=>{for(const s of stages)for(const m of ["Plan","Build","Debug","Audit","Improve"])assert.ok(makePrompt(p,s[0],m).includes(s[1]));});
