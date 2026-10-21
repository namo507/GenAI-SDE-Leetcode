import { expect, test } from "@playwright/test";
import { ROUTES } from "./routes";

for (const width of [375, 768, 1280, 2560]) {
  test(`no horizontal scrolling at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ROUTES) {
      await page.goto(route);
      await page.waitForTimeout(250);
      const [scroll, client] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      expect(scroll, `${route} overflows at ${width}px`).toBeLessThanOrEqual(client);
    }
  });
}

test("navigation is a sidebar on desktop and a menu button on phones", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/roadmap");
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open navigation" })).toBeHidden();
  await page.setViewportSize({ width: 375, height: 800 });
  await expect(page.getByRole("button", { name: "Open navigation" })).toBeVisible();
});
