import { describe, expect, it } from 'vitest';
import {
  defaults,
  parseTournamentUrl,
  matchClub,
  normalizeName,
  newWorking,
  makeRow,
  statusOf,
  localISO,
  rowId,
  conflicts,
} from '@/lib/schedule/core';
import { importRows, parseDelimited, toCSV, toICS } from '@/lib/export/files';
import { rowSchema, settingsSchema } from '@/lib/validation/models';
import { checkedLabel } from '@/lib/time/checked';
const tournament = newWorking(
  'https://www.sportdata.org/karate/set-online/veranstaltung_info_main.php?vernr=90001',
  'Test cup',
  defaults,
).tournament;
const fields = {
  studentName: 'Asha Rao',
  categoryName: 'U12 Kata',
  categoryId: '11',
  eventDate: '2026-10-18',
  startTime: '09:00',
  endTime: '09:30',
  pool: '2',
  tatami: '7',
};
describe('URL security', () => {
  it('extracts and normalizes event ID', () =>
    expect(
      parseTournamentUrl(
        'https://sportdata.org/karate/set-online/veranstaltung_info_main.php?vernr=10695#top',
      ).eventId,
    ).toBe('10695'));
  it.each([
    'http://www.sportdata.org/karate/set-online/x?vernr=1',
    'https://sportdata.org.evil.com/karate/set-online/x?vernr=1',
    'javascript:alert(1)',
    'https://sportdata.org/judo/set-online/x?vernr=1',
    'https://sportdata.org/karate/set-online/x?vernr=0',
    'https://sportdata.org/karate/set-online/x?vernr=1&vernr=2',
    'https://user@sportdata.org/karate/set-online/x?vernr=1',
  ])('rejects %s', (url) => expect(() => parseTournamentUrl(url)).toThrow());
});
describe('conservative matching', () => {
  it.each(['ARUN MARTIAL ARTS (AMA) [8]', 'Arun Martial Arts(AMA) - IND', 'AMA'])(
    'matches %s',
    (s) => expect(matchClub(s, defaults.clubAliases).matches).toBe(true),
  );
  it.each(['Yamaguchi', 'Samara Academy', 'Other AMA Club'])('does not use substring %s', (s) =>
    expect(matchClub(s, defaults.clubAliases).matches).toBe(false),
  );
  it('normalizes surname-first, accents and punctuation', () =>
    expect(normalizeName('RÁO, Asha')).toBe(normalizeName('Asha Rao')));
});
describe('manual schedule', () => {
  it('maps event-local times to UTC', () =>
    expect(localISO('2026-10-18', '09:00', 'America/Toronto')).toBe('2026-10-18T13:00:00.000Z'));
  it('rejects nonexistent DST time', () =>
    expect(() => localISO('2026-03-08', '02:30', 'America/Toronto')).toThrow());
  it('keeps stable identity across name order', () =>
    expect(rowId('1', 'Asha Rao', '11', 'Kata')).toBe(rowId('1', 'RAO, ASHA', '11', 'Kata')));
  it('validates row and computes live statuses', () => {
    const r = rowSchema.parse(makeRow(fields, tournament));
    expect(r.requiresReview).toBe(false);
    expect(statusOf(r, Date.parse(r.startDateTimeISO) - 600000)).toBe('Starts soon');
    expect(statusOf(r, Date.parse(r.startDateTimeISO))).toBe('Starting now');
    expect(statusOf(r, Date.parse(r.startDateTimeISO) + 120000)).toBe('Likely in progress');
    expect(statusOf(r, Date.parse(r.endDateTimeISO))).toBe('Completed by schedule');
  });
  it('flags incomplete data', () =>
    expect(makeRow({ studentName: 'Asha', categoryName: 'Kata' }, tournament).requiresReview).toBe(
      true,
    ));
  it('detects coverage conflicts across Tatamis', () => {
    const a = makeRow(fields, tournament);
    const b = makeRow({ ...fields, studentName: 'Dev', tatami: '8' }, tournament);
    expect(conflicts([a, b]).size).toBe(2);
  });
  it('bounds polling interval', () =>
    expect(settingsSchema.safeParse({ ...defaults, autoRefreshSeconds: 29 }).success).toBe(false));
});
describe('manual imports and exports', () => {
  it('folds UTF-8 calendar lines within 75 octets', () => {
    const ics = toICS([makeRow({ ...fields, studentName: 'ஆ'.repeat(70) }, tournament)]);
    expect(ics.split('\r\n').every((line) => new TextEncoder().encode(line).length <= 75)).toBe(
      true,
    );
  });
  it('does not report an old check as just now', () => {
    const then = '2026-10-17T12:00:00.000Z';
    expect(checkedLabel(then, Date.parse(then) + 30000)).toBe('Checked just now');
    expect(checkedLabel(then, Date.parse(then) + 120000)).toBe('Checked 2 minutes ago');
  });
  it('handles quoted delimiters and TSV', () => {
    expect(parseDelimited('studentName,categoryName\n"Rao, Asha","Kata"')[0].studentName).toBe(
      'Rao, Asha',
    );
    expect(parseDelimited('studentName\tcategoryName\nAsha\tKata')).toHaveLength(1);
  });
  it('reports row-level errors', () =>
    expect(() =>
      importRows(
        'studentName,categoryName,startTime,eventDate\nAsha,Kata,25:00,2026-10-18',
        tournament,
      ),
    ).toThrow('Row 2'));
  it('round-trips schedule JSON and CSV', () => {
    const r = makeRow(fields, tournament);
    expect(importRows(JSON.stringify({ rows: [r] }), tournament)[0].id).toBe(r.id);
    expect(importRows(toCSV([r]), tournament)[0].pool).toBe('2');
  });
  it('creates UTC calendar events', () =>
    expect(toICS([makeRow(fields, tournament)])).toContain('DTSTART:20261018T130000Z'));
  it('rejects unsafe draw links', () =>
    expect(
      rowSchema.safeParse({ ...makeRow(fields, tournament), drawUrl: 'javascript:alert(1)' })
        .success,
    ).toBe(false));
});
