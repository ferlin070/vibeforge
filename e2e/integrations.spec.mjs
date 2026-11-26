import { test, expect } from "@playwright/test";
import { starterBlueprint } from "../lib/blueprint.mjs";

const origin = "http://127.0.0.1:4173";
const cloud = "https://vibeforgefixture.supabase.co";
const fixture = {
  id: "integration-fixture",
  name: "Booking studio",
  type: "Web application",
  idea: "Build a booking workspace for local businesses",
  audience: "Test users",
  agent: "Codex",
  reviewed: [],
  createdAt: "2026-11-25T00:00:00.000Z",
};
const approved = {
  ...fixture,
  blueprint: starterBlueprint(fixture),
  blueprintApproved: true,
  evidence: {},
};
const token = {
  access_token: "fixture.access.token",
  refresh_token: "fixture-refresh",
  expires_in: 3600,
  user: { id: "fixture-owner", email: "test@example.invalid" },
};
const stored = (page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("vibeforge-v2")));
const accept = (page) => page.once("dialog", (d) => d.accept());

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) =>
    route
      .request()
      .url()
      .startsWith(origin + "/")
      ? route.continue()
      : route.abort(),
  );
  await page.addInitScript((p) => {
    if (!localStorage.getItem("vibeforge-v2"))
      localStorage.setItem("vibeforge-v2", JSON.stringify([p]));
  }, approved);
});

test("mocked cloud sign-in, explicit backup, invalid snapshot exclusion and logout", async ({
  page,
}) => {
  const requests = [];
  const row = {
    id: fixture.id,
    project: { ...approved, name: "Restored booking studio" },
    updated_at: fixture.createdAt,
  };
  await page.route(cloud + "/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const method = req.method();
    const headers = {
      "access-control-allow-origin": origin,
      "access-control-allow-headers":
        "apikey, authorization, content-type, prefer",
      "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
    };
    if (method === "OPTIONS") {
      await route.fulfill({ status: 204, headers });
      return;
    }
    requests.push({ path, method, body: req.postDataJSON() });
    if (path === "/auth/v1/token") {
      await route.fulfill({ status: 200, headers, json: token });
    } else if (path === "/rest/v1/vibeforge_projects" && method === "GET") {
      await route.fulfill({
        status: 200,
        headers,
        json: new URL(req.url()).searchParams.has("id")
          ? []
          : [row, { ...row, id: "invalid" }],
      });
    } else if (path === "/rest/v1/vibeforge_projects" && method === "POST") {
      const body = req.postDataJSON();
      await route.fulfill({
        status: 201,
        headers,
        json: [
          { id: body.id, project: body.project, updated_at: body.updated_at },
        ],
      });
    } else if (path === "/rest/v1/vibeforge_projects" && method === "DELETE") {
      await route.fulfill({ status: 200, headers, json: [row] });
    } else {
      await route.fulfill({ status: 204, headers });
    }
  });
  await page.goto("/?view=cloud");
  await page.getByLabel("Email", { exact: true }).fill(token.user.email);
  await page.getByLabel("Password", { exact: true }).fill("fixture-password");
  await page.locator("form").getByRole("button", { name: "Sign in" }).click();
  await expect(
    page.getByRole("heading", { name: token.user.email }),
  ).toBeVisible();
  accept(page);
  await page.getByRole("button", { name: "Save cloud snapshot" }).click();
  await expect(page.getByRole("status")).toContainText("Snapshot saved.");
  expect(
    requests.find(
      (r) => r.path.includes("vibeforge_projects") && r.method === "POST",
    ).body.owner_id,
  ).toBe(token.user.id);
  await page.getByRole("button", { name: "List snapshots" }).click();
  await expect(page.getByRole("status")).toContainText(
    "1 valid snapshots; 1 invalid snapshots excluded",
  );
  await expect(
    page.getByRole("button", { name: "Restore local copy" }),
  ).toHaveCount(1);
  accept(page);
  await page.getByRole("button", { name: "Restore local copy" }).click();
  await expect
    .poll(async () => (await stored(page))[0].name)
    .toBe(row.project.name);
  accept(page);
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Cloud snapshot deleted.",
  );
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
  expect(JSON.stringify(await stored(page))).not.toContain(token.access_token);
  expect(JSON.stringify(await stored(page))).not.toContain(token.refresh_token);
  expect((await stored(page))[0].name).toBe(row.project.name);
});

