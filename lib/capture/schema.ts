import { z } from 'zod';
import { assignmentSchema, entrySchema, sportUrl, timetableSchema } from '@/lib/validation/models';
export const captureType = z.enum([
  'event',
  'entries',
  'participants',
  'timetable',
  'draw',
  'unknown',
]);
export type CaptureType = z.infer<typeof captureType>;
export const capturePageSchema = z
  .object({
    schemaVersion: z.literal(1),
    eventId: z.string().regex(/^[1-9]\d{0,11}$/),
    eventName: z.string().max(300),
    sourceUrl: sportUrl,
    type: captureType,
    capturedAt: z.string().datetime(),
    entries: z.array(entrySchema).max(5000),
    timetable: z.array(timetableSchema).max(5000),
    assignments: z.array(assignmentSchema).max(5000),
    warnings: z.array(z.string().max(500)).max(40),
  })
  .strict();
export type CapturePage = z.infer<typeof capturePageSchema>;
export const captureSessionSchema = z
  .object({
    schemaVersion: z.literal(1),
    eventId: z.string().regex(/^[1-9]\d{0,11}$/),
    pages: z.array(capturePageSchema).max(200),
  })
  .strict();
export type CaptureSession = z.infer<typeof captureSessionSchema>;
