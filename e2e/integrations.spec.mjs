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
  const key = page.getByLabel(/API key/);
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
