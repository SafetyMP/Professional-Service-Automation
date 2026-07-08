import { expect, test } from "@playwright/test";

test.describe("smoke", () => {
  test("login redirects to dashboard with KPIs", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#orgSlug", "demo-firm");
    await page.fill("#email", "admin@demo.com");
    await page.fill("#password", "password123");
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("Active Projects")).toBeVisible();
  });

  test("invoices page loads for authenticated user", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#orgSlug", "demo-firm");
    await page.fill("#email", "admin@demo.com");
    await page.fill("#password", "password123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto("/invoices");
    await expect(page.getByRole("heading", { name: "Invoices" })).toBeVisible();
  });
});
