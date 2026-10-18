import { capturePageSchema, captureSessionSchema, type CapturePage } from './schema';
import { workingSchema, type WorkingData } from '@/lib/validation/models';
import { parsePage } from '@/lib/parser/dom';
import { generateSchedule } from '@/lib/schedule/mapping';
import { matchClub } from '@/lib/schedule/core';

export function isCapture(value: string) {
  try {
    const parsed = JSON.parse(value);
    return !!(parsed.pages || (parsed.type && parsed.capturedAt));
  } catch {
    return false;
  }
}
export function importCapture(value: string, data: WorkingData, sourceUrl?: string): WorkingData {
  let pages: CapturePage[];
  if (/^\s*</.test(value)) {
    if (!/<(?:html|table|body|h1|!doctype)\b/i.test(value)) throw new Error('Invalid HTML file.');
    const doc = new DOMParser().parseFromString(value, 'text/html');
    pages = [
      parsePage(doc, {
        sourceUrl: sourceUrl || data.tournament.tournamentUrl,
        eventId: data.tournament.eventId,
        aliases: data.settings.clubAliases,
        timezone: data.settings.eventTimezone,
      }),
    ];
  } else {
    let parsed;
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new Error('Invalid capture JSON. Existing data kept.');
    }
    if (parsed.pages) {
      const session = captureSessionSchema.parse(parsed);
      if (session.eventId !== data.tournament.eventId)
        throw new Error('Capture belongs to another tournament.');
      pages = session.pages;
    } else pages = [capturePageSchema.parse(parsed)];
  }
  let next = {
    ...data,
    entries: [...data.entries],
    timetable: [...data.timetable],
    assignments: [...data.assignments],
  };
  for (const raw of pages) {
    const page = capturePageSchema.parse(raw);
    if (page.eventId !== data.tournament.eventId)
      throw new Error('Capture belongs to another tournament.');
    const source = new URL(page.sourceUrl);
    const sourceEvent =
      source.searchParams.get('vernr') ||
      source.searchParams.get('eventid') ||
      source.searchParams.get('verid');
    if (sourceEvent && sourceEvent !== page.eventId)
      throw new Error('Capture source event does not match the current tournament.');
    const importedEntries = page.entries.filter(
      (e) => matchClub(e.clubName, data.settings.clubAliases).matches,
    );
    if (page.type === 'entries')
      next.entries = next.entries.filter((e) => e.sourceUrl !== page.sourceUrl);
    const entryMap = new Map(next.entries.map((e) => [e.id, e]));
    importedEntries.forEach((e) => entryMap.set(e.id, e));
    next.entries = [...entryMap.values()];
    const dates = new Set(page.timetable.map((r) => r.eventDateISO));
    if (page.type === 'timetable')
      next.timetable = next.timetable.filter(
        (r) => r.sourceUrl !== page.sourceUrl || !dates.has(r.eventDateISO),
      );
    const slots = new Map(next.timetable.map((r) => [r.id, r]));
    page.timetable.forEach((r) => slots.set(r.id, r));
    next.timetable = [...slots.values()];
    if (page.type === 'draw')
      next.assignments = next.assignments.filter((a) => a.drawUrl !== page.sourceUrl);
    const assignments = new Map(
      next.assignments.map((a) => [
        `${a.categoryId}:${a.categoryName}:${a.normalizedStudentName}:${a.pool}`,
        a,
      ]),
    );
    page.assignments.forEach((a) =>
      assignments.set(`${a.categoryId}:${a.categoryName}:${a.normalizedStudentName}:${a.pool}`, a),
    );
    next.assignments = [...assignments.values()];
    next = {
      ...next,
      captureWarnings: [...new Set([...next.captureWarnings, ...page.warnings])].slice(-40),
      tournament: {
        ...next.tournament,
        eventDays: [...new Set([...next.tournament.eventDays, ...page.eventDays])].sort(),
        eventName:
          page.type === 'event' && page.eventName ? page.eventName : next.tournament.eventName,
        lastCapturedAt: page.capturedAt,
      },
    };
  }
  return workingSchema.parse(generateSchedule(next));
}
