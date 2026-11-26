import { guard, RequestError } from "../../../../lib/request-guard.mjs";
import { inspectRootsys } from "../../../../lib/rootsys-status.mjs";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req) {
  const reply = (body, status = 200) =>
    Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
  try {
    await guard(req, "rootsys-inspect");
    if (req.headers.has("x-provider-key") || req.body)
      return reply({ error: "Unexpected request data." }, 400);
    const result = await inspectRootsys(process.env.ROOTSYS_API_KEY || "");
    return reply(result);
  } catch (error) {
    if (error instanceof RequestError)
      return reply({ error: error.message }, error.status);
    return reply({ error: "Rootsys status unavailable." }, 502);
  }
}
