import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const baseUrl = process.env.BASE_URL || 'https://aisentica-continuity.vercel.app';
const outputDir = 'video-output/shots';

await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  colorScheme: 'light',
  locale: 'en-US',
});

const page = await context.newPage();

async function settle() {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  });
  await page.waitForTimeout(1200);
}

async function shot(name) {
  await page.screenshot({
    path: `${outputDir}/${name}.png`,
    fullPage: false,
    animations: 'disabled',
  });
}

try {
  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await settle();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await shot('01-home');

  const lifecycleHeading = page.getByRole('heading', { name: /create to continue/i });
  await lifecycleHeading.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, -170));
  await page.waitForTimeout(500);
  await shot('02-lifecycle');

  await page.goto(`${baseUrl}/demo`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await settle();
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot('03-demo-access');

  await Promise.all([
    page.waitForURL(/\/dashboard(?:\?|$)/, { timeout: 60_000 }),
    page.getByRole('button', { name: /continue as owner b/i }).click(),
  ]);
  await settle();
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot('04-owner-b');

  const atlasLink = page.locator('a.agent-card').filter({ hasText: 'Atlas' }).first();
  await atlasLink.waitFor({ state: 'visible', timeout: 30_000 });
  await Promise.all([
    page.waitForURL(/\/agents\//, { timeout: 60_000 }),
    atlasLink.click(),
  ]);
  await settle();
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot('05-atlas');

  console.log(`Captured preview scenes from ${baseUrl}`);
} finally {
  await browser.close();
}
