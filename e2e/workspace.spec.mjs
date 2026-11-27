import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { starterBlueprint } from "../lib/blueprint.mjs";

const fixture = {
  id: "smoke-fixture",
  name: "Smoke project",
  type: "Web application",
  idea: "Build a booking workspace",
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
const origin = "http://127.0.0.1:4173";
const stored = (page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("vibeforge-v2")));
const nav = (page, name) =>
  page.locator(".sidebar").getByRole("button", { name, exact: true });
const seed = async (page, raw) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Build with direction/ }),
  ).toBeVisible();
  await page.evaluate(
    (value) => localStorage.setItem("vibeforge-v2", value),
    raw,
  );
};
const accept = (page) => page.once("dialog", (d) => d.accept());
const dismiss = (page) => page.once("dialog", (d) => d.dismiss());
async function download(page, name) {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name, exact: true }).click();
  const item = await pending;
  return { path: await item.path(), name: item.suggestedFilename() };
}

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) =>
    route
      .request()
      .url()
      .startsWith(origin + "/")
      ? route.continue()
      : route.abort(),
  );
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /content security policy|violates the following/i.test(message.text())
    )
      errors.push(message.text());
  });
  page.__smokeErrors = errors;
});
test.afterEach(async ({ page }) => {
  expect(page.__smokeErrors || []).toEqual([]);
});

test("wizard creates project, manual blueprint approves and exports real files", async ({
  page,
}) => {
  await page.goto("/?view=new");
  await page.getByLabel("Project name").fill("Browser created");
  await page.getByRole("button", { name: "Continue →", exact: true }).click();
  await page
    .getByLabel("What do you want to build?")
    .fill("Create a booking site");
  await page.getByLabel("Target users (optional)").fill("Local businesses");
  await page.getByRole("button", { name: "Continue →", exact: true }).click();
  await page.getByLabel("Preferred coding agent").selectOption("Codex");
  await page
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "AI Blueprint Studio" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start manual blueprint" }).click();
  await expect(
    page.getByRole("heading", { name: /Blueprint quality/ }),
  ).toBeVisible();
  accept(page);
  await page.getByRole("button", { name: "Approve blueprint" }).click();
  await expect(
    page.getByRole("button", { name: "Reopen approval" }),
  ).toBeVisible();
  const md = await download(page, "Export Markdown kit");
  expect(await readFile(md.path, "utf8")).toContain("Browser created");
  const json = await download(page, "Export JSON");
  expect(JSON.parse(await readFile(json.path, "utf8")).approved).toBe(true);
  const zip = await download(page, "Export ZIP kit");
  expect(zip.name).toBe("VibeForge-development-kit.zip");
  const listing = execFileSync("unzip", ["-Z1", zip.path], {
    encoding: "utf8",
  });
  expect(listing).toContain("AGENTS.md");
  expect(listing).toContain("tasks/TASK-001.json");
  execFileSync("unzip", ["-t", zip.path], { stdio: "pipe" });
  await expect
    .poll(async () => (await stored(page))[0].blueprintApproved)
    .toBe(true);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Reopen approval" }),
  ).toBeVisible();
});

test("manual mission handoff and human review unlock next dependency", async ({
  page,
}) => {
  await seed(page, JSON.stringify([approved]));
  await page.goto("/?view=mission&project=smoke-fixture");
  await page.getByRole("button", { name: "Save assignment" }).click();
  await expect(
    page.getByRole("button", { name: "Record sent handoff" }),
  ).toBeEnabled();
  accept(page);
  await page.getByRole("button", { name: "Record sent handoff" }).click();
  await page
    .getByLabel("Implementation report / test evidence")
    .fill("Synthetic smoke evidence: checked acceptance criteria.");
  await page.getByRole("button", { name: "Submit report" }).click();
  await expect(
    page.getByRole("button", { name: "Accept human review" }),
  ).toBeEnabled();
  accept(page);
  await page.getByRole("button", { name: "Accept human review" }).click();
  await expect
    .poll(async () => (await stored(page))[0].evidence["TASK-001"].reviewed)
    .toBe(true);
  const row = page
    .getByRole("region", { name: "Mission queue" })
    .locator(".taskrow")
    .filter({ hasText: "TASK-002" });
  await expect(row).toContainText("Ready");
  const coordination = page.getByRole("region", { name: "Agent coordination" });
  const nextTask = coordination
    .locator(".taskrow")
    .filter({ hasText: "TASK-002" });
  await expect(nextTask).toContainText("Assign role");
  await nextTask.getByRole("button", { name: "Select task" }).click();
  await expect(
    page.getByRole("button", { name: "Save assignment" }),
  ).toBeEnabled();
  await nav(page, "Context manager").click();
  await expect(
    page.getByRole("heading", { name: "Project memory & handoff" }),
  ).toBeVisible();
  await page.getByLabel("Category", { exact: true }).selectOption("Knowledge");
  await page.getByLabel("Title", { exact: true }).fill("Browser note");
  await page
    .getByLabel("Note", { exact: true })
    .fill("Preserve approved evidence");
  await page.getByRole("button", { name: "Add memory entry" }).click();
  await expect(
    page.getByRole("heading", { name: "Browser note" }),
  ).toBeVisible();
  await expect
    .poll(async () => (await stored(page))[0].evidence["TASK-001"].reviewed)
    .toBe(true);
});

