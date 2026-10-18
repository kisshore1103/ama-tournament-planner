import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { formatTime } from '../../lib/schedule/core';
test.setTimeout(90000);
async function setup(page: Page) {
  await page.goto('/');
  await page
    .getByLabel('SportData tournament URL')
    .fill('https://sportdata.org/karate/set-online/event.php?vernr=90001');
  await page.getByLabel('Tournament name', { exact: true }).fill('Shared Fixture Cup');
  await page.getByRole('button', { name: 'Save tournament' }).click();
  await page.getByRole('button', { name: 'Import / Export', exact: true }).click();
  await page
    .getByLabel('Import text', { exact: true })
    .fill(
      'studentName,categoryName,categoryId,pool,tatami,eventDate,startTime,endTime,drawUrl\nAsha Rao,U12 Kata,11,2,7,2026-10-18,09:15,09:45,https://sportdata.org/karate/set-online/draw.php?vernr=90001&catid=11\nDev Singh,U14 Kumite,12,1,3,2026-10-19,10:15,10:45,https://sportdata.org/karate/set-online/draw.php?vernr=90001&catid=12',
    );
  await page.getByRole('button', { name: 'Import data', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Imported 2 entries.' })).toBeVisible();
}
async function publish(page: Page) {
  const response = page.waitForResponse(
    (r) => r.url().endsWith('/api/schedules') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Publish Schedule', exact: true }).click();
  const result = await response;
  expect(result.status()).toBe(201);
  const meta = await result.json();
  await expect(page.getByLabel('Public sharing link')).toHaveValue(meta.shareUrl);
  return meta;
}
test('publish, clipboard, WhatsApp, local QR, automatic update, offline cache and unpublish', async ({
  page,
  browser,
}) => {
  await setup(page);
  const meta = await publish(page);
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: 'Copy Sharing Link', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Sharing link copied' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(meta.shareUrl);
  const whatsapp = page.getByRole('link', { name: 'Share through WhatsApp' });
  const url = new URL((await whatsapp.getAttribute('href'))!);
  expect(url.searchParams.get('text')).toContain(meta.shareUrl);
  expect(url.searchParams.get('text')).toContain(
    formatTime(meta.lastUpdatedAt, 'America/Toronto', true),
  );
  expect(url.href).not.toContain(meta.editToken);
  await page.getByRole('button', { name: 'Show QR Code' }).click();
  const dialog = page.getByRole('dialog', { name: 'Share schedule QR code' });
  await expect(dialog.locator('[data-public-qr]')).toHaveAttribute('data-public-qr', meta.shareUrl);
  await expect(dialog.locator('svg')).toBeVisible();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  const context = await browser.newContext({ viewport: page.viewportSize()! });
  const viewer = await context.newPage();
  await viewer.clock.install();
  await viewer.goto(meta.shareUrl);
  await expect(
    viewer.getByRole('heading', { name: 'Shared Fixture Cup', exact: true }),
  ).toBeVisible();
  await expect(viewer.getByText(/^Last updated at /)).toContainText(
    formatTime(meta.lastUpdatedAt, 'America/Toronto'),
  );
  await expect(viewer.getByRole('button', { name: 'Publish Schedule', exact: true })).toHaveCount(
    0,
  );
  await expect(viewer.locator('input[type=file]')).toHaveCount(0);
  expect(await viewer.content()).not.toContain(meta.editToken);
  await viewer.getByRole('tab', { name: 'Students', exact: true }).click();
  await viewer.getByLabel('Student search').fill('Asha');
  await viewer.getByRole('combobox', { name: 'Sort by', exact: true }).selectOption('tatami');
  await viewer.getByRole('button', { name: 'Sun, Oct 18' }).click();
  await page.getByRole('tab', { name: 'Students', exact: true }).click();
  await page.locator('.student-group').first().locator('.card-actions summary').click();
  await page
    .getByRole('button', { name: 'Edit Asha Rao', exact: true })
    .filter({ visible: true })
    .click();
  await page.getByLabel('Tatami', { exact: true }).fill('9');
  await page.getByRole('button', { name: 'Save correction', exact: true }).click();
  const updated = page.waitForResponse((r) => r.request().method() === 'PUT');
  await page.getByRole('button', { name: 'Update Published Schedule' }).click();
  expect((await updated).status()).toBe(200);
  await expect(page.getByLabel('Public sharing link')).toHaveValue(meta.shareUrl);
  await viewer.clock.fastForward(45000);
  await expect(viewer.locator('.tatami strong').filter({ visible: true })).toHaveText('9');
  await expect(viewer.getByRole('tab', { name: 'Students', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(viewer.getByLabel('Student search')).toHaveValue('Asha');
  await expect(viewer.getByRole('combobox', { name: 'Sort by', exact: true })).toHaveValue(
    'tatami',
  );
  await viewer.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(
    viewer.getByRole('status').filter({ hasText: 'You already have the latest schedule' }),
  ).toBeVisible();
  await viewer.route('**/api/schedules/*', (route) =>
    route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }),
  );
  await viewer.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(
    viewer.getByRole('status').filter({
      hasText: 'Could not check for updates. The last available schedule is still shown.',
    }),
  ).toBeVisible();
  await expect(viewer.locator('.tatami strong').filter({ visible: true })).toHaveText('9');
  await viewer.unroute('**/api/schedules/*');
  await expect.poll(() => viewer.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await viewer.reload({ waitUntil: 'domcontentloaded' });
  await expect(
    viewer.locator('.notice').filter({ hasText: 'Offline — showing the schedule last updated at' }),
  ).toBeVisible();
  await expect(
    viewer.getByRole('heading', { name: 'Shared Fixture Cup', exact: true }),
  ).toBeVisible();
  await context.setOffline(false);
  await expect(viewer.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled();
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Unpublish Schedule', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Schedule unpublished' })).toBeVisible();
  await viewer.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(
    viewer
      .getByRole('status')
      .filter({ hasText: 'This tournament schedule is no longer available.' }),
  ).toBeVisible();
  await context.close();
});
test('private recovery export/import restores update authority on a trusted device', async ({
  page,
  browser,
}) => {
  await setup(page);
  const meta = await publish(page);
  await page.getByText('WhatsApp message and private recovery', { exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export Organizer Recovery File' }).click();
  const download = await downloadPromise;
  const recovery = JSON.parse(readFileSync((await download.path())!, 'utf8'));
  expect(Object.keys(recovery).sort()).toEqual(['editToken', 'shareId']);
  expect(recovery.editToken).toBe(meta.editToken);
  const context = await browser.newContext({ viewport: page.viewportSize()! });
  const trusted = await context.newPage();
  await setup(trusted);
  await trusted.getByText('Import Organizer Recovery File', { exact: true }).click();
  await trusted.getByLabel('Private organizer recovery file').setInputFiles({
    name: 'private.ama-recovery.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(recovery)),
  });
  await expect(
    trusted.getByRole('status').filter({ hasText: 'Organizer recovery imported' }),
  ).toBeVisible();
  await expect(trusted.getByLabel('Public sharing link')).toHaveValue(meta.shareUrl);
  await trusted.getByRole('button', { name: 'Update Published Schedule' }).click();
  await expect(
    trusted.getByRole('status').filter({ hasText: 'Published successfully' }),
  ).toBeVisible();
  trusted.once('dialog', (d) => d.accept());
  await trusted.getByRole('button', { name: 'Unpublish Schedule' }).click();
  await context.close();
});
test('changing a published tournament invalidates the old link before local replacement', async ({
  page,
  request,
}) => {
  await setup(page);
  const meta = await publish(page);
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Change Tournament', exact: true }).click();
  await expect(page.getByLabel('SportData tournament URL')).toBeVisible();
  expect((await request.get(`/api/schedules/${meta.shareId}`)).status()).toBe(404);
  await page
    .getByLabel('SportData tournament URL')
    .fill('https://sportdata.org/karate/set-online/event.php?vernr=90002');
  await page.getByRole('button', { name: 'Save tournament' }).click();
  await expect(page.getByText('Your Tatami plan starts here')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Tournament 90002', exact: true })).toBeVisible();
  await expect(page.getByText('Asha Rao', { exact: true })).toHaveCount(0);
});
