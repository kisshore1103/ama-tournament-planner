import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { defaults, newWorking, makeRow } from '@/lib/schedule/core';
import { parsePage } from '@/lib/parser/dom';
import { generateSchedule, addTimetable, updateSettings } from '@/lib/schedule/mapping';
import { importCapture } from '@/lib/capture/import';
const source = 'https://sportdata.org/karate/set-online/draw.php?vernr=90001&catid=11';
const page = (name: string) =>
  parsePage(
    new DOMParser().parseFromString(
      readFileSync(`fixtures/sportdata/${name}.html`, 'utf8'),
      'text/html',
    ),
    {
      sourceUrl: source,
      eventId: '90001',
      aliases: defaults.clubAliases,
      timezone: 'America/Toronto',
    },
  );
function working() {
  const data = newWorking(
    'https://sportdata.org/karate/set-online/event.php?vernr=90001',
    'Cup',
    defaults,
  );
  data.entries = page('entries').entries;
  data.timetable = page('timetable').timetable;
  return data;
}
describe('exact initial pool mapping', () => {
  it('reopens review when a second manual slot makes an earlier single-slot mapping ambiguous', () => {
    let data = working();
    data.entries = [];
    data.timetable = [];
    const row = makeRow(
      { studentName: 'Asha Rao', categoryName: 'U12 Kata', categoryId: '11' },
      data.tournament,
    );
    data.rows = [row];
    data.overrides[row.id] = row;
    const slots = page('timetable').timetable;
    data = addTimetable(data, { ...slots[0], totalPools: '1' });
    expect(data.rows[0].tatami).toBe('3');
    data = addTimetable(data, slots[1]);
    expect(data.rows[0].requiresReview).toBe(true);
    expect(data.rows[0].tatami).toBe('');
  });
  it('preserves capture mapping when only settings thresholds change', () => {
    const data = generateSchedule(working());
    const next = updateSettings(
      data,
      { ...data.settings, upcomingThresholdMinutes: 90 },
      'Renamed',
    );
    expect(next.overrides).toEqual(data.overrides);
    expect(next.entries).toEqual(data.entries);
    expect(next.tournament.eventName).toBe('Renamed');
  });
  it('reinterprets local times on a timezone correction', () => {
    const data = generateSchedule(working());
    const next = updateSettings(data, { ...data.settings, eventTimezone: 'Asia/Kolkata' }, 'Cup');
    expect(next.timetable[0].startDateTimeISO).toBe('2026-10-18T03:25:00.000Z');
  });
  it('maps athlete pool 2 to Tatami 7 at its own later start', () => {
    const data = working();
    data.assignments = page('draw').assignments;
    const row = generateSchedule(data).rows.find((r) => r.categoryId === '11')!;
    expect(row.pool).toBe('2');
    expect(row.tatami).toBe('7');
    expect(row.startTimeDisplay).toBe('09:15');
    expect(row.requiresReview).toBe(false);
    expect(row.possibleLaterRounds.map((r) => r.phase)).toEqual(['Final', 'Repechage']);
  });
  it('maps one initial slot without needing a draw', () => {
    const row = generateSchedule(working()).rows.find((r) => r.categoryId === '12')!;
    expect(row.pool).toBe('1');
    expect(row.tatami).toBe('7');
    expect(row.requiresReview).toBe(false);
  });
  it('does not choose first pool when draw is missing', () => {
    const row = generateSchedule(working()).rows.find((r) => r.categoryId === '11')!;
    expect(row.requiresReview).toBe(true);
    expect(row.tatami).toBe('');
  });
  it('refuses ambiguous names across pools', () => {
    const data = working();
    data.assignments = page('ambiguous-draw').assignments;
    expect(generateSchedule(data).rows.find((r) => r.categoryId === '11')?.requiresReview).toBe(
      true,
    );
  });
  it('uses manual overrides last and excludes deleted rows', () => {
    const data = working();
    const override = makeRow(
      {
        studentName: 'Asha Rao',
        categoryName: 'U12 Kata',
        categoryId: '11',
        eventDate: '2026-10-18',
        startTime: '10:00',
        pool: '2',
        tatami: '9',
      },
      data.tournament,
    );
    data.overrides[override.id] = override;
    expect(generateSchedule(data).rows.find((r) => r.id === override.id)?.tatami).toBe('9');
    data.excluded = [override.id];
    expect(generateSchedule(data).rows.some((r) => r.id === override.id)).toBe(false);
  });
  it('rejects captures for a different tournament without mutating data', () => {
    const data = working();
    const old = JSON.stringify(data);
    expect(() => importCapture(JSON.stringify({ ...page('entries'), eventId: '2' }), data)).toThrow(
      'another tournament',
    );
    expect(JSON.stringify(data)).toBe(old);
  });
  it('retains a single student/category row after repeated imports', () => {
    let data = working();
    data = importCapture(JSON.stringify(page('entries')), data);
    data = importCapture(JSON.stringify(page('entries')), data);
    expect(data.rows.filter((r) => r.categoryId === '11')).toHaveLength(1);
  });
});
