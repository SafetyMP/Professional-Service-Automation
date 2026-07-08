/**
 * Capture README screenshots and demo GIF from a running dev server.
 * Usage: npm run dev -- -p 3005  (in another terminal)
 *        npm run screenshots
 *
 * CI: set CI=1 to use bundled Chromium instead of system Chrome.
 */
import { chromium } from "playwright";
import gifenc from "gifenc";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const { GIFEncoder, quantize, applyPalette } = gifenc;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "docs", "images");
const baseUrl = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3005";

const pages = [
  { path: "/dashboard", file: "dashboard.png", name: "Dashboard" },
  { path: "/invoices", file: "invoices.png", name: "Invoices" },
  { path: "/reports/profitability", file: "profitability.png", name: "Profitability" },
];

/** Frame duration in milliseconds (gifenc stores delay/10 as GIF centiseconds). */
const GIF_FRAME_DELAY_MS = 10_000;

function launchOptions() {
  if (process.env.CI) {
    return { headless: true };
  }
  return { channel: "chrome", headless: true };
}

async function writeDemoGif(frames) {
  const encoder = GIFEncoder();
  for (const { buffer, name } of frames) {
    const { data, width, height } = PNG.sync.read(buffer);
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    encoder.writeFrame(index, width, height, { palette, delay: GIF_FRAME_DELAY_MS });
    console.log(`GIF frame: ${name}`);
  }
  encoder.finish();
  const gifPath = path.join(outDir, "demo.gif");
  await writeFile(gifPath, Buffer.from(encoder.bytes()));
  console.log(`Captured demo GIF -> docs/images/demo.gif`);
}

async function main() {
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch(launchOptions());
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

  const gifFrames = [];

  for (const { path: route, file, name } of pages) {
    await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    const buffer = await page.screenshot({ fullPage: false });
    const dest = path.join(outDir, file);
    await writeFile(dest, buffer);
    gifFrames.push({ buffer, name });
    console.log(`Captured ${name} -> docs/images/${file}`);
  }

  await writeDemoGif(gifFrames);
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
