import type {
  StudentEntry,
  TimetableRecord,
  WorkingData,
  ScheduleRow,
  DrawPoolAssignment,
} from '@/lib/validation/models';
import { makeRow, normalize, normalizeName, rowId, chronological } from './core';
import { laterPhase } from '@/lib/parser/dom';

function categoryMatches(
  entry: Pick<StudentEntry, 'categoryId' | 'categoryName'>,
  candidate: Pick<TimetableRecord, 'categoryId' | 'categoryName'>,
) {
  return entry.categoryId
    ? entry.categoryId === candidate.categoryId
    : normalize(entry.categoryName) === normalize(candidate.categoryName);
}
export function selectPool(entry: StudentEntry, assignments: DrawPoolAssignment[]) {
  const matches = assignments.filter(
    (a) =>
      categoryMatches(entry, a) &&
      normalizeName(entry.studentName) === a.normalizedStudentName &&
      !a.requiresReview,
  );
  const pools = new Set(matches.map((a) => a.pool).filter(Boolean));
  return {
    pool: pools.size === 1 ? [...pools][0] : '',
    drawUrl: matches[0]?.drawUrl || '',
    matchingReason:
      pools.size === 1
        ? 'Exact normalized athlete name in one initial pool'
        : pools.size > 1
          ? 'Athlete name appears in different initial pools; choose manually.'
          : 'Student not found in an initial draw. Capture the relevant draw or choose the pool manually.',
    requiresReview: pools.size !== 1,
  };
}
export function generateSchedule(data: WorkingData): WorkingData {
  const rows: ScheduleRow[] = [];
  const entries = [
    ...new Map(
      data.entries.map((e) => [
        rowId(data.tournament.eventId, e.studentName, e.categoryId, e.categoryName),
        e,
      ]),
    ).values(),
  ];
  for (const entry of entries) {
    const id = rowId(
      data.tournament.eventId,
      entry.studentName,
      entry.categoryId,
      entry.categoryName,
    );
    if (data.excluded.includes(id)) continue;
    const allSlots = data.timetable.filter((r) => categoryMatches(entry, r));
    const initial = allSlots.filter((r) => !laterPhase(r.phase) && !/semi.?final/i.test(r.phase));
    const later = allSlots.filter((r) => laterPhase(r.phase) || /semi.?final/i.test(r.phase));
    const assignment = selectPool(entry, data.assignments);
    let slot: TimetableRecord | undefined;
    if (initial.length === 1 && (!initial[0].totalPools || Number(initial[0].totalPools) <= 1))
      slot = initial[0];
    else if (assignment.pool) {
      const selected = initial.filter((r) => r.pool === assignment.pool);
      if (selected.length === 1) slot = selected[0];
    }
    const base = makeRow(
      {
        studentName: entry.studentName,
        categoryName: entry.categoryName,
        categoryId: entry.categoryId,
        categoryCode: entry.categoryCode,
        clubName: entry.clubName,
        entryType: entry.entryType,
      },
      data.tournament,
    );
    const rowWarnings = [...entry.warnings];
    if (!entry.categoryId)
      rowWarnings.push('Category ID unavailable: matched by normalized category name.');
    if (!allSlots.length)
      rowWarnings.push(
        'Category not found in timetable. Capture missing days or add a timetable record.',
      );
    else if (!initial.length)
      rowWarnings.push('Only later rounds captured; initial pool timetable missing.');
    else if (!slot)
      rowWarnings.push(
        assignment.requiresReview
          ? assignment.matchingReason
          : 'Pool/Tatami/date mapping ambiguous. Check all timetable days and correct manually.',
      );
    const row: ScheduleRow = {
      ...base,
      ...(slot
        ? {
            eventDateISO: slot.eventDateISO,
            eventDateLabel: slot.eventDateLabel,
            startTimeDisplay: slot.startTimeDisplay,
            endTimeDisplay: slot.endTimeDisplay,
            startDateTimeISO: slot.startDateTimeISO,
            endDateTimeISO: slot.endDateTimeISO,
            tatami: slot.tatami,
            pool: slot.pool || '1',
            totalPools: slot.totalPools,
            phase: slot.phase,
            duration: slot.duration,
            entryCount: slot.entryCount,
          }
        : {}),
      id,
      drawUrl: entry.drawUrl || assignment.drawUrl || slot?.drawUrl || '',
      participantListUrl: entry.participantListUrl || slot?.participantListUrl || '',
      possibleLaterRounds: later,
      manualOverride: false,
      warnings: [...new Set([...rowWarnings, ...(slot?.warnings || [])])],
      requiresReview:
        entry.requiresReview ||
        !slot ||
        !slot.startDateTimeISO ||
        !slot.tatami ||
        (!slot.pool && Number(slot.totalPools) > 1),
      status: 'Upcoming',
    };
    if (row.requiresReview) row.status = 'Review required';
    rows.push(row);
  }
  const merged = new Map(rows.map((r) => [r.id, r]));
  for (const override of Object.values(data.overrides))
    if (!data.excluded.includes(override.id))
      merged.set(override.id, { ...override, manualOverride: true });
  const result = [...merged.values()].sort(chronological);
  return {
    ...data,
    rows: result,
    tournament: {
      ...data.tournament,
      eventDays: [
        ...new Set(
          [
            ...data.tournament.eventDays,
            ...data.timetable.map((r) => r.eventDateISO),
            ...result.map((r) => r.eventDateISO),
          ].filter(Boolean),
        ),
      ].sort(),
      lastGeneratedAt: new Date().toISOString(),
    },
  };
}
