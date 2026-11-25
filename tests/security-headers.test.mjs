import test from "node:test";
import assert from "node:assert/strict";
import config from "../next.config.mjs";

async function headersFor(env){
 const names=["NODE_ENV","VERCEL_ENV","NEXT_PUBLIC_SUPABASE_URL"];
 const previous=Object.fromEntries(names.map(k=>[k,process.env[k]]));
 try{
  for(const k of names){if(env[k]===undefined)delete process.env[k];else process.env[k]=env[k]}
  const rules=await config.headers();
  assert.equal(rules[0].source,"/:path*");
  return Object.fromEntries(rules[0].headers.map(h=>[h.key.toLowerCase(),h.value]));
 }finally{for(const k of names){if(previous[k]===undefined)delete process.env[k];else process.env[k]=previous[k]}}
}
const directives=csp=>Object.fromEntries(csp.split(";").map(x=>x.trim()).filter(Boolean).map(x=>{const [name,...values]=x.split(/\s+/);return [name,values]}));
test("production CSP restricts origins, inline handlers and dangerous embeddings",async()=>{
 const h=await headersFor({NODE_ENV:"production",VERCEL_ENV:"production",NEXT_PUBLIC_SUPABASE_URL:"https://fixture.supabase.co"});
 const c=directives(h["content-security-policy"]);
 assert.deepEqual(c["default-src"],["'self'"]);
 assert.deepEqual(c["script-src"],["'self'","'unsafe-inline'"]);
 assert.deepEqual(c["script-src-attr"],["'none'"]);
 assert.deepEqual(c["style-src"],["'self'","'unsafe-inline'"]);
 assert.deepEqual(c["connect-src"],["'self'","https://fixture.supabase.co"]);
 assert.deepEqual(c["img-src"],["'self'","data:"]);
 for(const name of ["frame-ancestors","frame-src","base-uri","object-src"])assert.deepEqual(c[name],["'none'"]);
 assert.deepEqual(c["form-action"],["'self'"]);
 assert.ok(!h["content-security-policy"].includes("'unsafe-eval'"));
 assert.ok(!h["content-security-policy"].includes("*"));
});
test("connect-src permits only configured valid Supabase origin; malformed or absent config omitted",async()=>{
 for(const value of [undefined,"","http://fixture.supabase.co","https://fixture.supabase.co.evil.invalid","https://fixture.supabase.co/path","https://fixture.supabase.co; script-src *","https://user:pass@fixture.supabase.co","https://fixture.supabase.co:443","https://fixture.supabase.co?x=1"]){
  const h=await headersFor({NODE_ENV:"production",NEXT_PUBLIC_SUPABASE_URL:value});
  assert.deepEqual(directives(h["content-security-policy"])["connect-src"],["'self'"]);
 }
 const h=await headersFor({NODE_ENV:"production",NEXT_PUBLIC_SUPABASE_URL:"https://fixture.supabase.co/"});
 assert.deepEqual(directives(h["content-security-policy"])["connect-src"],["'self'","https://fixture.supabase.co"]);
});
test("development eval exception never applies to a hosted environment",async()=>{
 const local=await headersFor({NODE_ENV:"development"});
 assert.ok(directives(local["content-security-policy"])["script-src"].includes("'unsafe-eval'"));
 for(const VERCEL_ENV of ["preview","production"]){
  const h=await headersFor({NODE_ENV:"development",VERCEL_ENV});
  assert.ok(!directives(h["content-security-policy"])["script-src"].includes("'unsafe-eval'"));
 }
});
test("HSTS, COOP and all original headers are retained",async()=>{
 const h=await headersFor({NODE_ENV:"production"});
 assert.equal(h["strict-transport-security"],"max-age=63072000; includeSubDomains");
 assert.equal(h["cross-origin-opener-policy"],"same-origin");
 assert.equal(h["x-content-type-options"],"nosniff");
 assert.equal(h["referrer-policy"],"no-referrer");
 assert.equal(h["x-frame-options"],"DENY");
 assert.equal(h["permissions-policy"],"camera=(), microphone=(), geolocation=()");
 assert.equal(config.poweredByHeader,false);
});
