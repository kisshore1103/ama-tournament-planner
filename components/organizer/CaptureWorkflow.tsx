'use client';
import { useState } from 'react';
import type { WorkingData, ScheduleRow } from '@/lib/validation/models';
import { links } from '@/lib/schedule/core';
import { ExternalLink, Field } from '@/components/ui/Fields';

export default function CaptureWorkflow({
  data,
  onImport,
  onTimetable,
  onEdit,
  onGenerate,
  onSave,
  onError,
}: {
  data: WorkingData;
  onImport: () => void;
  onTimetable: () => void;
  onEdit: (row: ScheduleRow) => void;
  onGenerate: () => void;
  onSave: (data: WorkingData) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [step, setStep] = useState(1);
  const steps = ['Tournament', 'Entries', 'Timetable', 'Pools & draws', 'Review', 'Ready'];
  const capturedDays = [
    ...new Set(data.timetable.map((r) => r.eventDateISO).filter(Boolean)),
  ].sort();
  const missingDays = data.tournament.eventDays.filter((d) => !capturedDays.includes(d));
  const reviews = data.rows.filter((r) => r.requiresReview);
  return (
    <section className="panel capture-workflow">
      <span className="step-label">CAPTURE / REFRESH DATA</span>
      <h2>Your route to a ready schedule</h2>
      <p>
        Open SportData in a visible tab and complete any verification normally. Capture only after
        the ordinary page loads.
      </p>
      <a href="/ama-sportdata-helper.user.js" target="_blank" rel="noopener noreferrer">
        Install SportData capture helper ↗
      </a>
      <nav className="workflow-steps" aria-label="Capture steps">
        {steps.map((name, i) => (
          <button
            key={name}
            className="secondary"
            aria-current={step === i ? 'step' : undefined}
            onClick={() => setStep(i)}
          >
            {i + 1}. {name}
          </button>
        ))}
      </nav>
      {step === 0 && (
        <div>
          <h3>1. Tournament</h3>
          <p>
            Event {data.tournament.eventId} · {data.settings.clubDisplayName} ·{' '}
            {data.settings.eventTimezone}
          </p>
          <p>Change the timezone, aliases and upcoming threshold in Settings.</p>
        </div>
      )}
      {step === 1 && (
        <div>
          <h3>2. Entries</h3>
          <p>
            {data.entries.length} captured student/category entries ·{' '}
            {Object.keys(data.overrides).length} manual entries/corrections
          </p>
          {!data.entries.length && !data.rows.length && (
            <p className="warning">
              Entries capture missing. Capture entries or add students manually.
            </p>
          )}
          <ExternalLink href={links(data.tournament.eventId).entriesUrl}>
            Open SportData Entries ↗
          </ExternalLink>
          <p>
            Tap Capture for AMA Planner, select Entries, then Capture Current Page. Copy or download
            the normalized capture.
          </p>
        </div>
      )}
      {step === 2 && (
        <div>
          <h3>3. Every timetable day</h3>
          <ExternalLink href={data.tournament.timetableUrl}>
            Open SportData Timetable ↗
          </ExternalLink>
          <p>Available timetable days: {capturedDays.join(', ') || 'none'}</p>
          {!data.timetable.length && (
            <p className="warning">
              Timetable capture missing. Add each day or enter records manually.
            </p>
          )}
          <p>Missing expected days: {missingDays.join(', ') || 'none in the current day list'}</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const day = String(f.get('day'));
              try {
                await onSave({
                  ...data,
                  tournament: {
                    ...data.tournament,
                    eventDays: [...new Set([...data.tournament.eventDays, day])].sort(),
                  },
                });
              } catch {
                onError('Could not save the expected day.');
              }
            }}
          >
            <Field label="Expected tournament day" name="day" type="date" required />
            <button type="submit" className="secondary">
              Add expected day
            </button>
          </form>
        </div>
      )}
      {step === 3 && (
        <div>
          <h3>4. Relevant pools & draws</h3>
          <p>
            Single initial timetable slots can map directly. Capture only the draws required for
            unresolved initial pools. Later rounds do not establish initial pools.
          </p>
          {reviews.length ? (
            reviews.map((r) => (
              <div className="review-item" key={r.id}>
                <strong>{r.categoryName}</strong> {r.categoryId && <span>· ID {r.categoryId}</span>}
                <p>
                  {r.studentName} ·{' '}
                  {data.assignments.some(
                    (a) =>
                      a.normalizedStudentName === r.normalizedStudentName &&
                      a.categoryId === r.categoryId,
                  )
                    ? 'Draw captured — review mapping'
                    : 'Initial pool assignment missing'}
                </p>
                <ExternalLink href={r.drawUrl || data.tournament.drawListUrl}>
                  {r.drawUrl ? 'Open Draw ↗' : 'Open draw list (exact link missing) ↗'}
                </ExternalLink>
                <button className="quiet" onClick={() => onEdit(r)}>
                  Review {r.studentName}
                </button>
              </div>
            ))
          ) : (
            <p>No unresolved pools. No additional draw captures are needed.</p>
          )}
        </div>
      )}
      {step === 4 && (
        <div>
          <h3>5. Review & correct</h3>
          {data.captureWarnings.length > 0 && (
            <ul>
              {data.captureWarnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}
          <p>
            {reviews.length} entries require review. A manual correction takes precedence over later
            captures.
          </p>
          {reviews.map((r) => (
            <div className="review-item" key={r.id}>
              <strong>
                {r.studentName} · {r.categoryName}
              </strong>
              <ul>
                {r.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
              <button className="secondary" onClick={() => onEdit(r)}>
                Correct {r.studentName}
              </button>
            </div>
          ))}
        </div>
      )}
      {step === 5 && (
        <div>
          <h3>6. Ready</h3>
          <p>
            {data.rows.length - reviews.length} resolved entries · {reviews.length} entries held for
            review.
          </p>
          <p>
            Generate and save the schedule, use Now and Next, and publish resolved rows using the
            sharing panel.
          </p>
          <button onClick={onGenerate}>Generate schedule</button>
        </div>
      )}
      <div className="actions">
        <button className="secondary" onClick={onImport}>
          Import capture or saved HTML
        </button>
        <button className="secondary" onClick={onTimetable}>
          Add Timetable Record
        </button>
        {step < 5 && <button onClick={() => setStep(step + 1)}>Next step →</button>}
      </div>
    </section>
  );
}
