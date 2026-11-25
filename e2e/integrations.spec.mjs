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
        json: [row, { ...row, id: "invalid" }],
      });
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
    for (const view of ["overview", "studio", "cloud", "mission", "quality"]) {
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
  expect(results).toHaveLength(15);
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
