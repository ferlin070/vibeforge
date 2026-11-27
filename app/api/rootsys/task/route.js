import {
  guard,
  boundedJSON,
  RequestError,
} from "../../../../lib/request-guard.mjs";
import {
  makeRequest,
  extractOutput,
  parseOutput,
} from "../../../../lib/ai-adapters.mjs";
import { validKey } from "../../../../lib/providers.mjs";
import {
  normalizeTask,
  taskPlanPrompt,
  validateTaskPlan,
} from "../../../../lib/rootsys-task.mjs";
import { AIError, providerFailure } from "../../../../lib/ai-errors.mjs";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req) {
  const reply = (body, status = 200) =>
    Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
  try {
    await guard(req, "rootsys");
    if (req.headers.has("x-provider-key"))
      return reply({ error: "Client keys are not accepted." }, 400);
    const key = process.env.ROOTSYS_API_KEY || "";
    if (!validKey(key)) return reply({ error: "Rootsys not configured." }, 503);
    let context;
    try {
      context = normalizeTask(await boundedJSON(req, 24000));
    } catch {
      return reply({ error: "Invalid or oversized task context." }, 400);
    }
    const input = JSON.stringify(context);
    if (input.includes(JSON.stringify(key).slice(1, -1)))
      return reply({ error: "Remove credentials from task context." }, 400);
    const spec = makeRequest(
      "rootsys",
      "deepseek-v4-flash",
      key,
      taskPlanPrompt,
      input,
    );
    const upstream = await fetch(spec.url, {
      method: "POST",
      headers: spec.headers,
      body: JSON.stringify(spec.body),
      signal: AbortSignal.timeout(50000),
      redirect: "error",
      cache: "no-store",
    });
    if (!upstream.ok) throw providerFailure(upstream.status);
    const output = extractOutput("rootsys", await boundedJSON(upstream, 100000));
    if (output.includes(key)) throw Error("Sensitive response.");
    const plan = validateTaskPlan(parseOutput(output));
    if (JSON.stringify(plan).includes(JSON.stringify(key).slice(1, -1)))
      throw Error("Sensitive response.");
    return reply({ plan });
  } catch (error) {
    if (error instanceof RequestError || error instanceof AIError)
      return reply({ error: error.message }, error.status);
    return reply({ error: "Task plan unavailable. No automatic retry." }, 502);
  }
}
