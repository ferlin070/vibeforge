import {guard,boundedText,boundedJSON,RequestError,sameOrigin} from "../../../lib/request-guard.mjs";
import {parseRepo,inventory} from "../../../lib/repository.mjs";
export const runtime="nodejs";
export const maxDuration=30;
export async function POST(req){
 const reply=(body,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"no-store"}});
 try{
 if(!sameOrigin(req))return reply({error:"Cross-origin request blocked."},403);
 if(Number(req.headers.get("content-length")||0)>4000)return reply({error:"Request too large"},413);
 const raw=await boundedText(req,4000);if(raw.length>4000)return reply({error:"Request too large"},413);
 let repo;try{repo=parseRepo(JSON.parse(raw).repo)}catch{return reply({error:"Enter a valid GitHub owner/repository"},400)}
 const token=req.headers.get("x-github-token")||"";
 if(token&&!/^[A-Za-z0-9_\-]{12,300}$/.test(token))return reply({error:"Invalid GitHub token format"},400);
 await guard(req,"repository");
 const signal=AbortSignal.timeout(24000);
 const get=async(path,optional=false)=>{const res=await fetch("https://api.github.com/repos/"+repo+path,{headers:{Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28",...(token?{Authorization:"Bearer "+token}:{})},redirect:"error",cache:"no-store",signal});if(optional&&res.status===404)return null;if(!res.ok)throw Error("GitHub request failed ("+res.status+"). Check access or rate limit.");return boundedJSON(res,12000000)};
 const meta=await get("");const commit=await get("/commits/"+encodeURIComponent(meta.default_branch));
 const tree=await get("/git/trees/"+encodeURIComponent(commit.commit.tree.sha)+"?recursive=1");
 const manifest=await get("/contents/package.json?ref="+encodeURIComponent(commit.sha),true);
 let pkg=null;if(manifest?.encoding==="base64"&&manifest.size<100000){try{pkg=JSON.parse(Buffer.from(manifest.content,"base64").toString("utf8"))}catch{}}
 return reply({inventory:inventory(meta,commit,tree,pkg)});
 }catch(e){if(e instanceof RequestError)return reply({error:e.message},e.status);return reply({error:/^GitHub request failed \(\d+\)/.test(e.message)?e.message:"Repository scan failed or timed out."},502)}
}
