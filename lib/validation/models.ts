import { z } from 'zod';

export const text = z
  .string()
  .trim()
  .max(300)
  .refine((v) => !/\p{Cc}/u.test(v), 'Remove control characters from this field.');
const identifier = z.string().max(6000);
export const sportUrl = z
  .string()
  .max(2000)
  .refine((v) => {
    if (!v) return true;
    try {
      const u = new URL(v);
      return (
        u.protocol === 'https:' &&
        ['sportdata.org', 'www.sportdata.org'].includes(u.hostname) &&
        !u.username &&
        !u.password &&
        !u.port &&
        ![...u.searchParams.keys()].some((key) =>
          /session|phpsessid|token|cookie|captcha|challenge|password|^sid$|^auth$/i.test(key),
        ) &&
        (u.pathname.startsWith('/karate/') ||
          (u.pathname.startsWith('/setglinc/') && u.searchParams.get('system') === 'karate'))
      );
    } catch {
      return false;
    }
  }, 'Use an HTTPS SportData Karate link.');
export const timezone = z
  .string()
  .max(100)
  .refine((v) => {
    try {
      new Intl.DateTimeFormat('en', { timeZone: v });
      return true;
    } catch {
      return false;
    }
  }, 'Enter a valid event timezone.');
const iso = z.string().datetime({ offset: true });
const optionalIso = z.union([iso, z.literal('')]);
const date = z.union([
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((v) => !isNaN(Date.parse(v)) && new Date(v).toISOString().startsWith(v)),
  z.literal(''),
]);
export const settingsSchema = z
  .object({
    clubDisplayName: text.min(1),
    clubAliases: z.array(text.min(1)).min(1).max(40),
    normalizedClubAliases: z.array(text).max(40),
    eventTimezone: timezone,
    upcomingThresholdMinutes: z.number().int().min(1).max(1440),
    defaultView: z.enum(['schedule', 'students', 'now']),
    defaultSort: text,
    autoRefreshSeconds: z.number().int().min(30).max(60),
  })
  .strict();
export type AppSettings = z.infer<typeof settingsSchema>;
export const tournamentSchema = z
  .object({
    eventId: z.string().regex(/^[1-9]\d{0,11}$/),
    tournamentUrl: sportUrl,
    eventName: text.min(1),
    timetableUrl: sportUrl,
    drawListUrl: sportUrl,
    eventTimezone: timezone,
    eventDays: z.array(date).max(60),
    createdAt: iso,
    lastCapturedAt: optionalIso,
    lastGeneratedAt: optionalIso,
  })
  .strict();
export type Tournament = z.infer<typeof tournamentSchema>;
const category = { categoryId: text, categoryCode: text, categoryName: text.min(1) };
const links = { drawUrl: sportUrl, participantListUrl: sportUrl };
const warnings = z.array(z.string().max(500)).max(40);
export const entrySchema = z
  .object({
    id: identifier,
    studentName: text.min(1),
    normalizedStudentName: text.min(1),
    clubName: text,
    country: text,
    entryType: z.enum(['individual', 'team']),
    ...category,
    ...links,
    sourceUrl: sportUrl,
    warnings,
    requiresReview: z.boolean(),
  })
  .strict();
export type StudentEntry = z.infer<typeof entrySchema>;
export const timetableSchema = z
  .object({
    id: identifier,
    ...category,
    eventDateISO: date,
    eventDateLabel: text,
    startTimeDisplay: text,
    endTimeDisplay: text,
    startDateTimeISO: optionalIso,
    endDateTimeISO: optionalIso,
    tatami: text,
    pool: text,
    totalPools: text,
    phase: text,
    duration: text.default(''),
    entryCount: text.default(''),
    ...links,
    sourceUrl: sportUrl,
    warnings,
  })
  .strict();
export type TimetableRecord = z.infer<typeof timetableSchema>;
export const assignmentSchema = z
  .object({
    studentName: text,
    normalizedStudentName: text,
    categoryId: text,
    categoryName: text.default(''),
    pool: text,
    matchedName: text,
    confidence: z.number().min(0).max(1),
    matchingReason: text,
    drawUrl: sportUrl,
    sourceHeading: text,
    warnings,
    requiresReview: z.boolean(),
  })
  .strict();
export type DrawPoolAssignment = z.infer<typeof assignmentSchema>;
export const rowSchema = entrySchema
  .omit({ country: true, sourceUrl: true })
  .extend({
    ...timetableSchema.omit({ id: true, sourceUrl: true }).shape,
    tournamentUrl: sportUrl,
    timetableUrl: sportUrl,
    status: text,
    requiresReview: z.boolean(),
    manualOverride: z.boolean(),
    possibleLaterRounds: z.array(timetableSchema).max(40),
  })
  .strict();
export type ScheduleRow = z.infer<typeof rowSchema>;
export const payloadSchema = z
  .object({
    schemaVersion: z.literal(1),
    eventId: tournamentSchema.shape.eventId,
    eventName: text.min(1),
    tournamentUrl: sportUrl,
    timetableUrl: sportUrl,
    clubDisplayName: text.min(1),
    eventTimezone: timezone,
    eventDays: z.array(date).max(60),
    rows: z.array(rowSchema).min(1).max(500),
    warnings,
  })
  .strict()
  .superRefine((v, ctx) => {
    const ids = new Set<string>();
    for (const row of v.rows) {
      const key = `${row.normalizedStudentName}|${
        row.categoryId ||
        row.categoryName
          .normalize('NFKC')
          .toLowerCase()
          .replace(/[^\p{L}\p{N}]/gu, '')
      }`;
      if (ids.has(key))
        ctx.addIssue({ code: 'custom', message: 'Duplicate Student + Category row.' });
      ids.add(key);
      if (row.requiresReview || !row.startDateTimeISO || !row.tatami || !row.pool)
        ctx.addIssue({ code: 'custom', message: 'Only resolved rows can be published.' });
    }
  });
export type PublishPayload = z.infer<typeof payloadSchema>;
export const publishedSchema = payloadSchema.safeExtend({
  shareId: z.string().regex(/^[A-Za-z0-9_-]{32}$/),
  createdAt: iso,
  lastUpdatedAt: iso,
  version: z.number().int().positive(),
});
export type PublishedSchedule = z.infer<typeof publishedSchema>;
export const recoverySchema = z
  .object({
    shareId: z.string().regex(/^[A-Za-z0-9_-]{32}$/),
    editToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  })
  .strict();
export type Recovery = z.infer<typeof recoverySchema>;
export const publishMetaSchema = recoverySchema
  .extend({
    lastUpdatedAt: iso,
    version: z.number().int().positive(),
    shareUrl: z.string().url().max(2000),
  })
  .strict();
export type PublishMeta = z.infer<typeof publishMetaSchema>;
export const workingSchema = z
  .object({
    key: z.literal('current'),
    settings: settingsSchema,
    tournament: tournamentSchema,
    entries: z.array(entrySchema).max(5000),
    timetable: z.array(timetableSchema).max(5000),
    assignments: z.array(assignmentSchema).max(5000),
    rows: z.array(rowSchema).max(5000),
    overrides: z.record(z.string(), rowSchema),
    excluded: z.array(identifier).max(5000),
    publish: publishMetaSchema.nullable(),
    captureWarnings: warnings,
    preferences: z.record(z.string(), z.string().max(300)),
  })
  .strict();
export type WorkingData = z.infer<typeof workingSchema>;
