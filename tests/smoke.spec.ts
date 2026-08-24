import { test, expect } from "@playwright/test";

test("homepage loads successfully", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/NexaGrowth|Lovable/i);
  await expect(page.locator("body")).toContainText(/NexaGrowth|Growth|Digital/i);
});
