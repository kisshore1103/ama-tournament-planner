import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
async function setup(page: Page, id = '90003') {
  await page.goto('/');
  await page
    .getByLabel('SportData tournament URL')
    .fill(`https://sportdata.org/karate/set-online/event.php?vernr=${id}`);
  await page.getByLabel('Tournament name', { exact: true }).fill('Local Fixture Cup');
  await page.getByRole('button', { name: 'Save tournament' }).click();
}
test('manual timetable, correction, day coverage, keyboard views and offline organizer', async ({
  page,
}, testInfo) => {
  const externalRequests: string[] = [];
  page.on('request', (r) => {
    if (new URL(r.url()).hostname.endsWith('sportdata.org')) externalRequests.push(r.url());
  });
  await setup(page);
  await page.getByRole('button', { name: '+ Add Student Entry', exact: true }).click();
  await page.getByLabel('Student name', { exact: true }).fill('Asha Rao');
  await page.getByLabel('Category name', { exact: true }).fill('Kata');
  await page.getByLabel('Category ID', { exact: true }).fill('11');
  await page.getByRole('button', { name: 'Save student entry', exact: true }).click();
  await expect(page.locator('.summary-grid > div').nth(2).locator('strong')).toHaveText('1');
  await page.getByRole('button', { name: 'Add Timetable Record', exact: true }).click();
  await page.getByLabel('Category name', { exact: true }).fill('Kata');
  await page.getByLabel('Category ID', { exact: true }).fill('11');
  await page.getByLabel('Competition date').fill('2026-10-18');
  await page.getByLabel('Start time', { exact: true }).fill('09:00');
  await page.getByLabel('Pool', { exact: true }).fill('1');
  await page.getByLabel('Tatami', { exact: true }).fill('7');
  await page.getByLabel('Total pools', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Save timetable record', exact: true }).click();
  await expect(page.locator('.summary-grid > div').nth(2).locator('strong')).toHaveText('0');
  await page.getByRole('tab', { name: 'All Schedule', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Students', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.locator('.card-actions summary').filter({ visible: true }).first().click();
  await page
    .getByRole('button', { name: 'Edit Asha Rao', exact: true })
    .filter({ visible: true })
    .click();
  await page.getByLabel('Tatami', { exact: true }).fill('9');
  await page.getByLabel('Pool', { exact: true }).fill('2');
  await page
    .getByLabel('Draw URL')
    .fill('https://sportdata.org/karate/set-online/draw.php?vernr=90003&catid=11');
  await page.getByRole('button', { name: 'Save correction', exact: true }).click();
  await page.getByRole('button', { name: 'Capture / Refresh Data', exact: true }).click();
  await page.getByRole('button', { name: '3. Timetable', exact: true }).click();
  await page.getByLabel('Expected tournament day').fill('2026-10-19');
  await page.getByRole('button', { name: 'Add expected day' }).click();
  await expect(page.getByText('Missing expected days: 2026-10-19')).toBeVisible();
  await page.getByRole('button', { name: 'Capture / Refresh Data', exact: true }).click();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await page.context().setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Local Fixture Cup', exact: true })).toBeVisible();
  await expect(page.locator('.notice')).toContainText('Offline');
  await expect(page.locator('.tatami strong').filter({ visible: true })).toHaveText('9');
  expect(externalRequests).toEqual([]);
  expect(
    await page.evaluate(() => document.body.scrollWidth <= document.documentElement.clientWidth),
  ).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('organizer.png'), fullPage: true });
});
test('resolved-only publication, native-share fallback, full QR and safe exports', async ({
  page,
  request,
}) => {
  await setup(page, '90004');
  await page.getByRole('button', { name: 'Import / Export', exact: true }).click();
  await page
    .getByLabel('Import text', { exact: true })
    .fill(
      'studentName,categoryName,categoryId,pool,tatami,eventDate,startTime,drawUrl\nAsha Rao,Kata,11,1,7,2026-10-18,09:00,https://sportdata.org/karate/set-online/draw.php?vernr=90004&catid=11\nLiam,Kumite,12,,,,,',
    );
  await page.getByRole('button', { name: 'Import data', exact: true }).click();
  await expect(
    page.getByText('1 unresolved entries will be excluded.', { exact: false }),
  ).toBeVisible();
  await page.getByRole('combobox', { name: 'Sort by', exact: true }).selectOption('studentName');
  await page.getByRole('button', { name: 'Ascending ↑', exact: true }).click();
  if ((page.viewportSize()?.width || 0) < 768)
    await expect(page.locator('.mobile-cards .card-person').first()).toHaveText('Liam');
  else
    await expect(page.locator('.desktop-table tbody tr').first().locator('td').nth(4)).toHaveText(
      'Liam',
    );
  await page
    .getByRole('combobox', { name: 'Sort by', exact: true })
    .selectOption('startDateTimeISO');
  const published = page.waitForResponse(
    (r) => r.url().endsWith('/api/schedules') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Publish Schedule', exact: true }).click();
  const meta = await (await published).json();
  const payload = await (await request.get(`/api/schedules/${meta.shareId}`)).json();
  expect(payload.rows).toHaveLength(1);
  expect(payload.rows[0].studentName).toBe('Asha Rao');
  expect(await page.content()).not.toContain(meta.editToken);
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }),
  );
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain(meta.shareUrl);
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('Last updated:');
  await page.getByRole('button', { name: 'Show QR Code' }).click();
  const dialog = page.getByRole('dialog', { name: 'Share schedule QR code' });
  await dialog.getByRole('button', { name: 'Full-screen display' }).click();
  await expect(dialog).toHaveClass('qr-large');
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export schedule JSON', exact: true }).click();
  const json = readFileSync((await (await downloadPromise).path())!, 'utf8');
  expect(JSON.parse(json).rows).toHaveLength(2);
  expect(json).not.toContain(meta.editToken);
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Unpublish Schedule', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Schedule unpublished' })).toBeVisible();
});
test('security headers, robots directives and no public listing', async ({ page, request }) => {
  const response = await page.goto('/s/' + 'z'.repeat(32));
  expect(response?.headers()['x-robots-tag']).toContain('noindex');
  expect(response?.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(response?.headers()['referrer-policy']).toBe('no-referrer');
  expect(response?.headers()['x-content-type-options']).toBe('nosniff');
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', /noindex/);
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: 'This tournament schedule is no longer available.' }),
  ).toBeVisible();
  expect((await request.get('/api/schedules')).status()).toBe(405);
  await expect(page.getByRole('button', { name: 'Publish Schedule', exact: true })).toHaveCount(0);
});
