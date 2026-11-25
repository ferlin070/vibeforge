import {createHash} from "node:crypto";
const CAP=2000;
export function createMemoryLimiter(cap=CAP){
 const buckets=new Map();
 return (key,limit=12,now=Date.now(),windowMs=60000)=>{
  for(const [k,v] of buckets)if(v.until<=now)buckets.delete(k);
  let b=buckets.get(key);if(!b){if(buckets.size>=cap)return false;b={count:0,until:now+windowMs};buckets.set(key,b)}
  if(b.count>=limit)return false;b.count++;return true;
 };
}
export const consumeLimit=createMemoryLimiter();
// Atomic shared window: cap new bucket identities across instances, and expire all window keys.
const script="if redis.call('SISMEMBER',KEYS[1],KEYS[2])==0 then if redis.call('SCARD',KEYS[1])>=tonumber(ARGV[2]) then return 0 end redis.call('SADD',KEYS[1],KEYS[2]) end redis.call('PEXPIRE',KEYS[1],ARGV[3]) local n=redis.call('INCR',KEYS[2]) if n==1 then redis.call('PEXPIRE',KEYS[2],ARGV[3]) end if n>tonumber(ARGV[1]) then return 0 end return 1";
let warned=false;
export async function rateLimit(key,limit,{env=process.env,fetcher=fetch,now=Date.now(),windowMs=60000}={}){
 const raw=env.UPSTASH_REDIS_REST_URL,token=env.UPSTASH_REDIS_REST_TOKEN;
 if(!raw&&!token){if(!warned){console.warn("VibeForge: distributed rate limiter not configured; using per-instance memory limits.");warned=true}return consumeLimit(key,limit,now,windowMs)}
 if(!raw||!token)throw Error("Incomplete rate limiter configuration.");
 const u=new URL(raw);if(u.protocol!=="https:"||u.username||u.password||u.search||u.hash)throw Error("Invalid rate limiter endpoint.");
 const hash=createHash("sha256").update(key).digest("hex"),window=Math.floor(now/windowMs),prefix="vf:{rate}:"+windowMs+":"+window;
 const ttl=windowMs-(now%windowMs)+1000;
 const res=await fetcher(u.toString(),{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify(["EVAL",script,"2",prefix+":index",prefix+":"+hash,String(limit),String(CAP),String(ttl)]),redirect:"error",cache:"no-store",signal:AbortSignal.timeout(3000)});
 if(!res.ok)throw Error("Rate limiter unavailable.");
 const body=await res.json();if(body.error||![0,1].includes(body.result))throw Error("Rate limiter unavailable.");
 return body.result===1;
}
