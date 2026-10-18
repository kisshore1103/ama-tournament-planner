import { test, expect, type Page } from '@playwright/test';
async function setup(page: Page, id = '90001') {
  await page.goto('/');
  await page
    .getByLabel('SportData tournament URL')
    .fill(`https://sportdata.org/karate/set-online/veranstaltung_info_main.php?vernr=${id}`);
  await page.getByLabel('Tournament name', { exact: true }).fill('Fixture Cup');
  await page.getByRole('button', { name: 'Save tournament' }).click();
  await expect(page.getByRole('heading', { name: 'Fixture Cup', exact: true })).toBeVisible();
}
test('setup, manual entry, persistence, views and tournament replacement', async ({ page }) => {
  await setup(page);
  await page.getByRole('button', { name: '+ Add Student Entry', exact: true }).click();
  await page.getByLabel('Student name', { exact: true }).fill('Asha Rao');
  await page.getByLabel('Category name', { exact: true }).fill('U12 Kata');
  await page.getByLabel('Category ID', { exact: true }).fill('11');
  await page.getByLabel('Competition date').fill('2026-10-18');
  await page.getByLabel('Start time', { exact: true }).fill('09:00');
  await page.getByLabel('End time', { exact: true }).fill('09:30');
  await page.getByLabel('Pool', { exact: true }).fill('2');
  await page.getByLabel('Tatami', { exact: true }).fill('7');
  await page
    .getByLabel('Draw URL', { exact: true })
    .fill('https://sportdata.org/karate/set-online/draw.php?catid=11&vernr=90001');
  await page.getByRole('button', { name: 'Save student entry', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved on this device.' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Fixture Cup', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sun, Oct 18' })).toBeVisible();
  await page.getByRole('tab', { name: 'Students', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Asha Rao/ })).toBeVisible();
  await page.getByLabel('Student search').fill('Nobody');
  await expect(page.getByRole('heading', { name: 'No matching entries' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await page.getByRole('tab', { name: 'Now and Next', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Next five entries/ })).toBeVisible();
  await page.getByRole('tab', { name: 'All Schedule', exact: true }).click();
  await page.getByRole('combobox', { name: 'Sort by', exact: true }).selectOption('studentName');
  await expect(page.getByRole('link', { name: 'Open Timetable ↗' })).toHaveAttribute(
    'href',
    /eventid=90001/,
  );
  const visibleDraw = page
    .getByRole('link', { name: /Asha Rao/ })
    .filter({ visible: true })
    .first();
  await expect(visibleDraw).toHaveAttribute('href', /catid=11/);
  await expect(page.locator('body')).toHaveJSProperty(
    'scrollWidth',
    await page.evaluate(() => document.documentElement.clientWidth),
  );
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Change Tournament', exact: true }).click();
  await page
    .getByLabel('SportData tournament URL')
    .fill('https://sportdata.org/karate/set-online/event.php?vernr=90002');
  await page.getByLabel('Tournament name', { exact: true }).fill('New Cup');
  await page.getByRole('button', { name: 'Save tournament' }).click();
  await expect(page.getByRole('heading', { name: 'New Cup', exact: true })).toBeVisible();
  await expect(page.getByText('Your Tatami plan starts here')).toBeVisible();
});
test('CSV fallback imports, validates and preserves data on failure', async ({ page }) => {
  await setup(page);
  await page.getByRole('button', { name: 'Import / Export', exact: true }).click();
  await page
    .getByLabel('Import text', { exact: true })
    .fill(
      'studentName,categoryName,pool,tatami,eventDate,startTime\nDev Singh,U14 Kumite,1,3,2026-10-19,10:00',
    );
  await page.getByRole('button', { name: 'Import data', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Imported 1 entries.' })).toBeVisible();
  await page.getByLabel('Import text', { exact: true }).fill('{invalid');
  await page.getByRole('button', { name: 'Import data', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Invalid JSON' })).toBeVisible();
  await page.getByRole('tab', { name: 'Students', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Dev Singh/ })).toBeVisible();
});
