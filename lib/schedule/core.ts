import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import type { AppSettings, ScheduleRow, Tournament, WorkingData } from '@/lib/validation/models';

export function normalize(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}
export function normalizeName(value: string): string {
  return normalize(value.replace(/^team\s*[:\-]\s*/i, ''))
    .split(' ')
    .sort()
    .join(' ');
}
export function normalizeClub(value: string): string {
  return normalize(
    value
      .replace(
        /(?:\s*[-,]\s*|\s*\()(?:IND|INDIA|CAN|CANADA|USA|GBR|UK|LKA|SRI|NPL|NEP|BGD|AUS|NZL|ARE|UAE|QAT|SAU|SGP|SIN|MYS|MAS|JPN|KOR|DEU|GER|FRA|ITA|ESP|PRT|POR|NLD|NED|BEL|SWE|NOR|FIN|DNK|POL|ZAF|RSA|BRA|MEX|IRL|ENG|PAK)\)?\s*$/i,
        '',
      )
      .replace(/\[\d+\]\s*$/, ''),
  );
}
export function matchClub(value: string, aliases: string[]) {
  const n = normalizeClub(value);
  const exact = aliases.some((a) => normalizeClub(a) === n);
  return {
    matches: exact,
    confidence: exact ? 1 : 0,
    reason: exact
      ? 'Exact normalized club alias match'
      : 'Club does not match a configured alias; confirm manually if needed',
    requiresReview: !exact,
  };
}
export function links(eventId: string) {
  return {
    tournamentUrl: `https://www.sportdata.org/karate/set-online/veranstaltung_info_main.php?active_menu=calendar&vernr=${eventId}`,
    timetableUrl: `https://www.sportdata.org/setglinc/dtm/dtm_timetable.php?eventid=${eventId}&system=karate`,
    drawListUrl: `https://www.sportdata.org/karate/set-online/veranstaltung_info_main.php?active_menu=calendar&vernr=${eventId}&ver_info_action=catauslist#a_eventheadend`,
    entriesUrl: `https://www.sportdata.org/karate/set-online/popup_nennungen_main.php?popup_action=nennungenall&verid=${eventId}`,
  };
}
export function parseTournamentUrl(value: string) {
  let u: URL;
  try {
    u = new URL(value.trim());
  } catch {
    throw new Error('Enter a valid SportData tournament URL.');
  }
  if (
    u.protocol !== 'https:' ||
    !['sportdata.org', 'www.sportdata.org'].includes(u.hostname) ||
    u.username ||
    u.password ||
    u.port ||
    !u.pathname.startsWith('/karate/set-online/')
  )
    throw new Error('Use an HTTPS SportData Karate tournament URL.');
  const eventId = u.searchParams.get('vernr') || '';
  if (!/^[1-9]\d{0,11}$/.test(eventId) || u.searchParams.getAll('vernr').length !== 1)
    throw new Error('Tournament URL needs a positive integer vernr event ID.');
  return { eventId, ...links(eventId) };
}
export const defaults: AppSettings = {
  clubDisplayName: 'Arun Martial Arts(AMA)',
  clubAliases: ['Arun Martial Arts(AMA)', 'Arun Martial Arts (AMA)', 'Arun Martial Arts', 'AMA'],
  normalizedClubAliases: ['arun martial arts ama', 'arun martial arts', 'ama'],
  eventTimezone: process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE || 'America/Toronto',
  upcomingThresholdMinutes: 60,
  defaultView: 'schedule',
  defaultSort: 'startDateTimeISO',
  autoRefreshSeconds: Math.max(
    30,
    Math.min(60, Number(process.env.NEXT_PUBLIC_DEFAULT_AUTO_REFRESH_SECONDS) || 45),
  ),
};
export function newWorking(url: string, name: string, settings: AppSettings): WorkingData {
  const info = parseTournamentUrl(url);
  return {
    key: 'current',
    settings,
    tournament: {
      eventId: info.eventId,
      tournamentUrl: info.tournamentUrl,
      timetableUrl: info.timetableUrl,
      drawListUrl: info.drawListUrl,
      eventName: name || `Tournament ${info.eventId}`,
      eventTimezone: settings.eventTimezone,
      eventDays: [],
      createdAt: new Date().toISOString(),
      lastCapturedAt: '',
      lastGeneratedAt: '',
    },
    entries: [],
    timetable: [],
    assignments: [],
    rows: [],
    overrides: {},
    excluded: [],
    publish: null,
    captureWarnings: [],
    preferences: {},
  };
}
export function rowId(eventId: string, student: string, categoryId: string, categoryName: string) {
  return `${eventId}:${encodeURIComponent(normalizeName(student))}:${encodeURIComponent(categoryId || normalize(categoryName))}`;
}
export function localISO(date: string, time: string, zone: string): string {
  if (!date || !time) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
    throw new Error('Enter a valid date and 24-hour time.');
  const instant = fromZonedTime(`${date}T${time}:00`, zone);
  if (
    isNaN(instant.getTime()) ||
    formatInTimeZone(instant, zone, "yyyy-MM-dd'T'HH:mm") !== `${date}T${time}`
  )
    throw new Error('This date/time does not exist in the event timezone.');
  return instant.toISOString();
}
export function formatTime(iso: string, zone: string, full = false) {
  return iso
    ? formatInTimeZone(iso, zone, full ? "MMMM d, yyyy 'at' h:mm a zzz" : 'h:mm a')
    : 'Time not available';
}
export function makeRow(fields: Record<string, string>, tournament: Tournament): ScheduleRow {
  const studentName = fields.studentName?.trim() || '';
  const categoryName = fields.categoryName?.trim() || '';
  if (!studentName || !categoryName) throw new Error('Student and category are required.');
  const start = localISO(fields.eventDate || '', fields.startTime || '', tournament.eventTimezone);
  const end = localISO(fields.eventDate || '', fields.endTime || '', tournament.eventTimezone);
  if (start && end && end <= start) throw new Error('End time must be after start time.');
  const missing = !start || !fields.tatami || !fields.pool;
  return {
    id: rowId(tournament.eventId, studentName, fields.categoryId || '', categoryName),
    studentName,
    normalizedStudentName: normalizeName(studentName),
    clubName: fields.clubName || defaults.clubDisplayName,
    entryType: fields.entryType === 'team' ? 'team' : 'individual',
    categoryId: fields.categoryId || '',
    categoryCode: fields.categoryCode || '',
    categoryName,
    eventDateISO: fields.eventDate || '',
    eventDateLabel: fields.eventDate || '',
    startTimeDisplay: fields.startTime || '',
    endTimeDisplay: fields.endTime || '',
    startDateTimeISO: start,
    endDateTimeISO: end,
    tatami: fields.tatami || '',
    pool: fields.pool || '',
    totalPools: fields.totalPools || '',
    phase: fields.phase || 'Pool',
    duration: '',
    entryCount: '',
    drawUrl: fields.drawUrl || '',
    participantListUrl: '',
    tournamentUrl: tournament.tournamentUrl,
    timetableUrl: tournament.timetableUrl,
    status: missing ? 'Review required' : 'Upcoming',
    warnings: missing ? ['Date, start time, pool and Tatami are required.'] : [],
    requiresReview: missing,
    manualOverride: true,
    possibleLaterRounds: [],
  };
}
export function statusOf(row: ScheduleRow, now: number, threshold = 60) {
  if (row.requiresReview) return 'Review required';
  if (!row.startDateTimeISO) return 'Time not available';
  const start = Date.parse(row.startDateTimeISO),
    end = row.endDateTimeISO ? Date.parse(row.endDateTimeISO) : start + 30 * 60000;
  if (now >= end) return 'Completed by schedule';
  if (now >= start && now < start + 60000) return 'Starting now';
  if (now >= start) return 'Likely in progress';
  if (start - now <= threshold * 60000) return 'Starts soon';
  return 'Upcoming';
}
export function chronological(a: ScheduleRow, b: ScheduleRow) {
  return (
    (a.startDateTimeISO || '9999').localeCompare(b.startDateTimeISO || '9999') ||
    a.tatami.localeCompare(b.tatami, undefined, { numeric: true }) ||
    a.studentName.localeCompare(b.studentName)
  );
}
export function conflicts(all: ScheduleRow[]): Set<string> {
  const ids = new Set<string>();
  for (let i = 0; i < all.length; i++)
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i],
        b = all[j];
      if (
        a.requiresReview ||
        b.requiresReview ||
        !a.startDateTimeISO ||
        !b.startDateTimeISO ||
        a.tatami === b.tatami
      )
        continue;
      const sa = Date.parse(a.startDateTimeISO),
        sb = Date.parse(b.startDateTimeISO);
      if (
        sa < (Date.parse(b.endDateTimeISO) || sb + 1800000) &&
        sb < (Date.parse(a.endDateTimeISO) || sa + 1800000)
      ) {
        ids.add(a.id);
        ids.add(b.id);
      }
    }
  return ids;
}
