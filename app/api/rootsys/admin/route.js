import { guard, RequestError } from "../../../../lib/request-guard.mjs";
import { validKey } from "../../../../lib/providers.mjs";

export const runtime = "nodejs";
export const maxDuration = 15;

export async function POST(req) {
  const reply = (body, status = 200) =>
    Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
  try {
    await guard(req, "rootsys-admin");
    if (req.headers.has("x-provider-key") || req.body)
      return reply({ error: "Unexpected request data." }, 400);
    return reply({
      enabled: process.env.ROOTSYS_ENABLED === "true",
      keyFormatValid: validKey(process.env.ROOTSYS_API_KEY || ""),
      ownerVerified: true,
      redisVerified: true,
      productionBlocked: true,
      model: "deepseek-v4-flash",
      dailyAttempts: 5,
      inspectionsPerMinute: 6,
    });
  } catch (error) {
    if (error instanceof RequestError)
      return reply({ error: error.message }, error.status);
    return reply({ error: "Rootsys readiness unavailable." }, 502);
  }
}
