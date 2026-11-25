import {RequestError} from "./request-guard.mjs";
export function githubError(res,hasToken){
 const remaining=res.headers.get("x-ratelimit-remaining"),retry=res.headers.get("retry-after"),rawReset=res.headers.get("x-ratelimit-reset"),reset=Number(rawReset);
 if(res.status===429||(res.status===403&&(remaining==="0"||retry!==null))){
  const validReset=rawReset!==null&&Number.isFinite(reset)&&reset>0&&reset<4102444800;
  const when=validReset?" GitHub quota resets at "+new Date(reset*1000).toISOString()+".":" Try again later.";
  return new RequestError("GitHub rate limit reached."+when+(hasToken?" Check your token's quota.":" Unauthenticated GitHub requests share a 60/hour IP quota; use a read-only GitHub token."),429);
 }
 return new RequestError("GitHub request failed ("+res.status+"). Check repository access and token permissions.",502);
}
