import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parsePage, safeSportLink, verificationDetected } from '@/lib/parser/dom';
import { capturePageSchema } from '@/lib/capture/schema';
import { defaults } from '@/lib/schedule/core';
const documentFor = (name: string) =>
  new DOMParser().parseFromString(
    readFileSync(`fixtures/sportdata/${name}.html`, 'utf8'),
    'text/html',
  );
const context = {
  sourceUrl: 'https://sportdata.org/karate/set-online/draw.php?vernr=90001&catid=11',
  eventId: '90001',
  aliases: defaults.clubAliases,
  timezone: 'America/Toronto',
};
describe('capture parser', () => {
  it('blocks verification before parsing', () => {
    expect(verificationDetected(documentFor('verification'))).toBe(true);
    expect(() => parsePage(documentFor('verification'), context)).toThrow(
      'Complete SportData verification normally',
    );
  });
  it('parses and deduplicates entries with teams and club filtering', () => {
    const page = parsePage(documentFor('entries'), context);
    expect(page.type).toBe('entries');
    expect(page.entries).toHaveLength(4);
    expect(page.entries.some((e) => e.studentName === 'Other Athlete')).toBe(false);
    expect(page.entries.filter((e) => e.entryType === 'team')).toHaveLength(2);
    expect(capturePageSchema.safeParse(page).success).toBe(true);
  });
  it('supports participant-page heading context', () => {
    const page = parsePage(documentFor('participants'), context);
    expect(page.entries[0].categoryName).toBe('U12 Kata');
  });
  it('parses multi-day timezones and excludes breaks', () => {
    const page = parsePage(documentFor('timetable'), context);
    expect(page.type).toBe('timetable');
    expect(page.timetable).toHaveLength(5);
    expect(new Set(page.timetable.map((r) => r.eventDateISO)).size).toBe(2);
    expect(page.timetable[1].tatami).toBe('7');
    expect(page.timetable[1].startDateTimeISO).toBe('2026-10-18T13:15:00.000Z');
    expect(page.timetable[4].startDateTimeISO).toBe('2026-10-19T14:15:00.000Z');
  });
  it('parses simultaneous Tatami grid conservatively', () => {
    const page = parsePage(documentFor('grid'), context);
    expect(page.timetable.map((r) => r.tatami)).toEqual(['1', '2']);
    expect(page.timetable.map((r) => r.pool)).toEqual(['1', '2']);
  });
  it('detects initial draw pools and excludes later appearances', () => {
    const page = parsePage(documentFor('draw'), context);
    expect(page.type).toBe('draw');
    const own = page.assignments.filter((a) => a.normalizedStudentName === 'asha rao');
    expect(own).toHaveLength(1);
    expect(own[0].pool).toBe('2');
    expect(own[0].sourceHeading).toContain('Main Tree');
  });
  it('assigns one pool for double elimination without a number', () => {
    expect(parsePage(documentFor('double-elimination'), context).assignments[0].pool).toBe('1');
  });
  it('keeps unknown layouts and unidentified teams in review', () => {
    expect(parsePage(documentFor('unknown'), context).warnings[0]).toContain('Unknown');
    expect(parsePage(documentFor('missing-fields'), context).entries[0].requiresReview).toBe(true);
  });
  it('does not export unknown session query parameters', () => {
    const url = safeSportLink(
      'https://sportdata.org/karate/set-online/draw.php?vernr=90001&catid=11&session=private&token=private',
      context.sourceUrl,
    );
    expect(url).not.toContain('private');
    expect(url).toContain('catid=11');
    expect(safeSportLink('', context.sourceUrl)).toBe('');
  });
});