test("document draft cancellation, save, browser history and deep link", async ({
  page,
}) => {
  await seed(page, JSON.stringify([fixture]));
  await page.goto("/?view=docs&project=smoke-fixture");
  const doc = page.getByLabel("Project document");
  await doc.fill("Unsaved smoke draft");
  dismiss(page);
  await nav(page, "Overview").click();
  await expect(doc).toHaveValue("Unsaved smoke draft");
  await page.getByRole("button", { name: "Save document" }).click();
  await expect
    .poll(async () => (await stored(page))[0].document)
    .toBe("Unsaved smoke draft");
  await nav(page, "Overview").click();
  await expect(
    page.getByRole("heading", { name: "What will you build today?" }),
  ).toBeVisible();
  await page.goBack();
  await expect(doc).toHaveValue("Unsaved smoke draft");
  await page.reload();
  await expect(doc).toHaveValue("Unsaved smoke draft");
});

test("corrupted local data stays intact until explicit recovery", async ({
  page,
}) => {
  const raw = "{broken synthetic data";
  await seed(page, raw);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Local data recovery" }),
  ).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("vibeforge-v2"))).toBe(
    raw,
  );
  accept(page);
  const backup = await download(page, "Emergency original backup");
  expect(await readFile(backup.path, "utf8")).toBe(raw);
  dismiss(page);
  await page
    .getByRole("button", { name: "Keep validated projects and resume saving" })
    .click();
  expect(await page.evaluate(() => localStorage.getItem("vibeforge-v2"))).toBe(
    raw,
  );
  accept(page);
  await page
    .getByRole("button", { name: "Keep validated projects and resume saving" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Local data recovery" }),
  ).toHaveCount(0);
  expect(await stored(page)).toEqual([]);
});

test("mobile navigation modal, Escape, keyboard focus and layout", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page, JSON.stringify([fixture]));
  await page.goto("/?view=overview");
  const menu = page.getByRole("button", { name: "Toggle navigation" });
  await menu.click();
  const dialog = page.getByRole("dialog", { name: "Workspace navigation" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(menu).toBeFocused();
  await menu.click();
  await dialog
    .getByRole("button", { name: "Documentation", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Documentation studio" }),
  ).toBeVisible();
  await expect(dialog).not.toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});

test("served security headers, CSP hydration and hosted API auth rejection", async ({
  page,
  request,
}) => {
  const response = await page.goto("/?view=overview");
  const h = response.headers();
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["content-security-policy"]).not.toContain("'unsafe-eval'");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["cross-origin-opener-policy"]).toBe("same-origin");
  expect(h["strict-transport-security"]).toContain("max-age=63072000");
  await expect(
    page.getByRole("heading", { name: "What will you build today?" }),
  ).toBeVisible();
  for (const [endpoint, data, extra] of [
    [
      "blueprint",
      { provider: "openai", model: "gpt-4.1-mini", project: fixture },
      { "x-provider-key": "fixture-key-1234" },
    ],
    ["repository", { repo: "owner/repo" }, {}],
    ["ci", { repo: "owner/repo", sha: "a".repeat(40) }, {}],
  ]) {
    const denied = await request.post("/api/" + endpoint, {
      data,
      headers: { origin, ...extra },
    });
    expect(denied.status(), await denied.text()).toBe(401);
    const browserStatus = await page.evaluate(
      async ({ endpoint, data, extra }) => {
        const res = await fetch("/api/" + endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...extra },
          body: JSON.stringify(data),
        });
        return { status: res.status, body: await res.text() };
      },
      { endpoint, data, extra },
    );
    expect(browserStatus.status, browserStatus.body).toBe(401);
    const cross = await request.post("/api/" + endpoint, {
      data,
      headers: { origin: "https://invalid.example", ...extra },
    });
    expect(cross.status()).toBe(403);
  }
});
