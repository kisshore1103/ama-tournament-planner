import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SchedulePoller, refreshSeconds } from '@/lib/publish/poller';
import { defaults, newWorking, makeRow } from '@/lib/schedule/core';
import { publicationPayload } from '@/lib/publish/client';
import type { PublishedSchedule } from '@/lib/validation/models';
function schedule(version = 1): PublishedSchedule {
  const d = newWorking(
    'https://sportdata.org/karate/set-online/event.php?vernr=90001',
    'Cup',
    defaults,
  );
  d.rows = [
    makeRow(
      {
        studentName: 'Asha',
        categoryName: 'Kata',
        categoryId: '11',
        pool: '1',
        tatami: '7',
        eventDate: '2026-10-18',
        startTime: '09:00',
      },
      d.tournament,
    ),
  ];
  return {
    ...publicationPayload(d),
    shareId: 'a'.repeat(32),
    createdAt: '2026-10-17T12:00:00.000Z',
    lastUpdatedAt: `2026-10-17T12:0${version}:00.000Z`,
    version,
  };
}
const cache = () => ({
  read: vi.fn().mockResolvedValue(undefined),
  write: vi.fn().mockResolvedValue(undefined),
  remove: vi.fn().mockResolvedValue(undefined),
});
let running: SchedulePoller[] = [];
beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
});
afterEach(() => {
  vi.unstubAllGlobals();
  running.forEach((p) => p.stop());
  running = [];
  vi.useRealTimers();
  vi.restoreAllMocks();
});
function poller(request: ReturnType<typeof vi.fn>, storage = cache()) {
  const emit = vi.fn();
  const p = new SchedulePoller('a'.repeat(32), storage, emit, 45, request as typeof fetch);
  running.push(p);
  return { p, emit, storage };
}
describe('shared refresh', () => {
  it('calls the browser fetch with its global receiver', async () => {
    const request = vi.fn(function (this: unknown) {
      expect(this).toBe(globalThis);
      return Promise.resolve(Response.json(schedule()));
    });
    vi.stubGlobal('fetch', request);
    const p = new SchedulePoller('a'.repeat(32), cache(), () => {});
    running.push(p);
    await p.start();
    expect(p.state.schedule?.version).toBe(1);
  });
  it('bounds interval to 30–60 seconds', () => {
    expect(refreshSeconds(1)).toBe(30);
    expect(refreshSeconds(90)).toBe(60);
    expect(refreshSeconds(NaN)).toBe(45);
  });
  it('loads, caches and conditionally checks after 45 seconds', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(Response.json(schedule(), { headers: { ETag: '"v1"' } }))
      .mockResolvedValue(new Response(null, { status: 304 }));
    const { p, storage } = poller(request);
    await p.start();
    expect(storage.write).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(45000);
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[1][1].headers).toEqual({ 'If-None-Match': '"v1"' });
    expect(p.state.message).toBe('You already have the latest schedule');
    expect(p.state.schedule?.lastUpdatedAt).toBe(schedule().lastUpdatedAt);
  });
  it('pauses while hidden and immediately checks after a long foreground return', async () => {
    const request = vi.fn().mockResolvedValue(Response.json(schedule()));
    const { p } = poller(request);
    await p.start();
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(60000);
    expect(request).toHaveBeenCalledOnce();
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(0);
    expect(request).toHaveBeenCalledTimes(2);
  });
  it('pauses offline and reconnects immediately', async () => {
    const request = vi.fn().mockImplementation(() => Promise.resolve(Response.json(schedule())));
    const { p } = poller(request);
    await p.start();
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    window.dispatchEvent(new Event('offline'));
    await vi.advanceTimersByTimeAsync(90000);
    expect(request).toHaveBeenCalledOnce();
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    window.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(0);
    expect(request).toHaveBeenCalledTimes(2);
  });
  it('prevents overlapping manual requests', async () => {
    let finish!: (r: Response) => void;
    const request = vi.fn().mockReturnValue(
      new Promise<Response>((r) => {
        finish = r;
      }),
    );
    const { p } = poller(request);
    const start = p.start();
    await vi.advanceTimersByTimeAsync(0);
    await p.refresh(true);
    expect(request).toHaveBeenCalledOnce();
    finish(Response.json(schedule()));
    await start;
  });
  it('preserves the last schedule after a failed manual check and backs off', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(Response.json(schedule()))
      .mockRejectedValue(new Error('offline'));
    const { p } = poller(request);
    await p.start();
    await p.refresh(true);
    expect(p.state.schedule?.version).toBe(1);
    expect(p.state.message).toContain('Could not check for updates');
    await vi.advanceTimersByTimeAsync(45000);
    expect(request).toHaveBeenCalledTimes(2);
  });
  it('loads cached schedule while offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const request = vi.fn();
    const storage = cache();
    storage.read.mockResolvedValue({ schedule: schedule(), etag: 'cached' });
    const { p } = poller(request, storage);
    await p.start();
    expect(p.state.schedule?.version).toBe(1);
    expect(p.state.offline).toBe(true);
    expect(request).not.toHaveBeenCalled();
  });
  it('replaces updates atomically and identifies changed rows', async () => {
    const changed = schedule(2);
    changed.rows[0].tatami = '9';
    const request = vi
      .fn()
      .mockResolvedValueOnce(Response.json(schedule()))
      .mockResolvedValueOnce(Response.json(changed));
    const { p } = poller(request);
    await p.start();
    await p.refresh(true);
    expect(p.state.schedule?.rows[0].tatami).toBe('9');
    expect(p.state.changedIds).toEqual([changed.rows[0].id]);
  });
  it('clears unavailable cache and stops automatic retries', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(Response.json(schedule()))
      .mockResolvedValue(new Response(null, { status: 404 }));
    const { p, storage } = poller(request);
    await p.start();
    await p.refresh(true);
    expect(p.state.unavailable).toBe(true);
    expect(p.state.schedule).toBe(null);
    expect(storage.remove).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(300000);
    expect(request).toHaveBeenCalledTimes(2);
  });
  it('does not replace cached data with invalid server data', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(Response.json(schedule()))
      .mockResolvedValueOnce(Response.json({ rows: 'invalid' }));
    const { p } = poller(request);
    await p.start();
    await p.refresh(true);
    expect(p.state.schedule?.version).toBe(1);
  });
});