test("mocked AI failure and candidate review preserve existing work until apply", async ({
  page,
}) => {
  let calls = 0;
  const candidate = starterBlueprint({
    ...fixture,
    idea: "Build a revised booking workspace",
  });
  await page.route(origin + "/api/blueprint", async (route) => {
    const request = route.request().postDataJSON();
    expect(request.provider).toBe("gemini");
    expect(request.model).toBe("gemini-2.5-flash");
    calls++;
    await route.fulfill(
      calls === 1
        ? { status: 422, json: { error: "AI returned malformed JSON." } }
        : { status: 200, json: { blueprint: candidate } },
    );
  });
  await page.route(cloud + "/**", async (route) => {
    const headers = {
      "access-control-allow-origin": origin,
      "access-control-allow-headers": "apikey, authorization, content-type",
      "access-control-allow-methods": "POST, OPTIONS",
    };
    await route.fulfill(
      route.request().method() === "OPTIONS"
        ? { status: 204, headers }
        : { status: 200, headers, json: token },
    );
  });
  await page.goto("/?view=cloud");
  await page.getByLabel("Email", { exact: true }).fill(token.user.email);
  await page.getByLabel("Password", { exact: true }).fill("fixture-password");
  await page.locator("form").getByRole("button", { name: "Sign in" }).click();
  await expect(
    page.getByRole("heading", { name: token.user.email }),
  ).toBeVisible();
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "AI blueprint", exact: true })
    .click();
  const key = page.getByLabel("Google Gemini API key");
  await expect(page.getByLabel("Model ID")).toHaveValue("gemini-2.5-flash");
  const generate = page.getByRole("button", { name: "Generate with AI ✦" });
  await key.fill("fixture-key-1234");
  accept(page);
  await generate.click();
  await expect(page.getByText(/Existing blueprint retained/)).toBeVisible();
  await expect(key).toHaveValue("");
  expect((await stored(page))[0].blueprintApproved).toBe(true);
  expect(calls).toBe(1);
  await key.fill("fixture-key-1234");
  accept(page);
  await generate.click();
  await expect(
    page.getByRole("heading", { name: "Generated candidate — not applied" }),
  ).toBeVisible();
  expect((await stored(page))[0].blueprint).toEqual(approved.blueprint);
  expect((await stored(page))[0].blueprintApproved).toBe(true);
  accept(page);
  await page.getByRole("button", { name: "Apply candidate" }).click();
  await expect
    .poll(async () => (await stored(page))[0].blueprintApproved)
    .toBe(false);
  expect((await stored(page))[0].blueprint).toEqual(candidate);
  expect(calls).toBe(2);
});

test("responsive visual audit captures local synthetic screens", async ({
  page,
}) => {
  const results = [];
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const view of [
      "overview",
      "studio",
      "cloud",
      "mission",
      "quality",
      "agents",
    ]) {
      await page.goto("/?view=" + view);
      await expect(page.locator("#main-content")).toBeVisible();
      await expect(page.locator("#main-content h1").first()).toBeVisible();
      const metrics = await page.evaluate(() => ({
        viewport: innerWidth,
        page: document.documentElement.scrollWidth,
        main: document.querySelector("#main-content").clientWidth,
      }));
      results.push({
        view,
        width,
        ...metrics,
        overflow: metrics.page > width + 1,
      });
      if (
        process.env.VF_VISUAL_CAPTURE === "1" &&
        ((width === 1440 && ["overview", "cloud"].includes(view)) ||
          (width === 390 && view === "studio"))
      ) {
        const shot = await page.screenshot({ type: "jpeg", quality: 36 });
        const chunks = shot.toString("base64").match(/.{1,2000}/g);
        for (let i = 0; i < chunks.length; i++)
          console.log(
            "VF_SHOT " +
              JSON.stringify({
                view,
                width,
                i,
                count: chunks.length,
                data: chunks[i],
              }),
          );
      }
    }
  }
  console.log("VF_LAYOUT " + JSON.stringify(results));
  expect(results).toHaveLength(18);
  expect(results.filter((result) => result.overflow)).toEqual([]);
});

