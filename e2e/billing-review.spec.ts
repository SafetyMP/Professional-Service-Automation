import { expect, test, type Locator, type Page } from "@playwright/test";

const pilotTitle = "Would a billing pilot pay for the review time?";
const availableAmount = (page: Page) => page.getByLabel("Available for a new draft", { exact: true });

// Follow the real tab order. A control reachable only by clicking or scripted focus fails here.
async function tabTo(page: Page, target: Locator) {
  for (let i = 0; i < 40; i++) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }
  await expect(target).toBeFocused();
}

async function keyboardActivate(page: Page, target: Locator) {
  await tabTo(page, target);
  await page.keyboard.press("Enter");
}

for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
  test.describe(`case and guide at ${viewport.width}px`, () => {
    const mobile = viewport.width === 390;
    test.use({ viewport, isMobile: mobile, hasTouch: mobile });

    test("reader inspects a Friday file, compares alternatives and traces the decision by keyboard", async ({ page }) => {
      await page.goto("/case");
      const acceptance = page.getByLabel("Client acceptance record");
      const guide = page.getByRole("link", { name: "Technical guide", exact: true });
      const guidance = page.locator("details").filter({ has: page.locator("summary", { hasText: "How to read these records" }) });
      await expect(acceptance).toHaveValue("40");
      await expect(availableAmount(page)).toHaveCount(0);
      await expect(guidance).not.toHaveAttribute("open", "");
      await keyboardActivate(page, guidance.locator("summary"));
      await expect(guidance).toHaveAttribute("open", "");
      await keyboardActivate(page, page.locator("summary", { hasText: "Signed client order" }));
      await expect(page.getByText("PO-481", { exact: true })).toBeVisible();
      await keyboardActivate(page, page.locator("summary", { hasText: "Design acceptance" }));
      await expect(page.getByText("40% of the whole engagement")).toBeVisible();
      await keyboardActivate(page, page.locator("summary", { hasText: "Invoice register" }));
      await expect(page.getByText("Client reference PO-418")).toBeVisible();
      await expect(availableAmount(page)).toHaveCount(0);

      const hold = page.getByRole("button", { name: "Hold for review", exact: true });
      const issue = page.getByRole("button", { name: "Issue draft", exact: true });
      const cancel = page.getByRole("button", { name: "Void draft", exact: true });
      await keyboardActivate(page, hold);
      await expect(availableAmount(page)).toHaveText("$0");
      const comparison = page.getByRole("figure", { name: "Where the accepted fee sits" });
      await expect(comparison).toContainText("Before the decision");
      await expect(comparison).toContainText("Your choice · Hold for review");
      const delivery = page.getByRole("heading", { name: "Delivery team", exact: true });
      const client = page.getByRole("heading", { name: "Client accounts payable", exact: true });
      await expect(delivery).toBeVisible();
      await expect(client).toBeVisible();
      await expect(page.getByText(/keeps D-042 open/)).toBeVisible();
      await expect(page.getByText(/no new bill for payables/)).toBeVisible();

      await keyboardActivate(page, issue);
      await expect(availableAmount(page)).toHaveText("$0");
      await expect(comparison).toContainText("Previous choice · Hold for review");
      await expect(comparison).toContainText("Your choice · Issue draft");
      await expect(page.getByText(/records D-042 as issued/)).toBeVisible();
      await expect(page.getByText(/payables clerk sees PO-418/)).toBeVisible();
      await keyboardActivate(page, cancel);
      await expect(availableAmount(page)).toHaveText("$6,000");
      await expect(comparison).toContainText("Previous choice · Issue draft");
      await expect(comparison).toContainText("Your choice · Void draft");
      await expect(comparison.locator("dd")).toHaveText(["$24,000", "$0", "$0", "$18,000", "$0", "$6,000"]);
      await expect(page.getByText(/removes D-042 from the active register/)).toBeVisible();
      await expect(page.getByText(/client must wait for finance/)).toBeVisible();
      await expect(acceptance).toHaveValue("40");
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);

      await keyboardActivate(page, guide);
      await expect(page.getByRole("heading", { name: "Trace the billing decision" })).toBeVisible();
      const steps = page.getByRole("group", { name: "Trace steps" });
      await expect(steps.getByRole("button", { name: "Read the records" })).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByRole("link", { name: "Project and invoice lookup" })).toHaveAttribute("href", /lib\/billing\/service\.ts#L\d+/);
      await keyboardActivate(page, steps.getByRole("button", { name: "Count commitments" }));
      await expect(page.getByRole("heading", { name: "How much has the project committed?" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Progress billing formula" })).toHaveAttribute("href", /lib\/billing\/contract-billing\.ts#L\d+/);
      await keyboardActivate(page, steps.getByRole("button", { name: "Apply the decision" }));
      await expect(page.getByRole("heading", { name: "What the decision writes" })).toBeVisible();
      await expect(availableAmount(page)).toHaveText("$6,000");
      await expect(page.getByRole("link", { name: "Void transaction and invoice numbering" })).toHaveAttribute("href", /lib\/billing\/service\.ts#L\d+/);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
      await keyboardActivate(page, page.getByRole("link", { name: "Back to the billing case" }));
      await expect(cancel).toHaveAttribute("aria-pressed", "true");
      await expect(comparison).toContainText("Previous choice · Issue draft");
      await expect(acceptance).toHaveValue("40");
      await expect(availableAmount(page)).toHaveText("$6,000");
    });
  });
}

test("published fragments and direct guide links keep the date, treatment, pilot and recorded trial", async ({ page }) => {
  await page.goto("/case#docket");
  await expect(page.locator(":target").getByRole("heading", { name: "The project file" })).toBeInViewport();
  await page.goto("/case#prebill");
  await expect(page.locator(":target").getByRole("button", { name: "Hold for review" })).toBeInViewport();
  await page.goto("/case/technical?progress=50&treatment=hold&reviews=12&minutes=20&choice=register&trial=voided#selected");
  const compare = page.locator("summary", { hasText: "Compare recorded runs" });
  await compare.click();
  const row = page.getByRole("row").filter({ has: page.getByRole("rowheader", { name: "Available for a new draft" }) });
  await expect(row.getByRole("cell")).toHaveText(["$6,000", "$12,000"]);
  await page.getByRole("button", { name: "Trial A · Issue" }).click();
  await expect(row.getByRole("cell")).toHaveText(["$6,000", "$6,000"]);
  await page.reload();
  await compare.click();
  await expect(page.getByRole("button", { name: "Trial A · Issue" })).toHaveAttribute("aria-pressed", "true");
  await expect(row.getByRole("cell")).toHaveText(["$6,000", "$6,000"]);
  await page.getByRole("link", { name: "Back to the billing case" }).click();
  const acceptance = page.getByLabel("Client acceptance record");
  await expect(acceptance).toHaveValue("50");
  await expect(page.getByRole("button", { name: "Hold for review" })).toHaveAttribute("aria-pressed", "true");
  await expect(availableAmount(page)).toHaveText("$6,000");
  await page.locator("summary", { hasText: pilotTitle }).click();
  await expect(page.getByRole("button", { name: "Add a draft register" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("slider", { name: /Monthly reviews/ })).toHaveValue("12");
  await expect(page.getByRole("slider", { name: /Minutes saved/ })).toHaveValue("20");
  await page.getByRole("link", { name: "Technical guide", exact: true }).click();
  await page.locator("summary", { hasText: "Change evidence date" }).click();
  await page.getByLabel("Evidence available through").selectOption("2026-07-24");
  await page.getByRole("link", { name: "Back to the billing case" }).click();
  await expect(acceptance).toHaveValue("40");
  await expect(availableAmount(page)).toHaveCount(0);
});

test("a new case cutoff reopens the draft and the two-close pilot remains independently explorable", async ({ page }) => {
  await page.goto("/case?treatment=issue");
  await page.getByLabel("Client acceptance record").selectOption("50");
  await expect(availableAmount(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Void draft", exact: true }).click();
  await expect(availableAmount(page)).toHaveText("$12,000");
  await page.getByRole("button", { name: "Back to the open draft" }).click();
  await expect(availableAmount(page)).toHaveCount(0);
  await expect(page.getByLabel("Client acceptance record")).toHaveValue("50");
  await page.locator("summary", { hasText: pilotTitle }).click();
  const net = page.getByLabel("First-year net capacity value");
  await expect(net).toHaveText("$600");
  await page.getByRole("slider", { name: /Minutes saved/ }).press("Home");
  await expect(net).toHaveText("-$2,400");
  await page.getByRole("button", { name: "Run a shadow pilot" }).click();
  await page.getByRole("link", { name: "Technical guide", exact: true }).click();
  await expect(availableAmount(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Trial B · Void" })).toHaveCount(0);
  await page.getByRole("link", { name: "Back to the billing case" }).click();
  await page.locator("summary", { hasText: pilotTitle }).click();
  await expect(net).toHaveText("-$2,400");
  await expect(page.getByRole("button", { name: "Run a shadow pilot" })).toHaveAttribute("aria-pressed", "true");
});
