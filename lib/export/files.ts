import { rowSchema, type ScheduleRow, type Tournament } from '@/lib/validation/models';
import { makeRow } from '@/lib/schedule/core';
const columns = [
  'studentName',
  'categoryName',
  'categoryId',
  'categoryCode',
  'pool',
  'tatami',
  'eventDate',
  'startTime',
  'endTime',
  'drawUrl',
];
export function download(name: string, content: string, type = 'application/json') {
  const u = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
export function toCSV(rows: ScheduleRow[]) {
  const quote = (v: string) => `"${(/^[=+@-]/.test(v) ? "'" : '') + v.replaceAll('"', '""')}"`;
  return [
    columns.join(','),
    ...rows.map((r) =>
      [
        r.studentName,
        r.categoryName,
        r.categoryId,
        r.categoryCode,
        r.pool,
        r.tatami,
        r.eventDateISO,
        r.startTimeDisplay,
        r.endTimeDisplay,
        r.drawUrl,
      ]
        .map(quote)
        .join(','),
    ),
  ].join('\r\n');
}
export function parseDelimited(value: string): Record<string, string>[] {
  const delimiter = value.split('\n')[0].includes('\t') ? '\t' : ',';
  const rows: string[][] = [];
  let row: string[] = [],
    field = '',
    quoted = false;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === '"') {
      if (quoted && value[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && (ch === delimiter || ch === '\n')) {
      row.push(field.replace(/\r$/, ''));
      field = '';
      if (ch === '\n') {
        rows.push(row);
        row = [];
      }
    } else field += ch;
  }
  if (quoted) throw new Error('Invalid CSV/TSV: unclosed quoted field.');
  if (field || row.length) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }
  const header = rows.shift()?.map((h) => h.trim().replace(/^\uFEFF/, '')) || [];
  if (!header.includes('studentName') || !header.includes('categoryName'))
    throw new Error(
      'CSV, TSV or plain text needs a header with studentName and categoryName. Separate fields with commas or tabs.',
    );
  return rows
    .filter((r) => r.some(Boolean))
    .map((r, i) => {
      if (r.length !== header.length)
        throw new Error(`Row ${i + 2}: column count does not match header.`);
      return Object.fromEntries(header.map((h, j) => [h, r[j].trim()]));
    });
}
export function importRows(value: string, tournament: Tournament): ScheduleRow[] {
  let fields: unknown[];
  if (/^\s*[\[{]/.test(value)) {
    let data;
    try {
      data = JSON.parse(value);
    } catch {
      throw new Error('Invalid JSON. The existing schedule has been kept.');
    }
    fields = Array.isArray(data) ? data : data.rows;
    if (!Array.isArray(fields)) throw new Error('Schedule JSON must contain rows.');
    return fields.map((r, i) => {
      const result = rowSchema.safeParse(r);
      if (!result.success) throw new Error(`Row ${i + 1}: invalid schedule data.`);
      if (result.data.tournamentUrl !== tournament.tournamentUrl)
        throw new Error(`Row ${i + 1}: this schedule belongs to another tournament.`);
      return result.data;
    });
  }
  return parseDelimited(value).map((r, i) => {
    try {
      return rowSchema.parse(makeRow(r, tournament));
    } catch (error) {
      throw new Error(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Invalid values'}`);
    }
  });
}
const escapeICS = (s: string) =>
  s.replaceAll('\\', '\\\\').replaceAll('\n', '\\n').replaceAll(',', '\\,').replaceAll(';', '\\;');
export function toICS(rows: ScheduleRow[]) {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AMA//Tatami Planner//EN',
    ...rows
      .filter((r) => r.startDateTimeISO)
      .flatMap((r) => [
        'BEGIN:VEVENT',
        `UID:${encodeURIComponent(r.id)}@ama-planner`,
        `DTSTAMP:${new Date()
          .toISOString()
          .replace(/[-:]/g, '')
          .replace(/\.\d+Z$/, 'Z')}`,
        `DTSTART:${r.startDateTimeISO.replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')}`,
        ...(r.endDateTimeISO
          ? [`DTEND:${r.endDateTimeISO.replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')}`]
          : []),
        `SUMMARY:${escapeICS(`${r.studentName} — ${r.categoryName}`)}`,
        `LOCATION:${escapeICS(`Tatami ${r.tatami} / Pool ${r.pool}`)}`,
        `DESCRIPTION:${escapeICS(r.drawUrl)}`,
        'END:VEVENT',
      ]),
    'END:VCALENDAR',
  ]
    .map((line) => line.match(/.{1,70}/gu)?.join('\r\n ') || '')
    .join('\r\n');
}
export function eventDetails(rows: ScheduleRow[]) {
  return (
    'AMA TOURNAMENT SCHEDULE\n\n' +
    rows
      .map(
        (r) =>
          `${r.eventDateISO} ${r.startTimeDisplay || 'Time TBC'} — Tatami ${r.tatami || 'TBC'}\n${r.studentName} — ${r.categoryName}\nPool ${r.pool || 'TBC'}${r.drawUrl ? `\n${r.drawUrl}` : ''}`,
      )
      .join('\n\n')
  );
}
export async function copyText(text: string) {
  if (!navigator.clipboard)
    throw new Error('Clipboard unavailable. Select and copy the text shown below.');
  await navigator.clipboard.writeText(text);
}
export async function shareText(title: string, text: string, url?: string) {
  if (navigator.share) await navigator.share({ title, text, ...(url ? { url } : {}) });
  else await copyText(url || text);
}
