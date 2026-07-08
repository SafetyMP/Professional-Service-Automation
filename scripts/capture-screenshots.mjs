/**
 * Capture README screenshots from a running dev server.
 * Usage: npm run dev -- -p 3005  (in another terminal)
 *        node scripts/capture-screenshots.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "docs", "images");
const baseUrl = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3005";

const pages = [
  { path: "/dashboard", file: "dashboard.png", name: "Dashboard" },
  { path: "/invoices", file: "invoices.png", name: "Invoices" },
  { path: "/reports/profitability", file: "profitability.png", name: "Profitability" },
];

async function main() {
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await page.fill("#orgSlug", "demo-firm");
  await page.fill("#email", "admin@demo.com");
  await page.fill("#password", "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });

  for (const { path: route, file, name } of pages) {
    await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    const dest = path.join(outDir, file);
    await page.screenshot({ path: dest, fullPage: false });
    console.log(`Captured ${name} -> docs/images/${file}`);
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
