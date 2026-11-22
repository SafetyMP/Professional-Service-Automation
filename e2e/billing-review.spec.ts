import { expect, test } from "@playwright/test";

test("re-cut a pro forma, issue authorized work, then reconcile the extension", async ({ page }) => {
  await page.goto("/case");
  const balance = (name: string) => page.getByText(name, { exact: true }).locator("..").locator("dd");
  await expect(page.getByRole("heading", { name: "The July prebill" })).toBeVisible();
  await expect(balance("Opening approved work")).toHaveText("$6,320");
  await expect(page.getByRole("heading", { name: /simulated reply/ })).toHaveCount(0);
  await page.getByText("WO-17 · Signed work order").click();
  await expect(page.getByText(/Northline authorizes restart engineering/)).toBeVisible();
  await page.getByText("CR-02 · Extension correspondence").click();
  await expect(page.getByText(/purchasing signature is blank/)).toBeVisible();
  await page.getByText("Commissioning support", { exact: true }).click();
  await expect(page.getByText(/8 hours on the commissioning shift/)).toBeVisible();

  await page.getByRole("button", { name: "Prepare pro forma" }).click();
  await expect(balance("Of which on an open draft")).toHaveText("$6,320");
  await expect(balance("Unbilled work remaining")).toHaveText("$6,320");
  await expect(page.getByText("T-294 · Shift handover")).toHaveCount(0);
  await page.getByRole("button", { name: "Void pro forma" }).click();
  await expect(balance("Of which on an open draft")).toHaveText("$0");
  await page.getByLabel("Include work through").selectOption("2026-07-24");
  await page.getByRole("button", { name: "Prepare pro forma" }).click();
  await expect(balance("Of which on an open draft")).toHaveText("$5,000");
  await page.getByRole("button", { name: "Issue invoice" }).click();
  await expect(balance("Issued this close")).toHaveText("$5,000");
  await expect(balance("Unbilled work remaining")).toHaveText("$1,320");
  await expect(page.getByText(/placed \$5,000 in its payment queue/)).toBeVisible();
  await page.getByRole("link", { name: "Technical reference" }).click();
  await expect(page.getByRole("heading", { name: "Realization kernel" })).toBeVisible();
  await page.getByRole("link", { name: "July prebill" }).click();
  await expect(balance("Issued this close")).toHaveText("$5,000");
  await expect(balance("Unbilled work remaining")).toHaveText("$1,320");
  await expect(page.getByLabel("Include work through")).toHaveValue("2026-07-24");
  await expect(page.getByText("PB-002", { exact: true }).locator("..")).toContainText("Issued");
  await expect(page.getByRole("button", { name: "Prepare pro forma" })).toBeDisabled();

  await page.getByLabel("Include work through").selectOption("2026-07-31");
  await page.getByRole("button", { name: "Prepare pro forma" }).click();
  await expect(balance("Of which on an open draft")).toHaveText("$1,320");
  await page.getByRole("button", { name: "Issue invoice" }).click();
  await expect(balance("Unbilled work remaining")).toHaveText("$0");
  await expect(page.getByText(/signed extension before clearing \$1,320/)).toBeVisible();
  await expect(page.getByText("Cash received in this case · $0")).toBeVisible();
  await page.getByRole("button", { name: "Restart July close" }).click();
  await expect(balance("Unbilled work remaining")).toHaveText("$6,320");
  await expect(page.getByRole("heading", { name: "Billing register" })).toHaveCount(0);
});

test("an accountant can review the oldest work and compact reference on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/case");
  await page.getByLabel("Include work through").selectOption("2026-06-30");
  await page.getByRole("button", { name: "Prepare pro forma" }).click();
  await expect(page.getByText("Pro forma subtotal").locator("..")).toContainText("$1,980");
  await page.getByRole("button", { name: "Issue invoice" }).click();
  await expect(page.getByText("31+ days").locator("..")).toContainText("$0");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("link", { name: "Technical reference" }).click();
  await expect(page.getByRole("heading", { name: "Realization kernel" })).toBeVisible();
  await expect(page.locator("main dt")).toHaveCount(4);
  await expect(page.getByRole("link", { name: "Realization functions" })).toHaveAttribute("href", /lib\/billing\/realization.ts$/);
  await page.getByRole("link", { name: "July prebill" }).click();
  await expect(page.getByRole("heading", { name: "The July prebill" })).toBeVisible();
});
