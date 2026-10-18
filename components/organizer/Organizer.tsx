'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { loadWorking, replaceWorking, saveWorking } from '@/lib/db/local';
import {
  defaults,
  chronological,
  formatTime,
  newWorking,
  normalizeClub,
} from '@/lib/schedule/core';
import {
  settingsSchema,
  type ScheduleRow,
  type WorkingData,
  type TimetableRecord,
  type PublishMeta,
} from '@/lib/validation/models';
import { copyText, download, eventDetails, importRows, toCSV, toICS } from '@/lib/export/files';
import { Brand, ExternalLink, Field } from '@/components/ui/Fields';
import ScheduleBoard from '@/components/schedule/ScheduleBoard';
import EntryForm from './EntryForm';
import CaptureWorkflow from './CaptureWorkflow';
import SharingPanel from './SharingPanel';
import { unpublish } from '@/lib/publish/client';
import { importCapture, isCapture } from '@/lib/capture/import';
import { generateSchedule, addTimetable, updateSettings } from '@/lib/schedule/mapping';

export default function Organizer() {
  const [data, setData] = useState<WorkingData | null>(null),
    [ready, setReady] = useState(false),
    [message, setMessage] = useState(''),
    [offline, setOffline] = useState(false),
    [panel, setPanel] = useState(''),
    [editing, setEditing] = useState<ScheduleRow | undefined>(),
    [importText, setImportText] = useState(''),
    [changing, setChanging] = useState(false);
  const current = useRef<WorkingData | null>(null),
    writeQueue = useRef(Promise.resolve()),
    notified = useRef(new Set<string>());
  const [notifications, setNotifications] = useState(false);
  const [sourceUrl, setSourceUrl] = useState('');
  const [cloudBusy, setCloudBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    loadWorking()
      .then((d) => {
        current.current = d;
        setData(d);
      })
      .catch(() =>
        setMessage(
          'Could not open local storage. Allow browser storage and reload. Existing data has not been removed.',
        ),
      )
      .finally(() => setReady(true));
    const online = () => setOffline(!navigator.onLine);
    online();
    window.addEventListener('online', online);
    window.addEventListener('offline', online);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', online);
    };
  }, []);
  const persist = useCallback(async (next: WorkingData) => {
    const task = writeQueue.current.catch(() => undefined).then(() => saveWorking(next));
    writeQueue.current = task;
    await task;
    current.current = next;
    setData(next);
  }, []);
  const preferences = useCallback(
    (p: Record<string, string>) => {
      const d = current.current;
      if (d && JSON.stringify(d.preferences) !== JSON.stringify(p))
        void persist({ ...d, preferences: p }).catch(() =>
          setMessage('Could not save view preferences.'),
        );
    },
    [persist],
  );
  const setMetadata = useCallback(
    async (meta: PublishMeta | null) => {
      if (current.current) await persist({ ...current.current, publish: meta });
    },
    [persist],
  );
  useEffect(() => {
    if (!notifications || !data) return;
    const check = () => {
      const now = Date.now();
      data.rows.forEach((r) => {
        const diff = Date.parse(r.startDateTimeISO) - now;
        if (
          !r.requiresReview &&
          diff > 0 &&
          diff <= data.settings.upcomingThresholdMinutes * 60000 &&
          !notified.current.has(r.id)
        ) {
          notified.current.add(r.id);
          new Notification(`${r.studentName} · Tatami ${r.tatami}`, {
            body: `${r.categoryName} at ${formatTime(r.startDateTimeISO, data.settings.eventTimezone)}`,
          });
        }
      });
    };
    check();
    const timer = setInterval(check, 30000);
    return () => clearInterval(timer);
  }, [data, notifications]);
  async function saveEntry(value: ScheduleRow | TimetableRecord) {
    if (!data) return;
    if ('studentName' in value) {
      value = {
        ...value,
        clubName: data.settings.clubDisplayName,
        possibleLaterRounds:
          editing?.categoryId === value.categoryId
            ? editing.possibleLaterRounds
            : value.possibleLaterRounds,
      };
      if (data.rows.some((r) => r.id === value.id && r.id !== editing?.id))
        throw new Error('Duplicate Student + Category. Edit the existing row.');
      const rows = [...data.rows.filter((r) => r.id !== editing?.id), value];
      const overrides = { ...data.overrides };
      if (editing) delete overrides[editing.id];
      overrides[value.id] = value;
      await persist({
        ...data,
        rows,
        overrides,
        excluded: [
          ...new Set([
            ...data.excluded.filter((id) => id !== value.id),
            ...(editing && editing.id !== value.id ? [editing.id] : []),
          ]),
        ],
        tournament: {
          ...data.tournament,
          eventDays: [...new Set(rows.map((r) => r.eventDateISO).filter(Boolean))].sort(),
          lastGeneratedAt: new Date().toISOString(),
        },
      });
    } else {
      await persist(addTimetable(data, value));
    }
    setPanel('');
    setEditing(undefined);
    setMessage('Saved on this device.');
  }
  async function doImport() {
    if (!data) return;
    try {
      if (isCapture(importText) || /^\s*</.test(importText)) {
        const next = importCapture(importText, data, sourceUrl || undefined);
        await persist(next);
        setMessage(
          `Capture imported. ${next.rows.length} entries generated; ${next.rows.filter((r) => r.requiresReview).length} require review.`,
        );
        setImportText('');
        return;
      }
      const imported = importRows(importText, data.tournament);
      const ids = new Set<string>();
      for (const row of imported) {
        if (ids.has(row.id))
          throw new Error(`Duplicate row: ${row.studentName} / ${row.categoryName}`);
        ids.add(row.id);
      }
      const map = new Map(data.rows.map((r) => [r.id, r]));
      imported.forEach((r) => map.set(r.id, r));
      const rows = [...map.values()];
      await persist({
        ...data,
        rows,
        overrides: { ...data.overrides, ...Object.fromEntries(imported.map((r) => [r.id, r])) },
        tournament: {
          ...data.tournament,
          eventDays: [
            ...new Set(
              [...data.tournament.eventDays, ...rows.map((r) => r.eventDateISO)].filter(Boolean),
            ),
          ].sort(),
          lastGeneratedAt: new Date().toISOString(),
        },
      });
      setMessage(`Imported ${imported.length} entries. Existing valid rows kept.`);
      setImportText('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Import failed. Existing data kept.');
    }
  }
  if (!ready)
    return (
      <main id="main" className="app-shell">
        <Brand />
        <p role="status">Loading your local tournament…</p>
      </main>
    );
  const next = data?.rows
    .filter((r) => !r.requiresReview && Date.parse(r.startDateTimeISO) > now)
    .sort(chronological)[0];
  return (
    <div className="app-shell">
      <header className="topbar">
        <Brand />
        <span className="device-badge">{offline ? '● Offline' : '● Organizer · this device'}</span>
      </header>
      <main id="main">
        <div className="page-intro">
          <span className="eyebrow">THE COACH’S CORNER</span>
          <h1>
            {data && !changing ? data.tournament.eventName : 'Every student.\nOne clear plan.'}
          </h1>
          <p>
            {data && !changing
              ? `${data.settings.clubDisplayName} · ${data.settings.eventTimezone}`
              : 'Know who’s next, when they start, and exactly where to be.'}
          </p>
        </div>
        {offline && (
          <p className="notice">
            Offline — your saved working schedule is available on this device.
          </p>
        )}
        <p className="live-message" role="status" aria-live="polite">
          {message}
        </p>
        {(!data || changing || panel === 'settings') && (
          <form
            className="panel setup"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
              try {
                const aliases = f.aliases
                  .split('\n')
                  .map((s) => s.trim())
                  .filter(Boolean);
                const settings = settingsSchema.parse({
                  ...defaults,
                  clubDisplayName: f.club,
                  clubAliases: aliases,
                  normalizedClubAliases: aliases.map(normalizeClub),
                  eventTimezone: f.zone,
                  upcomingThresholdMinutes: Number(f.threshold),
                });
                let working: WorkingData;
                if (panel === 'settings' && data) {
                  working = updateSettings(data, settings, f.name);
                  await persist(working);
                } else {
                  working = newWorking(f.url, f.name, settings);
                  await replaceWorking(working);
                  current.current = working;
                  setData(working);
                }
                setChanging(false);
                setPanel('');
                setMessage('Tournament saved locally. Add students or capture SportData pages.');
              } catch (error) {
                setMessage(
                  error instanceof Error ? error.message : 'Check your tournament settings.',
                );
              }
            }}
          >
            <span className="step-label">01 / TOURNAMENT SETUP</span>
            <h2>{panel === 'settings' ? 'Tournament settings' : 'Set up your tournament'}</h2>
            {panel !== 'settings' && (
              <Field
                label="SportData tournament URL"
                name="url"
                type="url"
                placeholder="https://www.sportdata.org/karate/…?vernr=…"
                required
              />
            )}
            <Field
              label="Tournament name"
              name="name"
              defaultValue={changing ? '' : data?.tournament.eventName}
              placeholder="Give your tournament a name"
            />
            <div className="form-grid">
              <Field
                label="Club name"
                name="club"
                required
                defaultValue={data?.settings.clubDisplayName || defaults.clubDisplayName}
              />
              <Field
                label="Event timezone"
                name="zone"
                required
                defaultValue={data?.settings.eventTimezone || defaults.eventTimezone}
              />
              <Field
                label="Upcoming threshold (minutes)"
                name="threshold"
                type="number"
                min={1}
                max={1440}
                required
                defaultValue={data?.settings.upcomingThresholdMinutes || 60}
              />
            </div>
            <label className="field">
              <span>Club aliases (one per line; reorder by moving lines)</span>
              <textarea
                name="aliases"
                required
                rows={4}
                defaultValue={(data?.settings.clubAliases || defaults.clubAliases).join('\n')}
              />
            </label>
            <div className="actions">
              <button type="submit">
                {panel === 'settings' ? 'Save settings' : 'Save tournament'} →
              </button>
              {data && (
                <button
                  className="quiet"
                  type="button"
                  onClick={() => {
                    setChanging(false);
                    setPanel('');
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}
        {data && !changing && (
          <>
            <div className="summary-grid">
              <div>
                <span>STUDENTS</span>
                <strong>{new Set(data.rows.map((r) => r.normalizedStudentName)).size}</strong>
              </div>
              <div>
                <span>ENTRIES</span>
                <strong>{data.rows.length}</strong>
              </div>
              <div>
                <span>TO REVIEW</span>
                <strong>{data.rows.filter((r) => r.requiresReview).length}</strong>
              </div>
              <div className="next-summary">
                <span>NEXT UP</span>
                <strong>{next?.studentName || 'Ready when you are'}</strong>
                <small>
                  {next
                    ? `${formatTime(next.startDateTimeISO, data.settings.eventTimezone)} · Tatami ${next.tatami}`
                    : 'No upcoming resolved entries'}
                </small>
              </div>
            </div>
            <p className="muted timestamps">
              {data.tournament.eventDays.join(' · ') || 'Dates will appear after entry'}
              {data.tournament.lastCapturedAt &&
                ` · Captured locally: ${formatTime(data.tournament.lastCapturedAt, data.settings.eventTimezone, true)}`}
              {data.publish &&
                ` · Published: ${formatTime(data.publish.lastUpdatedAt, data.settings.eventTimezone, true)}`}
            </p>
            <div className="toolbar">
              <button
                onClick={() => {
                  setEditing(undefined);
                  setPanel(panel === 'entry' ? '' : 'entry');
                }}
              >
                + Add Student Entry
              </button>
              <button
                className="secondary"
                onClick={() => setPanel(panel === 'capture' ? '' : 'capture')}
              >
                Capture / Refresh Data
              </button>
              <button
                className="secondary"
                onClick={() => setPanel(panel === 'import' ? '' : 'import')}
              >
                Import / Export
              </button>
              <button
                className="quiet"
                onClick={() => setPanel(panel === 'settings' ? '' : 'settings')}
              >
                Settings
              </button>
            </div>
            <div className="source-links">
              <ExternalLink href={data.tournament.tournamentUrl}>Open Tournament ↗</ExternalLink>
              <ExternalLink href={data.tournament.timetableUrl}>Open Timetable ↗</ExternalLink>
              <span>Event {data.tournament.eventId}</span>
            </div>
            {(panel === 'entry' || panel === 'timetable') && (
              <EntryForm
                key={editing?.id || panel}
                tournament={data.tournament}
                row={editing}
                timetableOnly={panel === 'timetable'}
                onSave={saveEntry}
                onCancel={() => setPanel('')}
                onError={setMessage}
              />
            )}
            {panel === 'capture' && (
              <CaptureWorkflow
                data={data}
                onImport={() => setPanel('import')}
                onTimetable={() => setPanel('timetable')}
                onEdit={(r) => {
                  setEditing(r);
                  setPanel('entry');
                }}
                onGenerate={() => {
                  void persist(generateSchedule(data))
                    .then(() => setMessage('Schedule generated and saved locally.'))
                    .catch(() => setMessage('Generation failed. Existing data kept.'));
                }}
                onSave={persist}
                onError={setMessage}
              />
            )}
            {panel === 'import' && (
              <section className="panel">
                <h2>Import / Export</h2>
                <p className="muted">
                  Import normalized capture JSON, schedule JSON, saved HTML, or CSV/TSV/plain text
                  with a studentName,categoryName header. Incomplete entries stay in review.
                </p>
                <label className="field">
                  <span>Import text</span>
                  <textarea
                    rows={6}
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder="studentName,categoryName,pool,tatami,eventDate,startTime"
                  />
                </label>
                <Field
                  label="Capture source URL (for saved HTML)"
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder={data.tournament.tournamentUrl}
                />
                <label className="field">
                  <span>Import file</span>
                  <input
                    type="file"
                    accept=".json,.csv,.tsv,.txt,.html,.htm"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 5000000) setMessage('File is too large (maximum 5 MB).');
                        else setImportText(await file.text());
                      }
                    }}
                  />
                </label>
                <button onClick={doImport}>Import data</button>
                <div className="export-actions actions">
                  <button
                    className="secondary"
                    onClick={() =>
                      download(
                        'tournament.ama-schedule.json',
                        JSON.stringify(
                          { schemaVersion: 1, eventId: data.tournament.eventId, rows: data.rows },
                          null,
                          2,
                        ),
                      )
                    }
                  >
                    Export schedule JSON
                  </button>
                  <button
                    className="secondary"
                    onClick={() => download('ama-schedule.csv', toCSV(data.rows), 'text/csv')}
                  >
                    Export CSV
                  </button>
                  <button
                    className="secondary"
                    onClick={() => download('ama-schedule.ics', toICS(data.rows), 'text/calendar')}
                  >
                    Download ICS
                  </button>
                  <button className="secondary" onClick={() => window.print()}>
                    Print schedule
                  </button>
                  <button
                    className="secondary"
                    onClick={() =>
                      copyText(eventDetails(data.rows))
                        .then(() => setMessage('Schedule summary copied'))
                        .catch((e) => setMessage(e.message))
                    }
                  >
                    Copy WhatsApp summary
                  </button>
                </div>
                <label className="field">
                  <span>Schedule summary to copy</span>
                  <textarea readOnly value={eventDetails(data.rows)} />
                </label>
              </section>
            )}
            <ScheduleBoard
              rows={data.rows}
              zone={data.settings.eventTimezone}
              days={data.tournament.eventDays}
              threshold={data.settings.upcomingThresholdMinutes}
              preferences={data.preferences}
              onPreferences={preferences}
              onEdit={(r) => {
                setEditing(r);
                setPanel('entry');
                window.scrollTo({ top: 0, behavior: 'instant' });
              }}
              onDelete={(r) => {
                if (confirm(`Delete ${r.studentName} / ${r.categoryName}?`)) {
                  const overrides = { ...data.overrides };
                  delete overrides[r.id];
                  void persist({
                    ...data,
                    rows: data.rows.filter((v) => v.id !== r.id),
                    overrides,
                    excluded: [...data.excluded, r.id],
                  }).catch(() => setMessage('Could not delete the entry.'));
                }
              }}
            />
            <SharingPanel
              data={data}
              onMetadata={setMetadata}
              onRecovery={persist}
              onBusy={setCloudBusy}
              onMessage={setMessage}
            />
            <section className="panel utility-panel">
              <h2>Tournament tools</h2>
              <div className="actions">
                <button className="secondary" onClick={() => setPanel('timetable')}>
                  Add Timetable Record
                </button>
                <button
                  className="quiet"
                  onClick={async () => {
                    if (!('Notification' in window))
                      return setMessage('This browser does not support notifications.');
                    try {
                      const permission = await Notification.requestPermission();
                      setNotifications(permission === 'granted');
                      setMessage(
                        permission === 'granted'
                          ? 'Notifications on while this page is open.'
                          : 'Notifications were not enabled.',
                      );
                    } catch {
                      setMessage('Notifications unavailable in this browser.');
                    }
                  }}
                >
                  Enable open-app notifications
                </button>
                <button
                  className="quiet danger"
                  disabled={cloudBusy}
                  onClick={async () => {
                    if (
                      confirm(
                        'Change tournament? Previous entries, captures, corrections and schedule will be removed. No history is kept.',
                      )
                    ) {
                      try {
                        if (data.publish) {
                          await unpublish(data.publish);
                          await setMetadata(null);
                        }
                        setChanging(true);
                        setPanel('');
                      } catch (error) {
                        setMessage(
                          error instanceof Error
                            ? error.message
                            : 'Could not invalidate the old share link. Current tournament kept.',
                        );
                      }
                    }
                  }}
                >
                  Change Tournament
                </button>
              </div>
              <p className="muted">
                Your working data stays on this device until you choose to publish. Notifications
                require this page to remain open.
              </p>
            </section>
          </>
        )}
        <footer>
          <strong>AMA</strong> Built for the moments between matches.
          <span>Personal tournament planner · no account needed</span>
        </footer>
      </main>
    </div>
  );
}
