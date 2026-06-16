import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const baseUrl = process.env.VERIFY_APP_URL ?? "http://127.0.0.1:3000";
const executablePath = process.env.CHROME_EXECUTABLE_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const screenshotDir = "tmp/verification";

await mkdir(screenshotDir, { recursive: true });

async function signIn(page, email, password, expectedPath) {
  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button:has-text("Sign in")');
  await page.waitForURL(`**${expectedPath}`, { timeout: 30000 });
  await page.waitForLoadState("networkidle");
}

const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
await page.screenshot({ path: `${screenshotDir}/public-homepage-desktop.png`, fullPage: true });

await signIn(page, "client@gclbank.local", "ClientPassphrase!2026", "/dashboard");
await page.screenshot({ path: `${screenshotDir}/user-dashboard-desktop.png`, fullPage: true });

await page.goto(`${baseUrl}/retirement`, { waitUntil: "networkidle" });
await page.screenshot({ path: `${screenshotDir}/retirement-account.png`, fullPage: true });

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle" });
await page.screenshot({ path: `${screenshotDir}/user-dashboard-mobile.png`, fullPage: true });

await signIn(page, "admin@gclbank.local", "AdminPassphrase!2026", "/admin");
await page.setViewportSize({ width: 1440, height: 1100 });
await page.waitForLoadState("networkidle");
await page.screenshot({ path: `${screenshotDir}/admin-command-center.png`, fullPage: true });

await browser.close();

console.log("UI screenshots captured in tmp/verification.");
