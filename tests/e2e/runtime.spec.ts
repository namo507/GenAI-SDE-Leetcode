import { expect, test } from "@playwright/test";
import { curriculum } from "@/content";

/**
 * Real execution in the browser. These download Pyodide and webR from their CDNs,
 * so they run only when RUNTIME_E2E=1 (CI sets it in a separate job).
 */
test.skip(!process.env.RUNTIME_E2E, "Set RUNTIME_E2E=1 to download the runtimes and run these.");
test.describe.configure({ timeout: 300_000 });

async function runAndWait(page: import("@playwright/test").Page, button: string) {
  const runner = page.locator(".tp-runner");
  await runner.getByRole("button", { name: button, exact: true }).click();
  const verdict = runner.locator(".tp-runner__verdict");
  await expect(verdict).toBeVisible({ timeout: 240_000 });
  return verdict;
}

for (const lang of ["Python", "R"] as const) {
  test(`${lang}: program output matches and its tests pass`, async ({ page }) => {
    await page.goto("/learn/foundations/python-r-idioms");
    const runner = page.locator(".tp-runner");
    await runner.getByRole("tab", { name: lang }).click();
    await page.waitForTimeout(400);
    await expect(await runAndWait(page, "Run")).toContainText("Output matches the expected output");
    await expect(await runAndWait(page, "Run tests")).toContainText("All tests passed");
    await expect(runner.locator(".tp-runner__status")).toContainText(lang === "Python" ? "Pyodide" : "webR");
  });
}

test("Python refuses packages outside the allowlist before running", async ({ page }) => {
  await page.goto("/learn/foundations/python-r-idioms");
  const editor = page.getByLabel(/Python code, editable/);
  await editor.fill("import requests\nprint('should not run')");
  const verdict = await runAndWait(page, "Run");
  await expect(verdict).toContainText("raised an error");
  await expect(page.locator(".tp-runner__out").first()).toContainText("Import not allowed here: requests");
  await expect(page.locator(".tp-runner__out").first()).not.toContainText("should not run");
});

test("an infinite loop is stopped by the time limit", async ({ page }) => {
  await page.goto("/learn/foundations/python-r-idioms");
  await page.getByLabel(/Python code, editable/).fill("while True:\n    pass");
  const verdict = await runAndWait(page, "Run");
  await expect(verdict).toContainText("time limit");
});

test("a SQL drill runs in SQLite and is graded", async ({ page }) => {
  await page.goto("/practice#sql");
  const card = page.locator("article", { has: page.getByRole("heading", { name: "Customers who never ordered" }) });
  await card.getByLabel("Your query", { exact: true }).fill("SELECT c.name FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id) ORDER BY c.name");
  await card.getByRole("radio", { name: "Certain" }).check({ force: true });
  await card.getByRole("button", { name: "Check answer" }).click();
  await expect(card.getByText("The single row matches, in order.")).toBeVisible({ timeout: 240_000 });
});

test("a lesson that uses sqlite3 runs in Python", async ({ page }) => {
  await page.goto("/learn/sql/joins-and-keys");
  await page.locator(".tp-runner").getByRole("tab", { name: "Python" }).click();
  await page.waitForTimeout(400);
  await expect(await runAndWait(page, "Run")).toContainText("Output matches the expected output");
});

test("an allowlisted third-party package is loaded on demand", async ({ page }) => {
  await page.goto("/learn/foundations/python-r-idioms");
  await page.getByLabel(/Python code, editable/).fill("import numpy as np\nprint(int(np.arange(4).sum()))");
  await runAndWait(page, "Run");
  await expect(page.locator(".tp-runner__out").first()).toHaveText("6");
});

/** Every paired lesson, both languages, in the browser runtimes (RUNTIME_E2E=all; several minutes). */
test.describe("all paired lessons", () => {
  test.skip(process.env.RUNTIME_E2E !== "all", "Set RUNTIME_E2E=all to run every lesson in both runtimes.");
  for (const t of curriculum.topics.filter((x) => x.implementation)) {
    test(`${t.id} matches in Python and R`, async ({ page }) => {
      await page.goto(`/learn/${t.domain}/${t.slug}`);
      for (const lang of ["Python", "R"] as const) {
        await page.locator(".tp-runner").getByRole("tab", { name: lang }).click();
        await page.waitForTimeout(400);
        await expect(await runAndWait(page, "Run"), `${t.id} ${lang}`).toContainText("Output matches the expected output");
        await expect(await runAndWait(page, "Run tests"), `${t.id} ${lang} tests`).toContainText("All tests passed");
      }
    });
  }
});
