import test from "node:test";import assert from "node:assert/strict";import {sections,validateBlueprint,starterBlueprint,taskState,contextPack} from "../lib/blueprint.mjs";
const p={name:"Demo",type:"Web app",idea:"Booking",agent:"Codex"};
test("manual blueprint includes all documents",()=>{const b=starterBlueprint(p);assert.equal(Object.keys(b.documents).length,sections.length);assert.equal(b.tasks.length,4)});
test("invalid documents rejected",()=>{assert.throws(()=>validateBlueprint({documents:{},tasks:[],assumptions:[],questions:[]}))});
test("dependency cycle rejected",()=>{const b=starterBlueprint(p);b.tasks[0].dependencies=["TASK-004"];assert.throws(()=>validateBlueprint(b),/cycle/)});
test("missing dependency rejected",()=>{const b=starterBlueprint(p);b.tasks[0].dependencies=["TASK-999"];assert.throws(()=>validateBlueprint(b),/dependency/)});
test("dependencies block until reviewed",()=>{const b=starterBlueprint(p);assert.equal(taskState(b.tasks[1],{},b.tasks),"Blocked");assert.equal(taskState(b.tasks[1],{"TASK-001":{reviewed:true}},b.tasks),"Ready")});
test("context retains scope and approval",()=>{const b=starterBlueprint(p);const c=JSON.parse(contextPack(p,b,b.tasks[0],{}));assert.equal(c.project.idea,"Booking");assert.equal(c.approved,false);assert.equal(c.task.id,"TASK-001")});
