import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
test('capture JSON and saved HTML import generate the exact pool schedule', async ({ page }) => {
  await page.goto('/');
  await page
    .getByLabel('SportData tournament URL')
    .fill('https://sportdata.org/karate/set-online/event.php?vernr=90001');
  await page.getByLabel('Tournament name', { exact: true }).fill('Capture Cup');
  await page.getByRole('button', { name: 'Save tournament' }).click();
  await page.getByRole('button', { name: 'Capture / Refresh Data', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Open SportData Entries ↗' })).toBeVisible();
  await page.getByRole('button', { name: 'Import capture or saved HTML' }).click();
  await page.getByLabel('Import text', { exact: true }).fill(
    JSON.stringify({
      schemaVersion: 1,
      eventId: '90001',
      eventName: 'Capture Cup',
      type: 'entries',
      sourceUrl: 'https://sportdata.org/karate/set-online/entries.php?vernr=90001',
      capturedAt: '2026-10-17T12:00:00.000Z',
      entries: [
        {
          id: 'entry-1',
          studentName: 'Asha Rao',
          normalizedStudentName: 'asha rao',
          clubName: 'AMA',
          country: 'IND',
          entryType: 'individual',
          categoryId: '11',
          categoryCode: 'K11',
          categoryName: 'U12 Kata',
          drawUrl: 'https://sportdata.org/karate/set-online/draw.php?vernr=90001&catid=11',
          participantListUrl: '',
          sourceUrl: 'https://sportdata.org/karate/set-online/entries.php?vernr=90001',
          warnings: [],
          requiresReview: false,
        },
      ],
      timetable: [],
      assignments: [],
      warnings: [],
    }),
  );
  await page.getByRole('button', { name: 'Import data', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: '1 require review' })).toBeVisible();
  await page
    .getByLabel('Import text', { exact: true })
    .fill(readFileSync('fixtures/sportdata/timetable.html', 'utf8'));
  await page.getByRole('button', { name: 'Import data', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: '1 require review' })).toBeVisible();
  await page
    .getByLabel('Capture source URL (for saved HTML)')
    .fill('https://sportdata.org/karate/set-online/draw.php?vernr=90001&catid=11');
  await page
    .getByLabel('Import text', { exact: true })
    .fill(readFileSync('fixtures/sportdata/draw.html', 'utf8'));
  await page.getByRole('button', { name: 'Import data', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: '0 require review' })).toBeVisible();
  await page.getByRole('tab', { name: 'Students', exact: true }).click();
  await expect(page.locator('.tatami strong').filter({ visible: true })).toHaveText('7');
  await expect(page.locator('.start-time').filter({ visible: true })).toHaveText('9:15 AM');
  await expect(page.getByText('Pool 2', { exact: true }).filter({ visible: true })).toBeVisible();
});
