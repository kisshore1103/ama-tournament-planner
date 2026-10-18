import type { CaptureType, CapturePage } from '@/lib/capture/schema';
import type { StudentEntry, TimetableRecord, DrawPoolAssignment } from '@/lib/validation/models';
import { localISO, matchClub, normalize, normalizeName, rowId } from '@/lib/schedule/core';
import { formatInTimeZone } from 'date-fns-tz';

export const headerAliases: Record<string, string[]> = {
  student: ['student', 'student name', 'name', 'athlete', 'competitor', 'participant', 'team'],
  club: ['club', 'club name', 'association', 'team club'],
  country: ['country', 'nation'],
  category: ['category', 'category name', 'event category'],
  categoryId: ['category id', 'cat id', 'catid'],
  categoryCode: ['category code', 'code'],
  date: ['date', 'day', 'event date'],
  start: ['start', 'start time', 'time', 'scheduled start'],
  end: ['end', 'end time'],
  tatami: ['tatami', 'area', 'mat'],
  pool: ['pool', 'pool number'],
  phase: ['phase', 'round'],
  totalPools: ['total pools', 'pools'],
  duration: ['duration'],
  entryCount: ['entries', 'participants'],
  members: ['members', 'team members'],
};
export function visible(el: Element): boolean {
  if (el.closest('[hidden], [aria-hidden="true"], #ama-capture-control, script, style, template'))
    return false;
  let current: Element | null = el;
  const view = el.ownerDocument.defaultView;
  while (current) {
    const style = current.getAttribute('style') || '';
    if (/display\s*:\s*none|visibility\s*:\s*hidden/i.test(style)) return false;
    if (view) {
      const computed = view.getComputedStyle(current);
      if (
        computed.display === 'none' ||
        computed.visibility === 'hidden' ||
        computed.opacity === '0' ||
        computed.contentVisibility === 'hidden'
      )
        return false;
    }
    current = current.parentElement;
  }
  return true;
}
const txt = (el?: Element | null) =>
  el && visible(el) ? (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 300) : '';
