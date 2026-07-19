import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';

const targetUrl = process.env.E2E_TARGET_URL;
if (!targetUrl) throw new Error('E2E_TARGET_URL is required.');

const baseUrl = new URL(targetUrl).origin;
const runStamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const agentName = `Atlas E2E ${runStamp}`;
const purpose = 'Conduct a complete production interface verification of persistent identity, immutable state, domain binding, professional development, lifecycle availability, ownership transfer, and successor continuation.';
const field = 'Production Continuity Verification';
const principles = 'Trace every lifecycle transition, preserve all prior versions, disclose uncertainty, isolate private owner data, verify authorization boundaries, and prove that transfer continues the same agent rather than creating a copy.';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
const page = await context.newPage();
page.setDefaultTimeout(60_000);
page.setDefaultNavigationTimeout(180_000);

const browserErrors = [];
page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));
page.on('console', (message) => {
  if (message.type() === 'error') browserErrors.push(`console: ${message.text()}`);
});

async function visibleAlert() {
  const alert = page.getByRole('alert');
  if (await alert.count()) {
    const first = alert.first();
    if (await first.isVisible().catch(() => false)) return (await first.textContent())?.trim();
  }
  return undefined;
}

async function waitForText(text, timeout = 180_000) {
  try {
    await page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout });
  } catch (error) {
    const alert = await visibleAlert();
    throw new Error(`${alert ? `Application alert: ${alert}. ` : ''}Expected text not found: ${text}. URL: ${page.url()}. ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function clickAndWait(buttonName, expectedText, timeout = 180_000) {
  await page.getByRole('button', { name: buttonName, exact: true }).click();
  await waitForText(expectedText, timeout);
  const alert = await visibleAlert();
  if (alert) throw new Error(`Application alert after ${buttonName}: ${alert}`);
}

let agentId;
let transferPath;

try {
  console.log('E2E_STAGE=Public Vercel access');
  const response = await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
  console.log(`E2E_PUBLIC_HTTP_STATUS=${response?.status() ?? 'unknown'}`);
  if (!response || response.status() >= 400) throw new Error(`Public production returned HTTP ${response?.status() ?? 'unknown'}.`);
  await page.waitForLoadState('networkidle').catch(() => undefined);

  console.log('E2E_STAGE=Owner A session');
  await page.goto(`${baseUrl}/demo`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Continue as Owner A', exact: true }).click();
  await page.waitForURL(/\/dashboard(?:\?|$)/);
  await waitForText('Owner A');

  console.log('E2E_STAGE=Create');
  await page.getByRole('link', { name: 'Create Agent', exact: true }).click();
  await page.getByLabel('Agent Name').fill(agentName);
  await page.getByLabel('Purpose').fill(purpose);
  await page.getByLabel('Field').fill(field);
  await page.getByLabel('Operating Principles').fill(principles);
  await page.getByRole('button', { name: 'Create persistent agent', exact: true }).click();
  await page.waitForURL(/\/agents\/AC-[A-Z2-9]{7}(?:\?|$)/, { timeout: 240_000 });
  agentId = page.url().match(/\/agents\/(AC-[A-Z2-9]{7})/)?.[1];
  if (!agentId) throw new Error(`Unable to extract Agent ID from ${page.url()}`);
  await waitForText('State version 1');
  console.log(`E2E_AGENT_ID=${agentId}`);

  console.log('E2E_STAGE=Bind Domain');
  await clickAndWait('Bind current domain', 'State version 2');
  await waitForText('Verified domain');

  console.log('E2E_STAGE=Develop');
  await page.getByRole('button', { name: 'Use Atlas development example', exact: true }).click();
  await clickAndWait('Develop Agent', 'State version 3', 300_000);
  await waitForText('DEVELOPMENT');

  console.log('E2E_STAGE=Park');
  await page.getByRole('button', { name: 'Use parking example', exact: true }).click();
  await clickAndWait('Park Agent', 'State version 4');
  await waitForText('PARKED');

  console.log('E2E_STAGE=Reactivate');
  await page.getByRole('button', { name: 'Use reactivation example', exact: true }).click();
  await clickAndWait('Reactivate Agent', 'State version 5');
  await waitForText('REACTIVATED');

  console.log('E2E_STAGE=Create Transfer offer');
  await page.getByRole('button', { name: 'Use transfer example', exact: true }).click();
  await page.getByRole('button', { name: 'Create transfer offer for Owner B', exact: true }).click();
  await page.waitForURL(/\/transfer\/[A-Za-z0-9_-]+(?:\?|$)/);
  transferPath = new URL(page.url()).pathname;
  await waitForText('Transfer acceptance');
  await waitForText('Intended owner');
  console.log('E2E_TRANSFER_OFFER_CREATED=true');

  console.log('E2E_STAGE=Switch to Owner B');
  await page.getByRole('link', { name: 'Select Owner B', exact: true }).click();
  await page.waitForURL(/\/demo\?returnTo=/);
  await page.getByRole('button', { name: 'Continue as Owner B', exact: true }).click();
  await page.waitForURL(new RegExp(`${transferPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\?|$)`));
  await waitForText('Owner B');

  console.log('E2E_STAGE=Accept Transfer');
  await page.getByRole('button', { name: `Accept ${agentName}`, exact: true }).click();
  await page.waitForURL(new RegExp(`/agents/${agentId}(?:\\?|$)`));
  await waitForText('State version 6');
  await waitForText('TRANSFERRED');
  await waitForText('Owner B');

  console.log('E2E_STAGE=Continue');
  await page.getByRole('button', { name: 'Use continuation example', exact: true }).click();
  await clickAndWait('Continue Agent', 'State version 7');
  await waitForText('CONTINUED');
  await waitForText('ACTIVE');

  console.log('E2E_STAGE=Public projection');
  await page.getByRole('link', { name: 'View public card', exact: true }).click();
  await page.waitForURL(new RegExp(`/public/agents/${agentId}(?:\\?|$)`));
  await waitForText('State version 7');
  await waitForText('Transferred · same Agent identity');
  await waitForText('Continued under successor ownership');
  await waitForText('Not disclosed');
  const body = await page.locator('body').innerText();
  if (body.includes('Owner A') || body.includes('Owner B') || body.includes('Private handoff summary')) {
    throw new Error('Public projection exposed owner or private handoff data.');
  }

  await page.screenshot({ path: 'e2e-final-public-card.png', fullPage: true });
  const result = {
    success: true,
    agentId,
    agentName,
    finalVersion: 7,
    finalStatus: 'ACTIVE',
    finalPublicUrl: `${baseUrl}/public/agents/${agentId}`,
    stages: ['CREATE', 'BIND_DOMAIN', 'DEVELOP', 'PARK', 'REACTIVATE', 'TRANSFER', 'CONTINUE'],
    browserErrors,
    completedAt: new Date().toISOString(),
  };
  await writeFile('e2e-result.json', `${JSON.stringify(result, null, 2)}\n`);
  console.log(`E2E_SUCCESS=${JSON.stringify(result)}`);
} catch (error) {
  await page.screenshot({ path: 'e2e-failure.png', fullPage: true }).catch(() => undefined);
  const failure = {
    success: false,
    agentId,
    agentName,
    url: page.url(),
    browserErrors,
    error: error instanceof Error ? error.stack : String(error),
    failedAt: new Date().toISOString(),
  };
  await writeFile('e2e-result.json', `${JSON.stringify(failure, null, 2)}\n`);
  console.error(`E2E_FAILURE=${JSON.stringify(failure)}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
