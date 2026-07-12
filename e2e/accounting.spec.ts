import { test, expect } from "@playwright/test";

test("admin accounting settings loads", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="email"]', "admin@demo.com");
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard");
  await page.goto("/settings/accounting");
  await expect(page.getByRole("heading", { name: "Accounting Settings" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Chart of Accounts" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Xero Integration" })).toBeVisible();
});

test("manager accounting settings loads", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="email"]', "manager@demo.com");
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard");
  await page.goto("/settings/accounting");
  await expect(page.getByRole("heading", { name: "Accounting Settings" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Chart of Accounts" })).toBeVisible();
});

test("milestone project page loads", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="email"]', "admin@demo.com");
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard");
  await page.goto("/projects");
  await page.getByRole("link", { name: "Mobile App Build" }).click();
  await expect(page.getByRole("heading", { name: "Mobile App Build" })).toBeVisible();
  await expect(page.getByText("Milestones")).toBeVisible();
});
