import { afterEach, describe, expect, it } from 'vitest';
import { db, loadWorking, replaceWorking, saveWorking } from '@/lib/db/local';
import { defaults, makeRow, newWorking } from '@/lib/schedule/core';
const make = (id = '90001') =>
  newWorking(`https://sportdata.org/karate/set-online/event.php?vernr=${id}`, 'Test cup', defaults);
afterEach(async () => {
  await db.current.clear();
  await db.shared.clear();
});
describe('single tournament IndexedDB', () => {
  it('saves and restores rows and view preferences', async () => {
    const data = make();
    data.rows = [makeRow({ studentName: 'Asha', categoryName: 'Kata' }, data.tournament)];
    data.preferences = { view: 'students' };
    await saveWorking(data);
    expect((await loadWorking())?.rows).toHaveLength(1);
    expect((await loadWorking())?.preferences.view).toBe('students');
  });
  it('replaces all previous working data without history', async () => {
    const data = make();
    data.overrides.x = makeRow({ studentName: 'Asha', categoryName: 'Kata' }, data.tournament);
    await saveWorking(data);
    await replaceWorking(make('90002'));
    expect(await db.current.count()).toBe(1);
    expect((await loadWorking())?.overrides).toEqual({});
    expect((await loadWorking())?.tournament.eventId).toBe('90002');
  });
  it('preserves last valid state after rejected save', async () => {
    await saveWorking(make());
    await expect(
      saveWorking({ ...make(), tournament: { ...make().tournament, eventId: 'bad' } }),
    ).rejects.toThrow();
    expect((await loadWorking())?.tournament.eventId).toBe('90001');
  });
});
