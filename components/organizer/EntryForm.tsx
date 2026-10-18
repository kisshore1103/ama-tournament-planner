'use client';
import type { ScheduleRow, Tournament, TimetableRecord } from '@/lib/validation/models';
import { makeRow } from '@/lib/schedule/core';
import { rowSchema, timetableSchema } from '@/lib/validation/models';
import { Field } from '@/components/ui/Fields';
import { formatInTimeZone } from 'date-fns-tz';

export default function EntryForm({
  tournament,
  row,
  timetableOnly = false,
  onSave,
  onCancel,
  onError,
}: {
  tournament: Tournament;
  row?: ScheduleRow;
  timetableOnly?: boolean;
  onSave: (value: ScheduleRow | TimetableRecord) => Promise<void>;
  onCancel: () => void;
  onError: (message: string) => void;
}) {
  return (
    <form
      className="panel entry-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const fields = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
        try {
          const value = rowSchema.parse(
            makeRow(
              { ...fields, studentName: timetableOnly ? 'Timetable record' : fields.studentName },
              tournament,
            ),
          );
          if (timetableOnly) {
            const {
              categoryId,
              categoryName,
              categoryCode,
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
              drawUrl,
              participantListUrl,
            } = value;
            await onSave(
              timetableSchema.parse({
                id: crypto.randomUUID(),
                categoryId,
                categoryName,
                categoryCode,
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
                drawUrl,
                participantListUrl,
                sourceUrl: tournament.timetableUrl,
                warnings: [],
              }),
            );
          } else await onSave(value);
        } catch (error) {
          onError(error instanceof Error ? error.message : 'Check entry values.');
        }
      }}
    >
      <div className="section-heading">
        <h2>
          {timetableOnly
            ? 'Add Timetable Record'
            : row
              ? 'Edit Student Entry'
              : 'Add Student Entry'}
        </h2>
        <button type="button" className="quiet" onClick={onCancel}>
          Close
        </button>
      </div>
      <p className="muted">
        Times use {tournament.eventTimezone}. Leave uncertain fields blank for review.
      </p>
      <div className="form-grid">
        {!timetableOnly && (
          <Field
            label="Student name"
            name="studentName"
            required
            maxLength={300}
            defaultValue={row?.studentName}
          />
        )}
        <Field
          label="Category name"
          name="categoryName"
          required
          maxLength={300}
          defaultValue={row?.categoryName}
        />
        <Field label="Category ID" name="categoryId" defaultValue={row?.categoryId} />
        <Field label="Category code" name="categoryCode" defaultValue={row?.categoryCode} />
        <Field
          label="Competition date"
          type="date"
          name="eventDate"
          defaultValue={row?.eventDateISO}
        />
        <Field
          label="Start time"
          type="time"
          name="startTime"
          defaultValue={
            row?.startDateTimeISO
              ? formatInTimeZone(row.startDateTimeISO, tournament.eventTimezone, 'HH:mm')
              : ''
          }
        />
        <Field
          label="End time"
          type="time"
          name="endTime"
          defaultValue={
            row?.endDateTimeISO
              ? formatInTimeZone(row.endDateTimeISO, tournament.eventTimezone, 'HH:mm')
              : ''
          }
        />
        <Field label="Pool" name="pool" defaultValue={row?.pool} />
        <Field label="Tatami" name="tatami" defaultValue={row?.tatami} />
        <Field label="Total pools" name="totalPools" defaultValue={row?.totalPools} />
        <Field label="Phase" name="phase" defaultValue={row?.phase || 'Pool'} />
        <Field label="Draw URL" name="drawUrl" type="url" defaultValue={row?.drawUrl} />
      </div>
      <button type="submit">
        {row ? 'Save correction' : timetableOnly ? 'Save timetable record' : 'Save student entry'}
      </button>
    </form>
  );
}
