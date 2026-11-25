import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { labs } from "@/lib/labs";
import { defaultParameters } from "@/lib/labs/types";
import { ROLE_LABELS, ROLES } from "@/lib/curriculum";

for (const scheme of ["light", "dark"] as const) {
  test.describe(`working experiments in ${scheme}`, () => {
    test.use({ colorScheme: scheme });
    for (const lab of labs) {
      test(`${lab.id}: controls, evidence, comparison and accessibility`, async ({ page }) => {
        await page.goto(`/labs/${lab.id}`);
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(lab.title);
        await expect(page.getByRole("heading", { level: 1 })).toHaveCSS("font-size", "26px");
        await expect(page.locator(".tp-card").first()).toHaveCSS("border-radius", "12px");
        await expect(page.getByRole("heading", { name: "Calculated outcome" })).toBeHidden();
        await page.getByRole("button", { name: "Explore without recording a prediction" }).click();
        const result = lab.evaluate(defaultParameters(lab));
        await expect(page.getByRole("table", { name: result.table.caption, exact: true })).toBeVisible();
        await page.getByRole("button", { name: "Pin current baseline" }).click();
        const control = lab.controls[0]!;
        const field = page.getByLabel(control.label, { exact: true });
        if (control.options) await field.selectOption(String(control.options.at(-1)!.value));
        else { await field.focus(); await page.keyboard.press("End"); }
        await expect(page.getByRole("table", { name: "Pinned baseline compared with current inputs" })).toBeVisible();
        await page.getByRole("button", { name: "Next explanation step" }).click();
        await expect(page.getByText(/Step 2 of/, { exact: false })).toBeVisible();
        await page.getByRole("group", { name: "Experiment explanation depth" }).getByRole("button", { name: "Senior" }).click();
        await expect(page.getByRole("heading", { name: "Assumptions", exact: true })).toBeVisible();
        const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
        expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
        for (const width of [375, 768, 1280, 2560]) {
          await page.setViewportSize({ width, height: 900 });
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
          expect(overflow, `${lab.id} overflows at ${width}px in ${scheme}`).toBe(0);
        }
      });
    }
  });
}

test("prediction requires confidence, records once and can restart with hidden results", async ({ page }) => {
  await page.goto("/labs/gradient-descent");
  const card = page.locator("article.tp-card").filter({ has: page.getByRole("heading", { name: "Predict before you experiment" }) });
  await card.getByRole("radio", { name: "Closer to the minimum", exact: true }).check();
  await expect(card.getByRole("button", { name: "Check prediction" })).toBeDisabled();
  await card.getByRole("radio", { name: "Fairly sure", exact: true }).check({ force: true });
  await card.getByRole("button", { name: "Check prediction" }).click();
  await expect(card.getByText("Prediction matched", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Calculated outcome" })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("techprep-os:progress:v1")!).attempts.length)).toBe(1);
  await page.getByRole("button", { name: "Hide results and predict again" }).click();
  await expect(card.getByRole("button", { name: "Check prediction" })).toBeDisabled();
  await expect(page.getByRole("heading", { name: "Calculated outcome" })).toBeHidden();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("techprep-os:progress:v1")!).attempts.length)).toBe(1);
});

test("saved experiments restore parameters, comparison and notes without inventing mastery", async ({ page }) => {
  await page.goto("/labs/gradient-descent");
  await page.getByRole("button", { name: /Overshoot and still converge/ }).click();
  await page.getByRole("button", { name: "Explore without recording a prediction" }).click();
  await page.getByRole("button", { name: "Pin current baseline" }).click();
  await page.getByLabel("Learning rate", { exact: true }).focus();
  await page.keyboard.press("End");
  await page.getByLabel("What changed your mind, and where would this model stop working?").fill("Crossing the optimum can converge when each crossing is smaller.");
  await page.getByRole("button", { name: "Save experiment" }).click();
  await page.reload();
  await expect(page.getByLabel("Learning rate", { exact: true })).toHaveValue("1.5");
  await expect(page.getByLabel("What changed your mind, and where would this model stop working?")).toHaveValue(/Crossing the optimum/);
  await page.getByRole("button", { name: "Explore without recording a prediction" }).click();
  await expect(page.getByRole("table", { name: "Pinned baseline compared with current inputs" })).toBeVisible();
  await expect(page.getByText(/Pinned inputs:.*Learning rate 0.75/)).toBeVisible();
  const progress = await page.evaluate(() => JSON.parse(localStorage.getItem("techprep-os:progress:v1")!));
  expect(progress.attempts).toHaveLength(0);
  expect(progress.labNotes["gradient-descent"].baseline.rate).toBe(0.75);
  await page.evaluate(() => {
    const key = "techprep-os:progress:v1";
    const saved = JSON.parse(localStorage.getItem(key)!);
    saved.labNotes["gradient-descent"].baseline = { start: -999, rate: 999, steps: 999 };
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload();
  await page.getByRole("button", { name: "Explore without recording a prediction" }).click();
  await expect(page.getByText(/Pinned inputs:/)).toContainText("Starting parameter -6");
  await expect(page.getByText(/Pinned inputs:/)).toContainText("Learning rate 1.5");
  await expect(page.getByText(/Pinned inputs:/)).not.toContainText("999");
});

test("role paths filter experiments and deep-link to the intended capstone", async ({ page }) => {
  await page.goto("/labs");
  for (const role of ROLES) {
    await page.getByLabel("Prepare for a role").selectOption(role);
    await expect(page.getByRole("heading", { name: ROLE_LABELS[role], exact: true })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "experiments" })).toContainText(`${labs.filter((lab) => lab.roles.includes(role)).length} of ${labs.length} experiments`);
  }
  await page.getByLabel("Prepare for a role").selectOption("data-analyst");
  await expect(page.getByRole("status").filter({ hasText: "experiments" })).toContainText(`${labs.filter((lab) => lab.roles.includes("data-analyst")).length} of 12 experiments`);
  await expect(page.getByRole("heading", { name: "Data analyst", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Software engineer", exact: true })).toBeHidden();
  await page.getByRole("link", { name: "Build a role capstone" }).click();
  await expect(page.locator("#da-kpi-dashboard")).toBeVisible();
});

test("explain-back notes survive reload and progress export/import", async ({ page }) => {
  await page.goto("/learn/foundations/linear-algebra-geometry#teach-back");
  await page.getByLabel("Explain it to a curious child", { exact: true }).fill("A vector is an ordered list of steps, like three squares right and four up.");
  await page.getByLabel("Name the assumption", { exact: true }).fill("The coordinates keep the same order and units.");
  await page.getByLabel("Find where it breaks", { exact: true }).fill("A zero arrow has no direction, so cosine is undefined.");
  await page.getByRole("button", { name: "Save explanation", exact: true }).click();
  await page.reload();
  await expect(page.getByLabel("Explain it to a curious child", { exact: true })).toHaveValue(/ordered list/);
  await page.goto("/settings");
  const before = await page.evaluate(() => localStorage.getItem("techprep-os:progress:v1")!);
  await page.locator("input[type=file]").setInputFiles({ name: "roundtrip.json", mimeType: "application/json", buffer: Buffer.from(before) });
  await expect(page.getByText("Import complete", { exact: true })).toBeVisible();
  await page.goto("/learn/foundations/linear-algebra-geometry#teach-back");
  await expect(page.getByLabel("Find where it breaks", { exact: true })).toHaveValue(/zero arrow/);
});