function visibleVerificationText(el: Element): string {
  // Skip whole hidden subtrees, including stale challenge UI and our own control.
  // Reading an ancestor's textContent would include those descendants again.
  const walker = el.ownerDocument.createTreeWalker(el, 5, {
    acceptNode(node) {
      if (node.nodeType === 1) return visible(node as Element) ? 3 : 2;
      return 1;
    },
  });
  let result = '';
  let node: Node | null;
  while (result.length < 500 && (node = walker.nextNode())) {
    result += ` ${(node.textContent || '').replace(/\s+/g, ' ').trim()}`;
  }
  return result.slice(0, 500);
}
export function verificationDetected(doc: Document): boolean {
  if (/verif(?:y|ying|ication)|just a moment|security check/i.test(doc.title)) return true;
  if (
    Array.from(
      doc.querySelectorAll(
        'iframe[src*="captcha"], iframe[src*="challenge"], .cf-challenge, #challenge-form, .g-recaptcha, .h-captcha',
      ),
    ).some(visible)
  )
    return true;
  return Array.from(doc.querySelectorAll('h1,h2,p,div'))
    .filter(visible)
    .some((el) =>
      /verifying you are not a robot|verify you are human|complete the security check/i.test(
        visibleVerificationText(el),
      ),
    );
}
export function safeSportLink(value: string, base: string): string {
  if (!value.trim()) return '';
  try {
    const u = new URL(value, base);
    if (
      u.protocol !== 'https:' ||
      !['sportdata.org', 'www.sportdata.org'].includes(u.hostname) ||
      u.username ||
      u.password ||
      u.port ||
      !(u.pathname.startsWith('/karate/') || u.pathname.startsWith('/setglinc/'))
    )
      return '';
    const allowed = new Set([
      'vernr',
      'verid',
      'eventid',
      'system',
      'catid',
      'categoryid',
      'category',
      'cat',
      'id',
      'drawid',
      'active_menu',
      'ver_info_action',
      'popup_action',
      'language',
      'day',
      'date',
      'action',
      'pool',
      'round',
    ]);
    for (const key of [...u.searchParams.keys()])
      if (!allowed.has(key.toLowerCase())) u.searchParams.delete(key);
    if (u.pathname.startsWith('/setglinc/')) {
      const system = u.searchParams.get('system');
      if (system && system.toLowerCase() !== 'karate') return '';
      u.searchParams.set('system', 'karate');
    }
    return u.href;
  } catch {
    return '';
  }
}
function anchorLinks(el: Element, source: string) {
  const anchors = Array.from(el.querySelectorAll<HTMLAnchorElement>('a[href]')).filter(visible);
  return {
    drawUrl: safeSportLink(
      anchors
        .find((a) => /draw|auslos|tree|bracket/i.test(`${a.textContent} ${a.getAttribute('href')}`))
        ?.getAttribute('href') || '',
      source,
    ),
    participantListUrl: safeSportLink(
      anchors
        .find((a) =>
          /participant|nennung|entries/i.test(`${a.textContent} ${a.getAttribute('href')}`),
        )
        ?.getAttribute('href') || '',
      source,
    ),
  };
}
function categoryIdFrom(el: Element, source: string): string {
  try {
    const from = (href: string) => {
      const u = new URL(href, source);
      return u.searchParams.get('catid') || u.searchParams.get('categoryid') || '';
    };
    const contextual = from(source);
    if (el === el.ownerDocument.documentElement && contextual) return contextual;
    return (
      Array.from(el.querySelectorAll('a[href]'))
        .filter(visible)
        .map((a) => from(a.getAttribute('href') || source))
        .find(Boolean) || contextual
    );
  } catch {
    return '';
  }
}
function headingBefore(el: Element): string {
  let sibling = el.previousElementSibling;
  while (sibling) {
    if (/^H[1-6]$/.test(sibling.tagName)) return txt(sibling);
    const nested = sibling.querySelector('h1,h2,h3,h4,h5,h6');
    if (nested) return txt(nested);
    sibling = sibling.previousElementSibling;
  }
  return txt(el.closest('section,article')?.querySelector('h1,h2,h3,h4,h5,h6'));
}
function dateFrom(value: string): string {
  const iso = value.match(/\b(20\d\d)-(\d{2})-(\d{2})\b/);
  if (iso) return iso[0];
  const dotted = value.match(/\b(\d{1,2})\.(\d{1,2})\.(20\d{2})\b/);
  if (dotted) return `${dotted[3]}-${dotted[2].padStart(2, '0')}-${dotted[1].padStart(2, '0')}`;
  const named = value.match(
    /\b(?:\d{1,2}\s+[A-Za-z]+\s+20\d{2}|[A-Za-z]+\s+\d{1,2},?\s+20\d{2})\b/,
  );
  if (named) {
    const d = new Date(named[0] + ' 12:00:00 UTC');
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return '';
}
function timeFrom(value: string): string {
  const m = value.match(/\b(\d{1,2}):([0-5]\d)\s*(AM|PM)?/i);
  if (!m) return '';
  let hour = Number(m[1]);
  if (m[3]) hour = (hour % 12) + (/pm/i.test(m[3]) ? 12 : 0);
  return hour < 24 ? `${String(hour).padStart(2, '0')}:${m[2]}` : '';
}
export function laterPhase(value: string): boolean {
  return (
    /repechage|rep[eê]chage|final|pool\s*winner|poolwinner|medal/i.test(value) &&
    !/semi.?final/i.test(value)
  );
}
function isInitial(value: string): boolean {
  return !laterPhase(value) && !/semi.?final/i.test(value);
}
function tableData(table: HTMLTableElement) {
  const rows = Array.from(table.rows).filter(visible);
  const headerIndex = rows.findIndex(
    (r) =>
      r.querySelector('th') ||
      Array.from(r.cells).some((c) =>
        /^(name|student|athlete|category|start time|time|club)$/i.test(txt(c)),
      ),
  );
  if (headerIndex < 0) return { headers: [] as string[], rows: [] as HTMLTableRowElement[] };
  return {
    headers: Array.from(rows[headerIndex].cells).map((c) => normalize(txt(c))),
    rows: rows.slice(headerIndex + 1),
  };
}
function field(cells: HTMLTableCellElement[], headers: string[], key: string) {
  return txt(cells[headers.findIndex((h) => headerAliases[key]?.includes(h))]);
}
export function detectPageType(doc: Document): CaptureType {
  const headers = Array.from(doc.querySelectorAll('th')).filter(visible).map(txt).join(' ');
  const headings = Array.from(doc.querySelectorAll('h1,h2,h3,h4'))
    .filter(visible)
    .map(txt)
    .join(' ');
  if (/main tree pool|repechage|double.elimination|pool\s+\d\s*\/\s*\d/i.test(headings))
    return 'draw';
  if (/tatami|start time/i.test(headers) || /timetable|time table/i.test(doc.title + headings))
    return 'timetable';
  if (/club|association/i.test(headers) && /name|athlete|participant|team/i.test(headers))
    return /participants|category/i.test(doc.title) ? 'participants' : 'entries';
  if (/event information|tournament information/i.test(headings)) return 'event';
  return 'unknown';
}
export type ParserContext = {
  sourceUrl: string;
  eventId: string;
  aliases: string[];
  timezone: string;
  type?: CaptureType;
  capturedAt?: string;
};
export function parsePage(doc: Document, context: ParserContext): CapturePage {
  if (verificationDetected(doc))
    throw new Error(
      'Complete SportData verification normally. Capture will become available after the SportData page loads.',
    );
  const sourceUrl = safeSportLink(context.sourceUrl, context.sourceUrl);
  if (!sourceUrl || !/^[1-9]\d{0,11}$/.test(context.eventId))
    throw new Error('A valid SportData source URL and event ID are required.');
  const sourceParams = new URL(sourceUrl).searchParams;
  const sourceEvent =
    sourceParams.get('vernr') || sourceParams.get('eventid') || sourceParams.get('verid');
  if (sourceEvent && sourceEvent !== context.eventId)
    throw new Error('Source event ID does not match the capture event.');
  const type = context.type || detectPageType(doc);
  const entries: StudentEntry[] = [],
    timetable: TimetableRecord[] = [],
    assignments: DrawPoolAssignment[] = [],
    warnings: string[] = [];
  const eventName =
    txt(doc.querySelector('[data-event-name]')) ||
    txt(doc.querySelector('h1')) ||
    doc.title.slice(0, 300);
  let eventTimezone = context.timezone;
  const timezoneText = Array.from(doc.querySelectorAll('[data-timezone],h1,h2,h3,p'))
    .filter(visible)
    .map(
      (el) =>
        el.getAttribute('data-timezone') ||
        txt(el).match(/time\s*zone\s*:\s*([A-Za-z_]+(?:\/[A-Za-z_+-]+)+|UTC|GMT)\b/i)?.[1],
    )
    .find(Boolean);
  if (timezoneText) {
    try {
      new Intl.DateTimeFormat('en', { timeZone: timezoneText });
      eventTimezone = timezoneText;
    } catch {
      warnings.push('Source timezone not recognized. Confirm date/time manually.');
    }
  }
  const tables = Array.from(doc.querySelectorAll<HTMLTableElement>('table')).filter(visible);
  for (const table of tables) {
    const { headers, rows } = tableData(table);
    const heading = headingBefore(table);
    if (type === 'entries' || type === 'participants') {
      for (const tr of rows) {
        const cells = Array.from(tr.cells);
        const club = field(cells, headers, 'club');
        const match = matchClub(club, context.aliases);
        if (!match.matches) continue;
        const teamName = field(cells, headers, 'student');
        const members = field(cells, headers, 'members');
        const isTeam =
          !!members ||
          /^team\b/i.test(teamName) ||
          /\bteam\b/i.test(field(cells, headers, 'category'));
        const names = members
          ? members
              .split(/;|\n/)
              .map((s) => s.trim())
              .filter(Boolean)
          : [teamName];
        const categoryName = field(cells, headers, 'category') || heading;
        for (const studentName of names) {
          if (!studentName || !categoryName) {
            warnings.push('Entry is missing student or category. Enter it manually.');
            continue;
          }
          const categoryId = field(cells, headers, 'categoryId') || categoryIdFrom(tr, sourceUrl);
          const unresolvedTeam = isTeam && !members;
          entries.push({
            id: rowId(context.eventId, studentName, categoryId, categoryName),
            studentName,
            normalizedStudentName: normalizeName(studentName),
            clubName: club,
            country: field(cells, headers, 'country'),
            entryType: isTeam ? 'team' : 'individual',
            categoryId,
            categoryCode: field(cells, headers, 'categoryCode'),
            categoryName,
            ...anchorLinks(tr, sourceUrl),
            sourceUrl,
            warnings: [
              match.reason,
              ...(unresolvedTeam
                ? ['Team members are not identified. Review this team entry manually.']
                : []),
            ],
            requiresReview: unresolvedTeam,
          });
        }
      }
    } else if (type === 'timetable') {
      const contextDate =
        dateFrom(heading) ||
        dateFrom(txt(table.closest('section,article')?.querySelector('h2,h3,time'))) ||
        dateFrom(txt(doc.querySelector('time,h2')));
      const records = rows.flatMap((tr) => {
        const cells = Array.from(tr.cells);
        if (headers.some((h) => headerAliases.category.includes(h)))
          return [{ cells, values: {} as Record<string, string>, element: tr as Element }];
        // A semantic timetable grid: start time in a row, Tatami in each column heading.
        const start = timeFrom(txt(cells[0]));
        if (!start) return [];
        return cells
          .slice(1)
          .filter((c) => txt(c))
          .map((cell) => {
            const i = cells.indexOf(cell);
            const categoryAnchor = cell.querySelector('a');
            return {
              cells,
              values: {
                category:
                  txt(categoryAnchor) ||
                  txt(cell)
                    .replace(/\b(?:pool|main tree)\s*\d.*$/i, '')
                    .trim(),
                start,
                tatami: headers[i]?.match(/(?:tatami|area|mat)\s*(\w+)/i)?.[1] || '',
                pool: txt(cell).match(/pool\s*(\d+)/i)?.[1] || '',
                phase:
                  txt(cell).match(
                    /repechage|final|poolwinner tree|double.elimination|main tree pool/i,
                  )?.[0] || 'Pool',
              },
              element: cell as Element,
            };
          });
      });
      for (const record of records) {
        const get = (key: string) => record.values[key] ?? field(record.cells, headers, key);
        const categoryName = get('category');
        if (
          !categoryName ||
          /^(lunch|break|medal ceremony|line up|general session|empty slot)\b/i.test(categoryName)
        )
          continue;
        const eventDateLabel = get('date') || heading;
        let eventDateISO = dateFrom(eventDateLabel) || contextDate;
        const startTimeDisplay = get('start'),
          endTimeDisplay = get('end');
        const poolText =
          get('pool') ||
          `${get('phase')} ${categoryName.match(/pool\s*\d+(?:\s*\/\s*\d+)?/i)?.[0] || ''}`;
        const pool =
          (get('pool')
            ? poolText.match(/(?:pool\s*)?(\d+)\s*(?:\/\s*\d+)?/i)
            : poolText.match(/pool\s*(\d+)/i))?.[1] || '';
        const totalPools = get('totalPools') || poolText.match(/\/\s*(\d+)/)?.[1] || '';
        const phase =
          get('phase') ||
          (/repechage|final|poolwinner/i.test(categoryName) ? categoryName : 'Pool');
        const categoryId = get('categoryId') || categoryIdFrom(record.element, sourceUrl);
        const rowWarnings: string[] = [];
        let startDateTimeISO = '',
          endDateTimeISO = '';
        try {
          startDateTimeISO = localISO(eventDateISO, timeFrom(startTimeDisplay), eventTimezone);
          endDateTimeISO = localISO(eventDateISO, timeFrom(endTimeDisplay), eventTimezone);
          if (startDateTimeISO && eventTimezone !== context.timezone)
            eventDateISO = formatInTimeZone(startDateTimeISO, context.timezone, 'yyyy-MM-dd');
          if (startDateTimeISO && endDateTimeISO && endDateTimeISO <= startDateTimeISO) {
            endDateTimeISO = '';
            rowWarnings.push('End time is not after start time. Correct it manually.');
          }
        } catch {
          rowWarnings.push('Invalid or ambiguous date/time. Correct it manually.');
        }
        if (!eventDateISO || !startDateTimeISO)
          rowWarnings.push('Date or start time missing; capture each day or correct manually.');
        const tatami = get('tatami').replace(/^(tatami|area|mat)\s*/i, '');
        if (!tatami) rowWarnings.push('Tatami missing.');
        timetable.push({
          id: `${context.eventId}:slot:${timetable.length}:${eventDateISO}:${categoryId || normalize(categoryName)}:${pool}:${tatami}:${startDateTimeISO}`,
          categoryId,
          categoryCode: get('categoryCode'),
          categoryName,
          eventDateISO,
          eventDateLabel,
          startTimeDisplay,
          endTimeDisplay,
          startDateTimeISO,
          endDateTimeISO,
          tatami,
          pool,
          totalPools,
          phase,
          duration: get('duration'),
          entryCount: get('entryCount'),
          ...anchorLinks(record.element, sourceUrl),
          sourceUrl,
          warnings: rowWarnings,
        });
      }
    }
  }
  if (type === 'draw') {
    // Section headings delimit initial pools. Never infer a pool from a later-round appearance.
    for (const heading of Array.from(doc.querySelectorAll('h1,h2,h3,h4,h5,h6')).filter(visible)) {
      const title = txt(heading);
      if (!/pool|double.elimination|elimination|final|repechage/i.test(title) || !isInitial(title))
        continue;
      const pool =
        title.match(/(?:main tree\s*)?pool\s*(\d+)/i)?.[1] ||
        (/double.elimination|elimination|main tree|pool/i.test(title) ? '1' : '');
      if (!pool) continue;
      const content: Element[] = [];
      let next = heading.nextElementSibling;
      while (next && !/^H[1-6]$/.test(next.tagName)) {
        content.push(next);
        next = next.nextElementSibling;
      }
      const categoryName =
        heading.getAttribute('data-category') ||
        txt(heading.closest('section,article')?.querySelector('[data-category]')) ||
        txt(doc.querySelector('h1'));
      const categoryId =
        heading.getAttribute('data-category-id') || categoryIdFrom(doc.documentElement, sourceUrl);
      for (const root of content)
        for (const participant of Array.from(
          root.matches('tr,li,[data-athlete]')
            ? [root, ...root.querySelectorAll('tr,li,[data-athlete]')]
            : root.querySelectorAll('tr,li,[data-athlete]'),
        ).filter(visible)) {
          if (participant.querySelector('th')) continue;
          const dataName = participant.getAttribute('data-athlete');
          const cells = Array.from(participant.querySelectorAll('td'));
          const tableHeaders = participant.closest('table')
            ? tableData(participant.closest('table') as HTMLTableElement).headers
            : [];
          const studentName =
            dataName || (cells.length ? field(cells, tableHeaders, 'student') : txt(participant));
          if (!studentName || /^(bye|winner|loser|name)$/i.test(studentName)) continue;
          assignments.push({
            studentName,
            normalizedStudentName: normalizeName(studentName),
            categoryId,
            categoryName,
            pool,
            matchedName: studentName,
            confidence: 1,
            matchingReason: 'Exact normalized name tokens in initial main draw',
            drawUrl: sourceUrl,
            sourceHeading: title,
            warnings: [],
            requiresReview: false,
          });
        }
    }
  }
  const entryMap = new Map<string, StudentEntry>();
  for (const entry of entries) {
    const prior = entryMap.get(entry.id);
    entryMap.set(
      entry.id,
      prior
        ? {
            ...prior,
            drawUrl: prior.drawUrl || entry.drawUrl,
            participantListUrl: prior.participantListUrl || entry.participantListUrl,
            warnings: [...new Set([...prior.warnings, ...entry.warnings])],
          }
        : entry,
    );
  }
  const uniqueEntries = [...entryMap.values()];
  const uniqueAssignments = [
    ...new Map(
      assignments.map((a) => [
        `${a.normalizedStudentName}:${a.categoryId || normalize(a.categoryName)}:${a.pool}`,
        a,
      ]),
    ).values(),
  ];
  if ((type === 'entries' || type === 'participants') && !entries.length)
    warnings.push(
      'No club matches found or entries layout not recognized. Check aliases or enter rows manually.',
    );
  if (type === 'timetable' && !timetable.length)
    warnings.push('Timetable layout not recognized. Add timetable records manually.');
  if (type === 'draw' && !assignments.length)
    warnings.push(
      'Draw layout not recognized or student names unavailable. Select pools manually.',
    );
  if (type === 'unknown') warnings.push('Unknown page type. Select its type or use manual entry.');
  return {
    schemaVersion: 1,
    eventId: context.eventId,
    eventName,
    eventDays: [
      ...new Set(
        type === 'event'
          ? Array.from(doc.querySelectorAll('h1,h2,h3,p,time'))
              .filter(visible)
              .flatMap((el) =>
                [...(el.textContent || '').matchAll(/\b20\d{2}-\d{2}-\d{2}\b/g)].map((m) => m[0]),
              )
              .filter(
                (day) => !isNaN(Date.parse(day)) && new Date(day).toISOString().startsWith(day),
              )
          : timetable.map((r) => r.eventDateISO).filter(Boolean),
      ),
    ]
      .slice(0, 60)
      .sort(),
    sourceUrl,
    type,
    capturedAt: context.capturedAt || new Date().toISOString(),
    entries: uniqueEntries,
    timetable,
    assignments: uniqueAssignments,
    warnings: [...new Set(warnings)].slice(0, 40),
  };
}
