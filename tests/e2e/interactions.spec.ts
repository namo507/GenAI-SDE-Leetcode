import { expect, test } from "@playwright/test";

test("onboarding saves the plan and opens today", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Main target role").selectOption("ml-engineer");
  await page.getByLabel("Data engineer").check();
  await page.getByRole("button", { name: "Start my 16 weeks" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Week 1, day 1");
  await expect(page.getByText("Preparing for ML engineer, Data engineer")).toBeVisible();
});

test("ELI5 and Senior toggle uses aria-pressed and keeps focus", async ({ page }) => {
  await page.goto("/learn/dsa/sliding-window");
  const group = page.getByRole("group", { name: /Explanation depth/ });
  const eli5 = group.getByRole("button", { name: "ELI5" });
  const senior = group.getByRole("button", { name: "Senior" });
  await expect(eli5).toHaveAttribute("aria-pressed", "true");
  await senior.focus();
  await page.keyboard.press("Enter");
  await expect(senior).toHaveAttribute("aria-pressed", "true");
  await expect(eli5).toHaveAttribute("aria-pressed", "false");
  await expect(senior).toBeFocused();
  await expect(page.getByRole("heading", { name: "Trade-offs" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Where the analogy stops working" })).toHaveCount(0);
});

test("runner tabs follow the WAI-ARIA keyboard pattern", async ({ page }) => {
  await page.goto("/learn/dsa/sliding-window");
  const tabs = page.getByRole("tablist", { name: /Language for/ });
  const python = tabs.getByRole("tab", { name: "Python" });
  await python.focus();
  await page.keyboard.press("ArrowRight");
  const r = tabs.getByRole("tab", { name: "R" });
  await expect(r).toHaveAttribute("aria-selected", "true");
  await expect(r).toBeFocused();
  await expect(page.getByLabel(/R code, editable/)).toBeVisible();
  await page.keyboard.press("Home");
  await expect(python).toHaveAttribute("aria-selected", "true");
});

test("flow player steps, narrates and jumps from the transcript", async ({ page }) => {
  await page.goto("/learn/dsa/sliding-window");
  const flow = page.locator(".tp-flow").first();
  await expect(flow.getByText(/^Step 1 of \d+$/)).toBeVisible();
  await expect(flow.getByRole("button", { name: "Previous step" })).toBeDisabled();
  await flow.getByRole("button", { name: "Next step" }).click();
  await expect(flow.getByText(/^Step 2 of \d+$/)).toBeVisible();
  await expect(flow.locator(".tp-node[data-active='true']").first()).toBeVisible();
  await flow.getByText(/Transcript of all/).click();
  await flow.locator("details li button").nth(3).click();
  await expect(flow.getByText(/^Step 4 of \d+$/)).toBeVisible();
  await flow.getByRole("button", { name: "Reset" }).click();
  await expect(flow.getByText(/^Step 1 of \d+$/)).toBeVisible();
  // Nodes are focusable for keyboard users but cannot be dragged.
  const node = flow.locator(".react-flow__node").first();
  await expect(node).toHaveAttribute("tabindex", "0");
  await expect(node).not.toHaveClass(/draggable/);
});

test("play advances on its own and pauses", async ({ page }) => {
  await page.goto("/learn/dsa/sliding-window");
  const flow = page.locator(".tp-flow").first();
  await flow.getByLabel("Speed").selectOption("2");
  await flow.getByRole("button", { name: "Play" }).click();
  await expect(flow.getByText(/^Step 2 of \d+$/)).toBeVisible({ timeout: 3000 });
  await flow.getByRole("button", { name: "Pause" }).click();
  const text = await flow.locator(".tp-flow__step").innerText();
  await page.waitForTimeout(1500);
  await expect(flow.locator(".tp-flow__step")).toHaveText(text);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("active edges do not animate", async ({ page }) => {
    await page.goto("/learn/dsa/sliding-window");
    const flow = page.locator(".tp-flow").first();
    // Step 1 of this flow activates the p-w1 edge.
    const edge = flow.locator("path.tp-edge[data-active='true']").first();
    await expect(edge).toBeAttached();
    expect(await edge.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  });
});

test("a choice drill records an attempt that analytics then reports", async ({ page }) => {
  await page.goto("/practice#rag-diagnosis");
  const card = page.locator("article", { has: page.getByRole("heading", { name: "The missing exception" }) });
  await card.getByText("Chunking separated the rule from its exception").click();
  await expect(card.getByRole("button", { name: "Check answer" })).toBeDisabled();
  await card.getByRole("radio", { name: "Sure", exact: true }).check({ force: true });
  await card.getByRole("button", { name: "Check answer" }).click();
  await expect(card.getByText("Correct", { exact: true })).toBeVisible();
  await page.goto("/analytics");
  await expect(page.getByRole("meter", { name: "Mastery" })).toHaveAttribute("aria-valuenow", "100");
  await expect(page.getByRole("heading", { name: "Calibration" })).toBeVisible();
  await page.getByRole("button", { name: "Show data table" }).first().click();
  await expect(page.getByRole("table", { name: "Calibration by confidence level" })).toBeVisible();
});

test("topic practice requires confidence before the answer and feeds spaced review", async ({ page }) => {
  await page.goto("/learn/dsa/sliding-window");
  const card = page.locator("section[aria-labelledby='practice'] article").first();
  await expect(card.getByRole("button", { name: "Reveal answer" })).toBeDisabled();
  await card.getByRole("radio", { name: "Fairly sure" }).check({ force: true });
  await card.getByRole("button", { name: "Reveal answer" }).click();
  await expect(card.getByText("Model answer")).toBeVisible();
  await card.getByRole("button", { name: "Not yet" }).click();
  await expect(card.getByText("Recorded as not yet")).toBeVisible();
  await expect(page.getByText(/In spaced review, next due/)).toBeVisible();
});

test("day status and minutes are saved and shown on the roadmap", async ({ page }) => {
  await page.goto("/roadmap/w01-d02");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByRole("button", { name: "Done", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Minutes spent").fill("50");
  await page.getByRole("button", { name: "Save minutes" }).click();
  await page.goto("/roadmap");
  await expect(page.locator("#w01-d02 .tp-day")).toHaveAttribute("data-status", "done");
  await expect(page.getByText("1 of 7 days done")).toBeVisible();
});

test("settings switch theme, export progress and reject a bad import", async ({ page }) => {
  await page.goto("/settings");
  await page.getByRole("group", { name: "Theme" }).getByRole("button", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export progress (JSON)" }).click();
  expect((await download).suggestedFilename()).toMatch(/^techprep-os-progress-\d{4}-\d{2}-\d{2}\.json$/);

  await page.locator("input[type=file]").setInputFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from('{"version": 99}') });
  await expect(page.getByText("Import failed")).toBeVisible();

  await page.getByRole("button", { name: "Reset progress" }).click();
  await page.getByRole("button", { name: "Yes, erase everything" }).click();
  await expect(page.getByText("Progress erased")).toBeVisible();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");
});

test("mock interview loop saves a scored result", async ({ page }) => {
  await page.goto("/interviews");
  await page.locator("li", { has: page.getByRole("heading", { name: "30-minute mixed warm-up" }) }).getByRole("button", { name: "Start loop" }).click();
  for (let round = 0; round < 3; round++) {
    await page.getByText("Solid", { exact: true }).click();
    await page.getByRole("button", { name: round < 2 ? "Next round" : "Finish and save the loop" }).click();
  }
  await expect(page.getByRole("table")).toContainText("30-minute mixed warm-up");
  await expect(page.getByRole("table")).toContainText("Solid");
});

test("glossary search filters terms and prerequisite links jump to the term", async ({ page }) => {
  await page.goto("/glossary");
  await page.getByLabel("Search terms and definitions").fill("sliding");
  await expect(page.getByRole("status").filter({ hasText: /^1 of \d+ terms$/ })).toBeVisible();
  await page.getByRole("link", { name: "Big-O notation" }).click();
  await expect(page.locator("#big-o")).toBeFocused();
  await expect(page.getByLabel("Search terms and definitions")).toHaveValue("");
});
