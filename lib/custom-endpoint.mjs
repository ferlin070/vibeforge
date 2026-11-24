import {resolve4} from "node:dns/promises";
import {request} from "node:https";
import {isIP} from "node:net";
export function endpoint(base,kind){
 if(typeof base!=="string"||base.length>500||/[\\\s]/.test(base))throw Error("Invalid base URL");
 const u=new URL(base);
 if(u.protocol!=="https:"||u.username||u.password||u.search||u.hash||u.port||isIP(u.hostname)||!u.hostname.includes(".")||u.hostname.endsWith(".")||/\.(local|localhost|internal|home|lan|test|invalid|onion)$/.test(u.hostname)||!/^([a-z0-9-]+\.)+[a-z][a-z0-9-]*$/i.test(u.hostname))throw Error("Public HTTPS hostname required");
 if(!/^\/[a-zA-Z0-9._~/-]*$/.test(u.pathname)||u.pathname.includes("//"))throw Error("Invalid base path");
 let path=u.pathname.replace(/\/+$/,"");
 const suffix=kind==="messages"?"/messages":kind==="responses"?"/responses":"/chat/completions";
 if(!path.endsWith(suffix)){if(!path)path="/v1";path+=suffix}
 u.pathname=path;return u.toString();
}
export function publicIPv4(ip){
 if(isIP(ip)!==4)return false;
 const [a,b,c]=ip.split(".").map(Number);
 return !(a===0||a===10||a===127||a>=224||(a===100&&b>=64&&b<=127)||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&(b===168||b===0||b===88&&c===99))||(a===198&&(b===18||b===19||b===51&&c===100))||(a===203&&b===0&&c===113)||ip==="168.63.129.16");
}
export async function pinnedAddress(host,resolve=resolve4){
 let timeout;
 try{const addresses=await Promise.race([resolve(host),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error("DNS timeout")),4000)})]);if(!Array.isArray(addresses)||!addresses.length||addresses.some(ip=>!publicIPv4(ip)))throw Error("Unsafe DNS address");return addresses[0]}finally{clearTimeout(timeout)}
}
export async function customRequest(spec){
 const u=new URL(spec.url),ip=await pinnedAddress(u.hostname);
 const body=JSON.stringify(spec.body);
 return new Promise((resolve,reject)=>{
 const req=request({hostname:ip,port:443,path:u.pathname,method:"POST",servername:u.hostname,agent:false,rejectUnauthorized:true,headers:{...spec.headers,Host:u.hostname,"Content-Length":Buffer.byteLength(body),Accept:"application/json","Accept-Encoding":"identity"}},res=>{
  let total=0;const chunks=[];
  if(res.statusCode>=300&&res.statusCode<400){res.destroy();reject(Error("Redirect blocked"));return}
  res.on("data",chunk=>{total+=chunk.length;if(total>1000000){res.destroy(Error("Response too large"));return}chunks.push(chunk)});
  res.on("error",reject);res.on("aborted",()=>reject(Error("Response aborted")));
  res.on("end",()=>resolve(new Response(Buffer.concat(chunks),{status:res.statusCode})));
 });
 const timer=setTimeout(()=>req.destroy(Error("Request timeout")),44000);
 req.on("error",reject);req.on("close",()=>clearTimeout(timer));req.end(body);
 });
}