test("document reading view preserves text and returns to editor", async ({
  page,
}) => {
  await page.goto("/?view=studio");
  const editor = page.getByLabel("Specification document");
  await expect(editor).toBeVisible();
  const original = await editor.inputValue();
  await page.getByRole("button", { name: "Reading view" }).click();
  const reader = page.getByRole("article", { name: "Document reading view" });
  await expect(reader).toBeVisible();
  await expect(reader).toContainText("Project brief");
  await page.getByRole("button", { name: "Edit Markdown" }).click();
  await expect(editor).toHaveValue(original);
});

test("dashboard command center navigates to approved handoff queue", async ({
  page,
}) => {
  await page.goto("/?view=overview");
  const center = page.getByRole("region", {
    name: "Active project command center",
  });
  await expect(center).toBeVisible();
  await expect(
    center.getByText("Booking studio", { exact: true }),
  ).toBeVisible();
  await expect(center.getByText("0/4", { exact: true })).toBeVisible();
  await center
    .getByRole("button", { name: "Continue implementation handoff →" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Mission Control", exact: true }),
  ).toBeVisible();
});

test("checkpoint recovery creates a separate draft without overwriting the original", async ({
  page,
}) => {
  await page.goto("/?view=context");
  await page.getByLabel("Checkpoint name").fill("Before changes");
  await page.getByRole("button", { name: "Save checkpoint" }).click();
  await expect(
    page.getByRole("heading", { name: "Before changes", exact: true }),
  ).toBeVisible();
  accept(page);
  await page
    .getByRole("button", { name: "Restore checkpoint as draft" })
    .click();
  await expect(
    page.getByRole("heading", { name: "AI Blueprint Studio", exact: true }),
  ).toBeVisible();
  await expect.poll(async () => (await stored(page)).length).toBe(2);
  const projects = await stored(page);
  expect(projects[0].name).toBe(fixture.name + " (recovered draft)");
  expect(projects[0].blueprintApproved).toBe(false);
  expect(projects[1].id).toBe(fixture.id);
  expect(projects[1].blueprintApproved).toBe(true);
});

test("Agent Hub filters targets and preserves approved project work", async ({
  page,
}) => {
  await page.goto("/?view=agents&project=integration-fixture");
  await expect(page.getByRole("heading", { name: "Agent Hub" })).toBeVisible();
  await page.getByLabel("Search agents").fill("OpenCode");
  await expect(page.getByRole("heading", { name: "OpenCode" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Hermes Agent" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Use agent" }).click();
  await expect.poll(async () => (await stored(page))[0].agent).toBe("OpenCode");
  const project = (await stored(page))[0];
  expect(project.blueprintApproved).toBe(true);
  expect(project.blueprint).toEqual(approved.blueprint);
  await page.reload();
  await expect(page.getByText("Preferred agent: OpenCode")).toBeVisible();
  await page.getByRole("button", { name: "Open Prompt Lab" }).click();
  await expect(page.locator("pre")).toContainText("Target agent: OpenCode");
});

test("architecture and review workbenches do not change approved project", async ({
  page,
}) => {
  await page.goto("/?view=studio");
  await expect(
    page.getByRole("heading", { name: "AI Project Architect 2.0" }),
  ).toBeVisible();
  const option = page.locator("article").filter({
    has: page.getByRole("heading", { name: "Self-hosted application" }),
  });
  await option.getByRole("button", { name: "Select option" }).click();
  await expect(option.getByRole("button")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const adrDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export ADR candidate" }).click();
  expect((await adrDownload).suggestedFilename()).toBe(
    "architecture-decision-candidate.md",
  );
  await page.goto("/?view=quality");
  await page.getByLabel("Reproduction / error log").fill("TypeError: fixture");
  const debugDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export debug investigation" })
    .click();
  expect((await debugDownload).suggestedFilename()).toBe(
    "debug-investigation.md",
  );
  await page.getByRole("button", { name: "Code review", exact: true }).click();
  await page.getByLabel("Review diff").fill("+eval(input)");
  await expect(
    page.getByText("Dynamic evaluation: 1 possible matches"),
  ).toBeVisible();
  const reviewDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export code review prompt" }).click();
  expect((await reviewDownload).suggestedFilename()).toBe("code-review.md");
  const project = (await stored(page))[0];
  expect(project.blueprintApproved).toBe(true);
  expect(project.blueprint).toEqual(approved.blueprint);
  expect(project.evidence).toEqual({});
});

test("enterprise portfolio filters projects and resumes the correct next action", async ({
  page,
}) => {
  await page.goto("/?view=overview");
  const portfolio = page.getByRole("region", { name: "Continue building" });
  await expect(
    portfolio.getByText("Booking studio", { exact: true }),
  ).toBeVisible();
  await portfolio.getByLabel("Search portfolio").fill("not present");
  await expect(portfolio.getByText("No matching projects.")).toBeVisible();
  await portfolio.getByRole("button", { name: "Reset filters" }).click();
  await portfolio.getByLabel("Portfolio status").selectOption("Planning");
  await expect(portfolio.getByText("No matching projects.")).toBeVisible();
  await portfolio.getByLabel("Portfolio status").selectOption("Implementation");
  await portfolio
    .getByRole("button", {
      name: "Continue implementation handoff →",
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Mission Control", exact: true }),
  ).toBeVisible();
  expect((await stored(page))[0].blueprint).toEqual(approved.blueprint);
});

test("memory explorer edits knowledge without resetting approval", async ({
  page,
}) => {
  await page.goto("/?view=context");
  await page.getByLabel("Category", { exact: true }).selectOption("Knowledge");
  await page.getByLabel("Title", { exact: true }).fill("Fixture note");
  await page.getByLabel("Note", { exact: true }).fill("Original body");
  await page.getByRole("button", { name: "Add memory entry" }).click();
  await expect(
    page.getByRole("heading", { name: "Fixture note" }),
  ).toBeVisible();
  await page.getByLabel("Search memory").fill("not present");
  await expect(page.getByText("0 matching memory entries")).toBeVisible();
  await page.getByLabel("Search memory").fill("Fixture");
  await page.getByRole("button", { name: "Edit memory" }).click();
  await page.getByLabel("Note", { exact: true }).fill("Revised body");
  await page.getByRole("button", { name: "Save memory changes" }).click();
  await expect(page.getByText("Revised body", { exact: true })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export filtered memory" }).click();
  expect((await download).suggestedFilename()).toBe(
    "project-memory-selection.json",
  );
  const project = (await stored(page))[0];
  expect(project.blueprintApproved).toBe(true);
  expect(project.memory).toHaveLength(1);
  expect(project.memory[0].body).toBe("Revised body");
});

test("workflow waves allow confirmed assignment only for ready tasks", async ({
  page,
}) => {
  await page.goto("/?view=agents");
  const graph = page.getByLabel("Dependency workflow", { exact: true });
  await expect(graph.getByRole("heading", { name: "Wave 1" })).toBeVisible();
  const ready = graph.locator("article").filter({
    hasText: "TASK-001 · Ready",
  });
  const blocked = graph.locator("article").filter({
    hasText: "TASK-002 · Blocked",
  });
  await expect(blocked.getByRole("button")).toBeDisabled();
  accept(page);
  await ready.getByRole("button", { name: "Assign suggested agent" }).click();
  await expect(graph.getByText("TASK-001 · Assigned")).toBeVisible();
  const project = (await stored(page))[0];
  expect(project.mission.assignments["TASK-001"].handedOff).toBe(false);
  expect(project.blueprintApproved).toBe(true);
  expect(project.blueprint).toEqual(approved.blueprint);
  expect(project.evidence).toEqual({});
});

test("architecture draft exports entities and contracts without changing project", async ({
  page,
}) => {
  await page.goto("/?view=studio");
  const studio = page.getByRole("region", {
    name: "Visual Architecture Studio",
  });
  await studio.getByLabel("Entity name").fill("Customer");
  await studio
    .getByLabel("Fields (name:type, comma separated)")
    .fill("id:uuid");
  await studio.getByRole("button", { name: "Add entity" }).click();
  await studio.getByLabel("Entity name").fill("Booking");
  await studio
    .getByLabel("Fields (name:type, comma separated)")
    .fill("id:uuid");
  await studio.getByRole("button", { name: "Add entity" }).click();
  await studio.getByLabel("From entity").selectOption("Customer");
  await studio.getByLabel("To entity").selectOption("Booking");
  await studio.getByRole("button", { name: "Add relationship" }).click();
  await expect(studio.getByText("Customer → Booking")).toBeVisible();
  await studio.getByLabel("Endpoint path").fill("/api/bookings");
  await studio.getByLabel("Endpoint purpose").fill("List owned bookings");
  await studio.getByRole("button", { name: "Add endpoint" }).click();
  await expect(studio.getByText("GET /api/bookings")).toBeVisible();
  const download = page.waitForEvent("download");
  await studio
    .getByRole("button", { name: "Export architecture model" })
    .click();
  expect((await download).suggestedFilename()).toBe("architecture-draft.json");
  await studio
    .getByRole("button", { name: "Save local architecture draft" })
    .click();
  await expect(
    studio.getByText("Architecture draft saved.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  accept(page);
  await studio
    .getByRole("button", { name: "Restore local architecture draft" })
    .click();
  await expect(studio.getByText("Customer → Booking")).toBeVisible();
  await expect(studio.getByText("GET /api/bookings")).toBeVisible();
  expect((await stored(page))[0].blueprint).toEqual(approved.blueprint);
  expect((await stored(page))[0].blueprintApproved).toBe(true);
});

test("template library creates a separate unapproved project through the wizard", async ({
  page,
}) => {
  await page.goto("/?view=templates");
  await page.getByLabel("Search templates").fill("homestay");
  await page.getByLabel("Template category").selectOption("Hospitality");
  await expect(
    page.getByRole("heading", { name: "Homestay Booking" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Use template" }).click();
  await expect(page.getByLabel("Project name")).toHaveValue("Homestay Booking");
  await page.getByRole("button", { name: "Continue →" }).click();
  await expect(page.getByLabel("What do you want to build?")).toHaveValue(
    /room availability/,
  );
  await page.getByRole("button", { name: "Continue →" }).click();
  await page.getByLabel("Preferred coding agent").selectOption("OpenCode");
  await page
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await expect.poll(async () => (await stored(page)).length).toBe(2);
  const projects = await stored(page);
  expect(projects[0].name).toBe("Homestay Booking");
  expect(projects[0].agent).toBe("OpenCode");
  expect(projects[0].blueprintApproved).toBeFalsy();
  expect(projects[1].blueprint).toEqual(approved.blueprint);
});

test("collaboration shares only a brief and imports an independent draft", async ({
  page,
}) => {
  const owner = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const peer = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const sentId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  const incoming = {
    id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    sender_id: peer,
    recipient_id: owner,
    draft: {
      name: "Peer project",
      type: "Website",
      idea: "Build a portfolio",
      audience: "",
      agent: "OpenCode",
    },
    created_at: fixture.createdAt,
  };
  const rows = [incoming];
  await page.route(cloud + "/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const method = req.method();
    const headers = {
      "access-control-allow-origin": origin,
      "access-control-allow-headers":
        "apikey, authorization, content-type, prefer",
      "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
    };
    if (method === "OPTIONS") return route.fulfill({ status: 204, headers });
    if (path === "/auth/v1/token")
      return route.fulfill({
        status: 200,
        headers,
        json: { ...token, user: { ...token.user, id: owner } },
      });
    if (path === "/rest/v1/vibeforge_shared_drafts") {
      if (method === "POST") {
        const body = req.postDataJSON();
        expect(body.sender_id).toBe(owner);
        expect(body.recipient_id).toBe(peer);
        expect(body.draft.blueprint).toBeUndefined();
        expect(body.draft.blueprintApproved).toBeUndefined();
        const sent = { ...body, id: sentId, created_at: fixture.createdAt };
        rows.push(sent);
        return route.fulfill({ status: 201, headers, json: [sent] });
      }
      if (method === "DELETE") {
        rows.splice(
          rows.findIndex((row) => row.id === sentId),
          1,
        );
        return route.fulfill({ status: 200, headers, json: [{ id: sentId }] });
      }
      const params = new URL(req.url()).searchParams;
      const exactId = params.get("id");
      if (exactId) {
        expect(params.get("recipient_id")).toBe("eq." + owner);
        expect(params.get("limit")).toBe("1");
        return route.fulfill({
          status: 200,
          headers,
          json: rows.filter(
            (row) => "eq." + row.id === exactId && row.recipient_id === owner,
          ),
        });
      }
      return route.fulfill({ status: 200, headers, json: rows });
    }
    return route.fulfill({ status: 404, headers });
  });
  await page.goto("/?view=team");
  await page.getByRole("button", { name: "Open cloud account" }).click();
  await page.getByLabel("Email", { exact: true }).fill(token.user.email);
  await page.getByLabel("Password", { exact: true }).fill("fixture-password");
  await page.locator("form").getByRole("button", { name: "Sign in" }).click();
  await expect(
    page.getByRole("heading", { name: token.user.email }),
  ).toBeVisible();
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Team collaboration" })
    .click();
  await page.getByLabel("Recipient account ID").fill(peer);
  accept(page);
  await page.getByRole("button", { name: "Share brief", exact: true }).click();
  await expect(
    page.getByText("Brief shared. Refresh to see it in your list."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Refresh shares" }).click();
  await expect(
    page.getByRole("heading", { name: "Peer project" }),
  ).toBeVisible();
  accept(page);
  await page.getByRole("button", { name: "Revoke share" }).click();
  await expect(page.getByText("Share revoked.")).toBeVisible();
  accept(page);
  await page.getByRole("button", { name: "Import as new draft" }).click();
  await expect.poll(async () => (await stored(page)).length).toBe(2);
  const projects = await stored(page);
  expect(projects[0].name).toBe("Peer project");
  expect(projects[0].blueprintApproved).toBe(false);
  expect(projects[1].blueprint).toEqual(approved.blueprint);
});

test("project rescue exports an investigation without changing approval", async ({
  page,
}) => {
  await page.goto("/?view=quality");
  await page.getByRole("button", { name: "Rescue", exact: true }).click();
  const rescue = page.getByRole("region", { name: "Project rescue" });
  await expect(
    rescue.getByRole("heading", { name: "AI Project Rescue" }),
  ).toBeVisible();
  await rescue
    .getByLabel("Reported symptoms")
    .fill("Build failed with a timeout");
  const download = page.waitForEvent("download");
  await rescue
    .getByRole("button", { name: "Export rescue investigation" })
    .click();
  expect((await download).suggestedFilename()).toBe("project-rescue.md");
  expect((await stored(page))[0].blueprint).toEqual(approved.blueprint);
  expect((await stored(page))[0].blueprintApproved).toBe(true);
});

test("team workspace owner creates a workspace and publishes an independent brief", async ({
  page,
}) => {
  const owner = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const peer = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const teamId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  const briefId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
  const spaces = [];
  const members = [];
  const briefs = [];
  await page.route(cloud + "/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    const headers = {
      "access-control-allow-origin": origin,
      "access-control-allow-headers":
        "apikey, authorization, content-type, prefer",
      "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
    };
    if (method === "OPTIONS") return route.fulfill({ status: 204, headers });
    if (url.pathname === "/auth/v1/token")
      return route.fulfill({
        status: 200,
        headers,
        json: { ...token, user: { ...token.user, id: owner } },
      });
    const tables = {
      "/rest/v1/vibeforge_team_spaces": spaces,
      "/rest/v1/vibeforge_team_members": members,
      "/rest/v1/vibeforge_team_briefs": briefs,
    };
    const list = tables[url.pathname];
    if (!list) return route.fulfill({ status: 404, headers });
    if (method === "POST") {
      const body = req.postDataJSON();
      if (list === spaces) expect(body.owner_id).toBe(owner);
      if (list === members) expect(body.role).toBe("viewer");
      if (list === briefs) {
        expect(body.author_id).toBe(owner);
        expect(body.draft.blueprint).toBeUndefined();
      }
      const row = {
        ...body,
        ...(list === spaces ? { id: teamId } : {}),
        ...(list === briefs ? { id: briefId } : {}),
        created_at: fixture.createdAt,
      };
      list.push(row);
      return route.fulfill({ status: 201, headers, json: [row] });
    }
    return route.fulfill({
      status: 200,
      headers,
      json: list.filter((row) =>
        ["id", "team_id", "user_id"].every(
          (key) =>
            !url.searchParams.has(key) ||
            url.searchParams.get(key) === "eq." + row[key],
        ),
      ),
    });
  });
  await page.goto("/?view=team");
  await page.getByRole("button", { name: "Open cloud account" }).click();
  await page.getByLabel("Email", { exact: true }).fill(token.user.email);
  await page.getByLabel("Password", { exact: true }).fill("fixture-password");
  await page.locator("form").getByRole("button", { name: "Sign in" }).click();
  await expect(
    page.getByRole("heading", { name: token.user.email }),
  ).toBeVisible();
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Team collaboration" })
    .click();
  const area = page.getByRole("region", { name: "Team workspaces" });
  await area.getByLabel("Workspace name").fill("Test product team");
  accept(page);
  await area.getByRole("button", { name: "Create workspace" }).click();
  await expect(area.getByText("Your role: owner")).toBeVisible();
  await area.getByLabel("Member account ID").fill(peer);
  accept(page);
  await area.getByRole("button", { name: "Add member" }).click();
  await expect(area.getByText("Member added.", { exact: true })).toBeVisible();
  accept(page);
  await area
    .getByRole("button", { name: "Publish active project brief" })
    .click();
  await expect(
    area.getByText("Brief published.", { exact: true }),
  ).toBeVisible();
  accept(page);
  await area.getByRole("button", { name: "Import team draft" }).click();
  await expect.poll(async () => (await stored(page)).length).toBe(2);
  const projects = await stored(page);
  expect(projects[0].blueprintApproved).toBe(false);
  expect(projects[1].blueprint).toEqual(approved.blueprint);
});

test("operations and Malay navigation persist without changing project data", async ({
  page,
}) => {
  await page.goto("/?view=operations");
  const sidebar = page.locator(".sidebar");
  await expect(
    page.getByRole("heading", { name: "Workspace operations" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: fixture.name })).toBeVisible();
  const before = await stored(page);
  await sidebar.getByLabel("Interface language").selectOption("ms");
  await expect(
    page.getByRole("heading", { name: "Operasi ruang kerja" }),
  ).toBeVisible();
  await page.reload();
  await expect(sidebar.getByLabel("Bahasa antara muka")).toHaveValue("ms");
  await expect(
    page.getByRole("heading", { name: "Operasi ruang kerja" }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Eksport laporan ringkas" }).click();
  expect((await download).suggestedFilename()).toBe(
    "vibeforge-workspace-report.json",
  );
  expect(await stored(page)).toEqual(before);
  await sidebar.getByLabel("Bahasa antara muka").selectOption("en");
  await page.getByRole("button", { name: "Inspect quality" }).click();
  await expect(page).toHaveURL(/view=quality.*project=integration-fixture/);
});

test("local backup import validates and restores independent drafts", async ({
  page,
}) => {
  await page.goto("/?view=guide");
  const input = page.getByLabel("Backup JSON file");
  const before = await stored(page);
  await input.setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify([approved, approved])),
  });
  await expect(
    page.getByText(/1–200 valid, uniquely identified/),
  ).toBeVisible();
  expect(await stored(page)).toEqual(before);
  await input.setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify([approved])),
  });
  await expect(
    page.getByRole("heading", { name: "1 valid project(s)" }),
  ).toBeVisible();
  accept(page);
  await page.getByRole("button", { name: "Import as new drafts" }).click();
  await expect(
    page.getByText("1 recovered draft(s) saved locally."),
  ).toBeVisible();
  const after = await stored(page);
  expect(after).toHaveLength(2);
  expect(after[0].id).not.toBe(approved.id);
  expect(after[0].blueprintApproved).toBe(false);
  expect(after[1]).toEqual(before[0]);
  await page.reload();
  expect(await stored(page)).toEqual(after);
});
