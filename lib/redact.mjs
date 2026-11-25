const MASK="[REDACTED]";
// Bounded prefixes; a missing PEM terminator consumes the remainder rather than rescanning.
const pem=/-----BEGIN [A-Z0-9 ]{0,60}PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z0-9 ]{0,60}PRIVATE KEY-----|$)/g;
const tokens=/\b(?:sk-(?:ant-|or-)?[A-Za-z0-9_-]{12,}|sk_(?:live|test)_[A-Za-z0-9_-]{8,}|rk_(?:live|test)_[A-Za-z0-9_-]{8,}|AIza[A-Za-z0-9_-]{30,}|(?:AKIA|ASIA)[A-Z0-9]{16}|xox[abprs]-[A-Za-z0-9-]{8,}|npm_[A-Za-z0-9]{12,}|glpat-[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9_]{12,}|github_pat_[A-Za-z0-9_]{12,}|sb_secret_[A-Za-z0-9_-]{12,}|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\b/g;
const urls=/\b([a-z][a-z0-9+.-]{0,31}:\/\/)[^/\s:@]{1,512}:[^/\s@]{1,512}@/gi;
const bearer=/(authorization[ \t]*[:=][ \t]*bearer[ \t]+)[^\s,;"']+/gi;
const labelled=/((?:password|api[_-]?key|access[_-]?token|secret)[ \t]*[:=][ \t]*)(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\s,"']+)/gi;
export function redactText(value){
 if(typeof value!=="string")return "";
 return value.replace(pem,MASK).replace(urls,(_m,scheme)=>scheme+MASK+"@").replace(bearer,(_m,prefix)=>prefix+MASK).replace(labelled,(_m,prefix)=>prefix+MASK).replace(tokens,MASK);
}
export function hasSecret(value){return typeof value==="string"&&redactText(value)!==value}
export function redactLog(value){return redactText(typeof value==="string"?value.trim():"").slice(0,20000)}
export function redactReport(value){return redactText(typeof value==="string"?value.trim():"").slice(0,5000)}
// Redact values before serializing to retain JSON escaping and document structure.
export function redactData(value){
 if(typeof value==="string")return redactText(value);
 if(Array.isArray(value))return value.map(redactData);
 if(value&&typeof value==="object")return Object.fromEntries(Object.entries(value).map(([k,v])=>[redactText(k),redactData(v)]));
 return value;
}
export function redactExportText(value){
 if(typeof value!=="string")return value;
 if(/^\s*[\[{]/.test(value)){try{const parsed=JSON.parse(value),clean=redactData(parsed);return JSON.stringify(parsed)===JSON.stringify(clean)?value:JSON.stringify(clean,null,2)}catch{}}
 return redactText(value);
}
