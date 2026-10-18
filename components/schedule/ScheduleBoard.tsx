'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  flexRender,
  useTable,
  tableFeatures,
  rowSortingFeature,
  columnVisibilityFeature,
  createSortedRowModel,
  sortFns,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import type { ScheduleRow } from '@/lib/validation/models';
import { chronological, conflicts, formatTime, statusOf } from '@/lib/schedule/core';
import { copyText, download, eventDetails, shareText, toICS } from '@/lib/export/files';
import { ExternalLink } from '@/components/ui/Fields';

type Props = {
  rows: ScheduleRow[];
  zone: string;
  days: string[];
  threshold?: number;
  onEdit?: (row: ScheduleRow) => void;
  onDelete?: (row: ScheduleRow) => void;
  preferences?: Record<string, string>;
  onPreferences?: (p: Record<string, string>) => void;
  changedIds?: string[];
};
const sorts = [
  ['startDateTimeISO', 'Start time'],
  ['studentName', 'Student'],
  ['categoryName', 'Category'],
  ['eventDateISO', 'Date'],
  ['endDateTimeISO', 'End time'],
  ['tatami', 'Tatami'],
  ['pool', 'Pool'],
  ['status', 'Status'],
];
const features = tableFeatures({
  rowSortingFeature,
  columnVisibilityFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns,
});
type PlannerColumn = ColumnDef<typeof features, ScheduleRow>;
export default function ScheduleBoard({
  rows,
  zone,
  days,
  threshold = 60,
  onEdit,
  onDelete,
  preferences = {},
  onPreferences,
  changedIds = [],
}: Props) {
  const [view, setView] = useState(preferences.view || 'schedule'),
    [day, setDay] = useState(preferences.day || 'All');
  const [student, setStudent] = useState(preferences.student || ''),
    [category, setCategory] = useState(preferences.category || ''),
    [tatami, setTatami] = useState(preferences.tatami || ''),
    [pool, setPool] = useState(preferences.pool || ''),
    [filterStatus, setFilterStatus] = useState(preferences.filterStatus || ''),
    [within, setWithin] = useState(preferences.within === 'true');
  const [sorting, setSorting] = useState<SortingState>([
    { id: preferences.sort || 'startDateTimeISO', desc: preferences.desc === 'true' },
  ]);
  const [now, setNow] = useState(() => Date.now()),
    [message, setMessage] = useState('');
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    onPreferences?.({
      view,
      day,
      student,
      category,
      tatami,
      pool,
      filterStatus,
      within: String(within),
      sort: sorting[0]?.id || 'startDateTimeISO',
      desc: String(sorting[0]?.desc || false),
    });
  }, [view, day, student, category, tatami, pool, filterStatus, within, sorting, onPreferences]);
  const all = useMemo(
    () => rows.map((r) => ({ ...r, status: statusOf(r, now, threshold) })).sort(chronological),
    [rows, now, threshold],
  );
  const filtered = useMemo(
    () =>
      all.filter(
        (r) =>
          (day === 'All' || r.eventDateISO === day) &&
          r.studentName.toLowerCase().includes(student.toLowerCase()) &&
          r.categoryName.toLowerCase().includes(category.toLowerCase()) &&
          (!tatami || r.tatami === tatami) &&
          (!pool || r.pool === pool) &&
          (!filterStatus || r.status === filterStatus) &&
          (!within ||
            (Date.parse(r.startDateTimeISO) >= now &&
              Date.parse(r.startDateTimeISO) <= now + threshold * 60000)),
      ),
    [all, day, student, category, tatami, pool, filterStatus, within, now, threshold],
  );
  const columns = useMemo<PlannerColumn[]>(
    () => [
      { accessorKey: 'eventDateISO', header: 'Date' },
      {
        accessorKey: 'startDateTimeISO',
        header: 'Start',
        cell: (c) => formatTime(c.row.original.startDateTimeISO, zone),
      },
      {
        accessorKey: 'endDateTimeISO',
        header: 'End',
        cell: (c) =>
          c.row.original.endDateTimeISO ? formatTime(c.row.original.endDateTimeISO, zone) : '—',
      },
      { accessorKey: 'tatami', header: 'Tatami', sortFn: 'alphanumeric' },
      {
        accessorKey: 'studentName',
        header: 'Student',
        cell: (c) =>
          c.row.original.drawUrl ? (
            <ExternalLink href={c.row.original.drawUrl}>{c.row.original.studentName}</ExternalLink>
          ) : (
            c.row.original.studentName
          ),
      },
      {
        accessorKey: 'categoryName',
        header: 'Category',
        cell: (c) =>
          c.row.original.drawUrl ? (
            <ExternalLink href={c.row.original.drawUrl}>{c.row.original.categoryName}</ExternalLink>
          ) : (
            c.row.original.categoryName
          ),
      },
      { accessorKey: 'pool', header: 'Pool', sortFn: 'alphanumeric' },
      { accessorKey: 'status', header: 'Status' },
      ...(onEdit
        ? ([
            {
              id: 'edit',
              header: 'Review',
              enableSorting: false,
              cell: (c: { row: { original: ScheduleRow } }) => (
                <button className="quiet" onClick={() => onEdit(c.row.original)}>
                  Edit {c.row.original.studentName}
                </button>
              ),
            },
          ] as PlannerColumn[])
        : []),
    ],
    [zone, onEdit],
  );
  // TanStack's sorted model is shared by desktop table and mobile cards.
  const table = useTable({
    features,
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    enableSortingRemoval: false,
  });
  const sorted = table.getRowModel().rows.map((r) => r.original);
  const conflictIds = useMemo(() => conflicts(all), [all]);
  async function action(task: () => Promise<void>, success: string) {
    try {
      await task();
      setMessage(success);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Action unavailable.');
    }
  }
  function card(row: ScheduleRow) {
    return (
      <article className={`schedule-card ${row.requiresReview ? 'needs-review' : ''}`} key={row.id}>
        <div className="card-top">
          <div>
            <span className="eyebrow">START</span>
            <strong className="start-time">{formatTime(row.startDateTimeISO, zone)}</strong>
            {row.endDateTimeISO && <small>until {formatTime(row.endDateTimeISO, zone)}</small>}
          </div>
          <div className="tatami">
            <span>TATAMI</span>
            <strong>{row.tatami || '?'}</strong>
          </div>
        </div>
        <div className="card-person">
          {row.drawUrl ? (
            <ExternalLink href={row.drawUrl}>{row.studentName} ↗</ExternalLink>
          ) : (
            row.studentName
          )}
        </div>
        <div className="card-category">
          {row.drawUrl ? (
            <ExternalLink href={row.drawUrl}>{row.categoryName} ↗</ExternalLink>
          ) : (
            row.categoryName
          )}
          {row.categoryCode && <small> · {row.categoryCode}</small>}
        </div>
        <div className="card-meta">
          <span>{row.eventDateISO || 'Date TBC'}</span>
          <span>Pool {row.pool || 'TBC'}</span>
          <span className="status">{row.status}</span>
        </div>
        {view === 'now' && row.startDateTimeISO && Date.parse(row.startDateTimeISO) > now && (
          <p>Starts in {Math.ceil((Date.parse(row.startDateTimeISO) - now) / 60000)} min</p>
        )}
        {conflictIds.has(row.id) && (
          <p className="warning">
            ↔ Coach coverage conflict: overlapping entries on different Tatamis.
          </p>
        )}
        {changedIds.includes(row.id) && <p className="updated-row">Updated in latest schedule</p>}
        {row.warnings.length > 0 && (
          <details>
            <summary>{row.requiresReview ? 'Review details' : 'Source notes'}</summary>
            <ul>
              {row.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </details>
        )}
        {row.possibleLaterRounds.length > 0 && (
          <details>
            <summary>Possible Later Rounds</summary>
            <p className="muted">Participation is not guaranteed.</p>
            {row.possibleLaterRounds.map((r) => (
              <p key={r.id}>
                {r.phase} · {r.eventDateISO} · {formatTime(r.startDateTimeISO, zone)} · Tatami{' '}
                {r.tatami}
              </p>
            ))}
          </details>
        )}
        <details className="card-actions">
          <summary>Entry actions</summary>
          <div className="actions">
            <button
              className="quiet"
              onClick={() => download('ama-entry.ics', toICS([row]), 'text/calendar')}
            >
              Add to Calendar
            </button>
            <button
              className="quiet"
              onClick={() => action(() => copyText(eventDetails([row])), 'Event details copied')}
            >
              Copy details
            </button>
            <button
              className="quiet"
              onClick={() =>
                action(() => shareText('AMA entry', eventDetails([row])), 'Event details shared')
              }
            >
              Share details
            </button>
            {onEdit && (
              <button className="quiet" onClick={() => onEdit(row)}>
                Edit {row.studentName}
              </button>
            )}
            {onDelete && (
              <button className="quiet danger" onClick={() => onDelete(row)}>
                Delete {row.studentName}
              </button>
            )}
          </div>
          <textarea aria-label="Event details to copy" readOnly value={eventDetails([row])} />
        </details>
      </article>
    );
  }
  const active = sorted.filter((r) => ['Starting now', 'Likely in progress'].includes(r.status));
  const soon = sorted.filter((r) => r.status === 'Starts soon').sort(chronological);
  const next = sorted
    .filter((r) => Date.parse(r.startDateTimeISO) > now && !r.requiresReview)
    .sort(chronological)
    .slice(0, 5);
  return (
    <section className="schedule-board" aria-label="Tournament schedule">
      <div className="view-tabs" role="tablist" aria-label="Schedule views">
        {[
          ['now', 'Now and Next'],
          ['schedule', 'All Schedule'],
          ['students', 'Students'],
        ].map(([id, name]) => (
          <button
            key={id}
            id={`tab-${id}`}
            type="button"
            role="tab"
            aria-selected={view === id}
            aria-controls="schedule-content"
            tabIndex={view === id ? 0 : -1}
            onClick={() => setView(id)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                const views = ['now', 'schedule', 'students'];
                const nextId = views[(views.indexOf(id) + (e.key === 'ArrowRight' ? 1 : 2)) % 3];
                setView(nextId);
                document.getElementById(`tab-${nextId}`)?.focus();
              }
            }}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="day-tabs" aria-label="Tournament days">
        {[
          'All',
          ...Array.from(
            new Set([...days, ...rows.map((r) => r.eventDateISO).filter(Boolean)]),
          ).sort(),
        ].map((d) => (
          <button type="button" key={d} aria-pressed={day === d} onClick={() => setDay(d)}>
            {d === 'All'
              ? 'All'
              : new Intl.DateTimeFormat('en', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  timeZone: 'UTC',
                }).format(new Date(`${d}T12:00:00Z`))}
          </button>
        ))}
      </div>
      <details className="filters panel" open>
        <summary>
          Filter & sort <span className="muted">{sorted.length} entries</span>
        </summary>
        <div className="filter-grid">
          <label className="field">
            <span>Student search</span>
            <input
              value={student}
              onChange={(e) => setStudent(e.target.value)}
              placeholder="Find a student"
            />
          </label>
          <label className="field">
            <span>Category filter</span>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="All categories"
            />
          </label>
          <label className="field">
            <span>Tatami filter</span>
            <select value={tatami} onChange={(e) => setTatami(e.target.value)}>
              <option value="">All Tatamis</option>
              {[...new Set(rows.map((r) => r.tatami).filter(Boolean))].sort().map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Pool filter</span>
            <select value={pool} onChange={(e) => setPool(e.target.value)}>
              <option value="">All pools</option>
              {[...new Set(rows.map((r) => r.pool).filter(Boolean))].sort().map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Status filter</span>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All statuses</option>
              {[
                'Starts soon',
                'Starting now',
                'Likely in progress',
                'Completed by schedule',
                'Upcoming',
                'Time not available',
                'Review required',
              ].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Sort by</span>
            <select
              value={sorting[0]?.id || 'startDateTimeISO'}
              onChange={(e) => setSorting([{ id: e.target.value, desc: false }])}
            >
              {sorts.map(([id, name]) => (
                <option value={id} key={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="quiet"
            onClick={() =>
              setSorting((s) => [{ id: s[0]?.id || 'startDateTimeISO', desc: !s[0]?.desc }])
            }
          >
            {sorting[0]?.desc ? 'Descending ↓' : 'Ascending ↑'}
          </button>
          <label className="check">
            <input type="checkbox" checked={within} onChange={(e) => setWithin(e.target.checked)} />
            Next {threshold} Minutes
          </label>
          <button
            className="quiet"
            onClick={() => {
              setStudent('');
              setCategory('');
              setTatami('');
              setPool('');
              setFilterStatus('');
              setWithin(false);
              setDay('All');
            }}
          >
            Clear filters
          </button>
        </div>
      </details>
      <p role="status" aria-live="polite">
        {message}
      </p>
      <div id="schedule-content" role="tabpanel" aria-labelledby={`tab-${view}`}>
        {view === 'schedule' && (
          <>
            <div className="mobile-cards">{sorted.map(card)}</div>
            <div className="desktop-table panel">
              <table>
                <caption className="sr-only">All tournament entries, sorted and filtered</caption>
                <thead>
                  {table.getHeaderGroups().map((g) => (
                    <tr key={g.id}>
                      {g.headers.map((h) => (
                        <th
                          key={h.id}
                          scope="col"
                          aria-sort={
                            h.column.getIsSorted() === 'asc'
                              ? 'ascending'
                              : h.column.getIsSorted() === 'desc'
                                ? 'descending'
                                : 'none'
                          }
                        >
                          {h.column.getCanSort() ? (
                            <button className="quiet" onClick={h.column.getToggleSortingHandler()}>
                              {flexRender(h.column.columnDef.header, h.getContext())}
                              {h.column.getIsSorted() === 'asc'
                                ? ' ↑'
                                : h.column.getIsSorted() === 'desc'
                                  ? ' ↓'
                                  : ''}
                            </button>
                          ) : (
                            flexRender(h.column.columnDef.header, h.getContext())
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((r) => (
                    <tr key={r.id}>
                      {r.getVisibleCells().map((c) => (
                        <td key={c.id}>{flexRender(c.column.columnDef.cell, c.getContext())}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <details className="desktop-entry-details">
              <summary>Entry details, later rounds and actions</summary>
              {sorted.map(card)}
            </details>
          </>
        )}
        {view === 'students' &&
          [...new Set(sorted.map((r) => r.studentName))].sort().map((name) => {
            const own = sorted.filter((r) => r.studentName === name).sort(chronological);
            const upcoming = own.find((r) => Date.parse(r.startDateTimeISO) >= now);
            return (
              <section key={name} className="student-group">
                <h2>
                  {name} <small>{own.length} category entries</small>
                </h2>
                <p>
                  {upcoming
                    ? `Next: ${upcoming.categoryName} · ${formatTime(upcoming.startDateTimeISO, zone)} · Tatami ${upcoming.tatami}`
                    : 'No upcoming scheduled entry'}
                </p>
                <div className="card-grid">{own.map(card)}</div>
              </section>
            );
          })}
        {view === 'now' && (
          <>
            {[
              ['Likely active now', active],
              [`Starting within ${threshold} minutes`, soon],
              ['Next five entries', next],
              ['Review required', sorted.filter((r) => r.requiresReview)],
            ].map(([title, group]) => (
              <section key={title as string} className="now-section">
                <h2>
                  {title as string} <small>{(group as ScheduleRow[]).length}</small>
                </h2>
                <div className="card-grid">{(group as ScheduleRow[]).map(card)}</div>
                {!(group as ScheduleRow[]).length && (
                  <p className="muted">No entries in this group.</p>
                )}
              </section>
            ))}
            <p className="muted">
              Status follows the published timetable. Without an end time, a 30-minute window is
              used. Check live progress with the Tatami officials.
            </p>
          </>
        )}
        {!sorted.length && (
          <div className="empty-state">
            <span aria-hidden="true">◎</span>
            <h2>{rows.length ? 'No matching entries' : 'Your Tatami plan starts here'}</h2>
            <p>
              {rows.length
                ? 'Try another day or clear your filters.'
                : 'Add a student manually or import a SportData capture.'}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
