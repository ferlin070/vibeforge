import { boundedJSON } from "./request-guard.mjs";
import { validKey } from "./providers.mjs";

const base = "https://rootsys.cloud/v1";

function count(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export function normalizeQuota(raw) {
  const q = raw?.data ?? raw;
  const expiry = q?.expires_at;
  return {
    remaining: count(q?.tokens_remaining ?? q?.remaining),
    total: count(q?.tokens_total ?? q?.total),
    used: count(q?.tokens_used ?? q?.used),
    expiresAt:
      typeof expiry === "string" &&
      /^\d{4}-\d{2}-\d{2}T/.test(expiry) &&
      Number.isFinite(Date.parse(expiry))
        ? new Date(expiry).toISOString()
        : null,
  };
}

export async function inspectRootsys(key, fetcher = fetch) {
  if (!validKey(key)) throw Error("Rootsys is not configured.");
  const read = async (path) => {
    const response = await fetcher(base + path, {
      method: "GET",
      headers: { Authorization: "Bearer " + key },
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw Error("Rootsys inspection failed.");
    return boundedJSON(response, 100000);
  };
  const [catalogue, rawQuota] = await Promise.all([
    read("/models"),
    read("/quota"),
  ]);
  if (!Array.isArray(catalogue?.data)) throw Error("Invalid model catalogue.");
  const models = [
    ...new Set(
      catalogue.data
        .map((item) => item?.id)
        .filter(
          (id) =>
            typeof id === "string" &&
            /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,119}$/.test(id) &&
            !id.includes(key) &&
            !id.startsWith("fiq-"),
        ),
    ),
  ].sort();
  const result = {
    models: models.slice(0, 100),
    pilotAvailable: models.includes("deepseek-v4-flash"),
    quota: normalizeQuota(rawQuota),
  };
  if (JSON.stringify(result).includes(key)) throw Error("Invalid metadata.");
  return result;
}
