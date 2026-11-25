import test from "node:test";
import assert from "node:assert/strict";
import { readRoute, routeURL, unsavedReasons, canLeave, workspaceViews } from "../lib/navigation.mjs";
const projects=[{id:"first"},{id:"second"}];
test("all workspace views round-trip and invalid view falls back",()=>{
  for(const view of workspaceViews)assert.equal(readRoute(routeURL(view,"second").split("?")[1],projects).view,view);
  assert.equal(readRoute("?view=javascript:alert(1)",projects).view,"overview");
  assert.equal(readRoute("",projects).view,"landing");
});
test("deep links use only known local project IDs",()=>{
  assert.deepEqual(readRoute("?view=studio&project=second",projects),{view:"studio",selected:"second",missingProject:false});
  assert.deepEqual(readRoute("?view=docs&project=unknown",projects),{view:"docs",selected:"first",missingProject:true});
  assert.equal(readRoute("?view=studio",[]).selected,"");
  assert.equal(routeURL("docs","x&token=secret"),"/?view=docs");
  assert.equal(routeURL("cloud","second"),"/?view=cloud");
});
test("wizard, documentation and AI drafts require confirmation",()=>{
  const empty={name:"",idea:""},base={draft:empty,empty,doc:"saved",baseline:"saved",studioDirty:false};
  assert.deepEqual(unsavedReasons({...base,view:"new"}),[]);
  assert.equal(unsavedReasons({...base,view:"new",draft:{...empty,name:"draft"}}).length,1);
  assert.equal(unsavedReasons({...base,view:"docs",doc:"edited"}).length,1);
  assert.equal(unsavedReasons({...base,view:"studio",studioDirty:true}).length,1);
  assert.equal(canLeave(["draft"],()=>false),false);
  assert.equal(canLeave(["draft"],()=>true),true);
  assert.equal(canLeave([],()=>{throw Error("not needed")}),true);
});
