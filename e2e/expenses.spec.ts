import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.fill("#orgSlug", "demo-firm");
  await page.fill("#email", email);
  await page.fill("#password", "password123");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/dashboard/);
}

test.describe("expenses v2 smoke", () => {
  test("manager sees categories and pending approval", async ({ page }) => {
    await login(page, "manager@demo.com");
    await page.goto("/expenses");

    await expect(page.getByRole("heading", { name: "Expenses", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Expense Categories" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Travel (TRAVEL)" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pending Expense Approvals" })).toBeVisible();
    await expect(page.getByText("Team lunch during onsite discovery")).toBeVisible();
    await expect(page.getByRole("button", { name: /Approve All/ })).toBeVisible();
  });

  test("consultant can open submit expense form with category and receipt", async ({ page }) => {
    await login(page, "consultant1@demo.com");
    await page.goto("/expenses");

    await expect(page.getByRole("heading", { name: "Submit Expense" })).toBeVisible();
    await expect(page.getByLabel("Category")).toBeVisible();
    await expect(page.getByLabel(/Receipt/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Expense" })).toBeVisible();
  });
});
