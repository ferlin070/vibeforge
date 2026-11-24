export const providers=Object.freeze([
 {id:"openai",label:"OpenAI",example:"gpt-4.1-mini",keyHint:"sk-…",note:"Responses API · JSON output"},
 {id:"anthropic",label:"Claude (Anthropic)",example:"claude-sonnet-4-6",keyHint:"sk-ant-…",note:"Messages API · validated JSON"},
 {id:"gemini",label:"Google Gemini",example:"gemini-2.5-flash",keyHint:"AIza…",note:"GenerateContent API · JSON mode"},
 {id:"deepseek",label:"DeepSeek",example:"deepseek-chat",keyHint:"sk-…",note:"Chat Completions · JSON mode"},
 {id:"openrouter",label:"OpenRouter",example:"openai/gpt-4.1-mini",keyHint:"sk-or-…",note:"Chat Completions · choose a JSON-capable model"}
]);
export function providerById(id){return providers.find(p=>p.id===id)}
export function validModel(id,model){
 if(typeof model!=="string"||model.length>120)return false;
 const patterns={openai:/^(gpt-|o[134]-?)[a-zA-Z0-9._-]+$/,anthropic:/^claude-[a-zA-Z0-9._-]+$/,gemini:/^gemini-[a-zA-Z0-9._-]+$/,deepseek:/^deepseek-[a-zA-Z0-9._-]+$/,openrouter:/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._:-]+$/};
 return !!patterns[id]?.test(model);
}
export function validKey(key){return typeof key==="string"&&/^[!-~]{8,512}$/.test(key)}
