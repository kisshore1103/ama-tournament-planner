'use client';
import { useEffect, useRef, useState } from 'react';
import ScheduleBoard from '@/components/schedule/ScheduleBoard';
import { Brand, ExternalLink } from '@/components/ui/Fields';
import { db, cacheShared } from '@/lib/db/local';
import { SchedulePoller, type RefreshState } from '@/lib/publish/poller';
import { defaults, formatTime } from '@/lib/schedule/core';
import { checkedLabel } from '@/lib/time/checked';
export default function SharedSchedule({ shareId }: { shareId: string }) {
  const poller = useRef<SchedulePoller | null>(null);
  const [state, setState] = useState<RefreshState | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const p = new SchedulePoller(
      shareId,
      {
        read: (id) => db.shared.get(id),
        write: cacheShared,
        remove: async (id) => {
          await db.shared.delete(id);
        },
      },
      setState,
      defaults.autoRefreshSeconds,
    );
    poller.current = p;
    void p.start();
    return () => p.stop();
  }, [shareId]);
  const schedule = state?.schedule;
  return (
    <div className="app-shell">
      <header className="topbar">
        <Brand />
        <span className="device-badge">Read-only coach view</span>
      </header>
      <main id="main">
        <div className="page-intro">
          <span className="eyebrow">YOUR TEAM. IN THE RIGHT PLACE.</span>
          <h1>{schedule?.eventName || 'AMA Tournament Schedule'}</h1>
          <p>{schedule?.clubDisplayName || 'Private coaching schedule'}</p>
        </div>
        <div className="shared-header">
          <div className="refresh-meta">
            {schedule && (
              <>
                <p>
                  Last updated at {formatTime(schedule.lastUpdatedAt, schedule.eventTimezone)}
                  <br />
                  <span>{formatTime(schedule.lastUpdatedAt, schedule.eventTimezone, true)}</span>
                </p>
                <p>
                  {schedule.eventDays.join(' · ')} · {schedule.eventTimezone}
                </p>
              </>
            )}
            <p>
              {checkedLabel(state?.checkedAt || '', now)}
              {state?.checkedAt && (
                <span>
                  {' '}
                  · {formatTime(state.checkedAt, schedule?.eventTimezone || defaults.eventTimezone)}
                </span>
              )}
            </p>
            <p>
              Auto-refresh:{' '}
              {state?.unavailable
                ? 'Schedule unavailable'
                : state?.offline
                  ? 'Offline'
                  : state?.paused
                    ? 'Paused while hidden'
                    : `On · Every ${defaults.autoRefreshSeconds} seconds`}
            </p>
          </div>
          <button
            disabled={!state || state.checking}
            onClick={() => void poller.current?.refresh(true)}
          >
            {state?.checking ? 'Checking for updates' : 'Refresh'}
          </button>
        </div>
        <p role="status" aria-live="polite" className="live-message">
          {state?.message || 'Loading schedule…'}
        </p>
        {state?.offline && schedule && (
          <p className="notice">
            Offline — showing the schedule last updated at{' '}
            {formatTime(schedule.lastUpdatedAt, schedule.eventTimezone)}
          </p>
        )}
        {schedule && (
          <>
            <div className="source-links">
              <ExternalLink href={schedule.timetableUrl}>Open Timetable ↗</ExternalLink>
              <ExternalLink href={schedule.tournamentUrl}>Open Tournament ↗</ExternalLink>
            </div>
            <ScheduleBoard
              rows={schedule.rows}
              zone={schedule.eventTimezone}
              days={schedule.eventDays}
              changedIds={state?.changedIds}
            />
          </>
        )}
        <footer>
          AMA · A shared plan for your coaching team.<span>Read-only · no account needed</span>
        </footer>
      </main>
    </div>
  );
}
