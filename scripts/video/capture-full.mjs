import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const baseUrl = process.env.BASE_URL || 'https://aisentica-continuity.vercel.app';
const outputDir = 'video-output/full-shots';

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
  await page.waitForTimeout(1000);
}

async function shot(name) {
  await page.screenshot({
    path: `${outputDir}/${name}.png`,
    fullPage: false,
    animations: 'disabled',
  });
}

async function scrollToLocator(locator, offset = -150) {
  await locator.scrollIntoViewIfNeeded();
  await page.evaluate((amount) => window.scrollBy(0, amount), offset);
  await page.waitForTimeout(600);
}

try {
  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await settle();
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot('01-home');

  const quote = page.locator('.manifest-quote').first();
  await scrollToLocator(quote, -190);
  await shot('02-continuity-quote');

  const lifecycleHeading = page.getByRole('heading', { name: /create to continue/i });
  await scrollToLocator(lifecycleHeading, -150);
  await shot('03-home-lifecycle');

  await page.goto(`${baseUrl}/demo`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await settle();
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot('04-demo-access');

  await Promise.all([
    page.waitForURL(/\/dashboard(?:\?|$)/, { timeout: 60_000 }),
    page.getByRole('button', { name: /continue as owner b/i }).click(),
  ]);
  await settle();
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot('05-owner-b');

  const atlasLink = page.locator('a.agent-card').filter({ hasText: 'Atlas' }).first();
  await atlasLink.waitFor({ state: 'visible', timeout: 30_000 });
  await Promise.all([
    page.waitForURL(/\/agents\//, { timeout: 60_000 }),
    atlasLink.click(),
  ]);
  await settle();
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot('06-atlas-hero');

  const publicIdentity = page.getByRole('heading', { name: /public identity/i });
  await scrollToLocator(publicIdentity, -150);
  await shot('07-public-identity');

  const manifest = page.getByRole('heading', { name: /agent manifest/i });
  await scrollToLocator(manifest, -150);
  await shot('08-agent-manifest');

  const principles = page.getByRole('heading', { name: /operating principles/i });
  await scrollToLocator(principles, -250);
  await shot('09-manifest-details');

  const development = page.getByRole('heading', { name: /development record/i });
  await scrollToLocator(development, -150);
  await shot('10-development-record');

  const validated = page.getByRole('heading', { name: /validated knowledge/i });
  await scrollToLocator(validated, -260);
  await shot('11-development-details');

  const timeline = page.getByRole('heading', { name: /state timeline/i });
  await scrollToLocator(timeline, -150);
  await shot('12-state-timeline');

  const versions = page.getByRole('heading', { name: /version history/i });
  await scrollToLocator(versions, -150);
  await shot('13-version-history-top');

  const versionFive = page.locator('summary').filter({ hasText: /Version 05/i }).first();
  await scrollToLocator(versionFive, -260);
  await shot('14-version-history-lower');

  const canonicalLifecycle = page.getByRole('heading', { name: /canonical lifecycle/i });
  await scrollToLocator(canonicalLifecycle, -150);
  await shot('15-atlas-lifecycle');

  const publicCard = page.getByRole('link', { name: /view public card/i });
  await publicCard.click();
  await settle();
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot('16-public-card');

  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await settle();
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot('17-final-home');

  console.log(`Captured full video scenes from ${baseUrl}`);
} finally {
  await browser.close();
}
