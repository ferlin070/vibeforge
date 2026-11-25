import { githubError } from "../../../lib/github-errors.mjs";
import {
  guard,
  boundedText,
  boundedJSON,
  RequestError,
  sameOrigin,
} from "../../../lib/request-guard.mjs";
import { parseRepo } from "../../../lib/repository.mjs";
import { normalizeRuns } from "../../../lib/quality.mjs";
export const runtime = "nodejs";
export const maxDuration = 30;
export async function POST(req) {
  const reply = (b, status = 200) =>
    Response.json(b, { status, headers: { "Cache-Control": "no-store" } });
  try {
    if (!sameOrigin(req))
      return reply({ error: "Cross-origin request blocked." }, 403);
    if (Number(req.headers.get("content-length") || 0) > 4000)
      return reply({ error: "Request too large" }, 413);
    const raw = await boundedText(req, 4000);
    if (raw.length > 4000) return reply({ error: "Request too large" }, 413);
    let repo, sha;
    try {
      const b = JSON.parse(raw);
      repo = parseRepo(b.repo);
      sha = b.sha;
      if (!/^[0-9a-f]{40}$/i.test(sha)) throw Error();
    } catch {
      return reply(
        { error: "Valid repository and 40-character commit SHA required." },
        400,
      );
    }
    const token = req.headers.get("x-github-token") || "";
    if (token && !/^[A-Za-z0-9_-]{12,300}$/.test(token))
      return reply({ error: "Invalid GitHub token" }, 400);
    await guard(req, "ci", { githubToken: !!token });
    const url =
      "https://api.github.com/repos/" +
      repo +
      "/actions/runs?head_sha=" +
      encodeURIComponent(sha) +
      "&per_page=20";
    const res = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(24000),
    });
    if (!res.ok) throw githubError(res, !!token);
    return reply({
      ci: normalizeRuns(repo, sha, await boundedJSON(res, 1000000)),
    });
  } catch (e) {
    if (e instanceof RequestError) return reply({ error: e.message }, e.status);
    return reply({ error: "CI import failed or timed out." }, 502);
  }
}
