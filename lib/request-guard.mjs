export class RequestError extends Error{constructor(message,status){super(message);this.status=status}}
export async function boundedText(message,max){
 const declared=Number(message.headers.get("content-length")||0);
 if(declared>max)throw new RequestError("Payload too large",413);
 if(!message.body)return "";
 const reader=message.body.getReader(),decoder=new TextDecoder();let size=0,out="";
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw new RequestError("Payload too large",413)}out+=decoder.decode(value,{stream:true})}return out+decoder.decode()}finally{reader.releaseLock()}
}
export async function boundedJSON(message,max){return JSON.parse(await boundedText(message,max))}
export function sameOrigin(req){
 if(req.headers.get("sec-fetch-site")==="cross-site")return false;
 const origin=req.headers.get("origin");if(!origin)return true;
 try{return new URL(origin).origin===new URL(req.url).origin}catch{return false}
}
const buckets=new Map();
export function consumeLimit(key,limit=12,now=Date.now(),windowMs=60000){
 for(const [k,v] of buckets)if(v.until<=now)buckets.delete(k);
 let b=buckets.get(key);if(!b){if(buckets.size>=2000)return false;b={count:0,until:now+windowMs};buckets.set(key,b)}
 if(b.count>=limit)return false;b.count++;return true;
}
export function allowedCustomHost(url,allowlist){const hostname=new URL(url).hostname;return String(allowlist||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean).includes(hostname)}
export async function guard(req,scope,{custom=false,url="",env=process.env,fetcher=fetch}={}){
 if(!sameOrigin(req))throw new RequestError("Cross-origin request blocked.",403);
 const production=env.VERCEL_ENV==="production"||env.VIBEFORGE_REQUIRE_AUTH==="1";
 if(custom&&production&&!allowedCustomHost(url,env.VIBEFORGE_CUSTOM_HOSTS))throw new RequestError("Custom gateway host is not approved for production. Contact the deployment administrator.",403);
 if(!production&&!custom)return;
 const token=req.headers.get("x-vibeforge-session")||"";
 if(!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)||token.length>8192)throw new RequestError("Sign in via Cloud account before using this service.",401);
 const base=env.NEXT_PUBLIC_SUPABASE_URL||"",key=env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||"";
 if(!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(base)||!key.startsWith("sb_publishable_"))throw new RequestError("Cloud authentication is not configured.",503);
 let user;try{const res=await fetcher(base+"/auth/v1/user",{headers:{apikey:key,Authorization:"Bearer "+token},redirect:"error",cache:"no-store",signal:AbortSignal.timeout(5000)});if(res.status===401||res.status===403)throw new RequestError("Session expired or invalid. Sign in again.",401);if(!res.ok)throw Error();user=await boundedJSON(res,100000)}catch(e){if(e instanceof RequestError)throw e;throw new RequestError("Unable to verify account.",503)}
 if(typeof user.id!=="string"||!user.id||user.is_anonymous===true)throw new RequestError("Verified account required.",401);
 if(!consumeLimit(scope+":"+user.id,scope==="blueprint"?6:12))throw new RequestError("Request limit reached. Try again in a minute.",429);
}
