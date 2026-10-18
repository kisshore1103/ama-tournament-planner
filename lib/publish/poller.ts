import { publishedSchema, type PublishedSchedule } from '@/lib/validation/models';
export const unavailableMessage =
  'This tournament schedule is no longer available. Please request the latest link from the AMA coach.';
export type RefreshState = {
  schedule: PublishedSchedule | null;
  etag: string;
  checkedAt: string;
  message: string;
  checking: boolean;
  offline: boolean;
  paused: boolean;
  unavailable: boolean;
  changedIds: string[];
};
type Cache = {
  read: (id: string) => Promise<{ schedule: PublishedSchedule; etag: string } | undefined>;
  write: (schedule: PublishedSchedule, etag: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
};
export function refreshSeconds(value: number) {
  return Math.max(30, Math.min(60, Number.isFinite(value) ? value : 45));
}
export class SchedulePoller {
  state: RefreshState = {
    schedule: null,
    etag: '',
    checkedAt: '',
    message: 'Loading schedule…',
    checking: false,
    offline: false,
    paused: false,
    unavailable: false,
    changedIds: [],
  };
  private active = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private controller: AbortController | undefined;
  private failures = 0;
  private hiddenAt = 0;
  readonly interval: number;
  constructor(
    private id: string,
    private cache: Cache,
    private emit: (state: RefreshState) => void,
    seconds = 45,
    private request: typeof fetch = (input, init) => globalThis.fetch(input, init),
  ) {
    this.interval = refreshSeconds(seconds) * 1000;
  }
  private update(values: Partial<RefreshState>) {
    if (!this.active) return;
    this.state = { ...this.state, ...values };
    this.emit(this.state);
  }
  private clear() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
  }
  private schedule() {
    this.clear();
    if (!this.active || this.state.unavailable || document.hidden || !navigator.onLine) return;
    this.timer = setTimeout(
      () => void this.refresh(),
      Math.min(300000, this.interval * 2 ** this.failures),
    );
  }
  private visibility = () => {
    if (document.hidden) {
      this.hiddenAt = Date.now();
      this.clear();
      this.update({ paused: true });
    } else {
      this.update({ paused: false });
      if (!this.state.schedule || Date.now() - this.hiddenAt > 30000) void this.refresh();
      else this.schedule();
    }
  };
  private offline = () => {
    this.clear();
    this.update({
      offline: true,
      message: this.state.schedule
        ? 'Offline — showing the schedule last updated at its publication time.'
        : 'Offline. Connect once to load this schedule.',
    });
  };
  private online = () => {
    this.update({ offline: false, message: 'Reconnecting…' });
    void this.refresh();
  };
  async start() {
    this.active = true;
    document.addEventListener('visibilitychange', this.visibility);
    window.addEventListener('offline', this.offline);
    window.addEventListener('online', this.online);
    this.update({ offline: !navigator.onLine, paused: document.hidden });
    try {
      const cached = await this.cache.read(this.id);
      if (cached && this.active) {
        const valid = publishedSchema.safeParse(cached.schedule);
        if (valid.success && valid.data.shareId === this.id)
          this.update({
            schedule: valid.data,
            etag: cached.etag,
            message: 'Showing the last available schedule while checking.',
          });
      }
    } catch {
      this.update({ message: 'Local cache unavailable. Checking online…' });
    }
    if (!this.active) return;
    if (!navigator.onLine) this.offline();
    else if (!document.hidden) await this.refresh();
  }
  stop() {
    this.active = false;
    this.clear();
    this.controller?.abort();
    document.removeEventListener('visibilitychange', this.visibility);
    window.removeEventListener('offline', this.offline);
    window.removeEventListener('online', this.online);
  }
  async refresh(manual = false) {
    if (
      !this.active ||
      this.state.checking ||
      (!manual && (document.hidden || !navigator.onLine || this.state.unavailable))
    )
      return;
    this.clear();
    this.controller = new AbortController();
    const timeout = setTimeout(() => this.controller?.abort(), 12000);
    this.update({ checking: true, message: 'Checking for updates' });
    try {
      const response = await this.request(`/api/schedules/${this.id}`, {
        headers: this.state.etag && this.state.schedule ? { 'If-None-Match': this.state.etag } : {},
        signal: this.controller.signal,
        cache: 'no-store',
      });
      if (!this.active) return;
      if (response.status === 404 || response.status === 410) {
        this.update({ schedule: null, etag: '', unavailable: true, message: unavailableMessage });
        try {
          await this.cache.remove(this.id);
        } catch {}
        return;
      }
      if (response.status === 304) {
        if (!this.state.schedule) throw new Error('cache-missing');
        this.failures = 0;
        this.update({
          checkedAt: new Date().toISOString(),
          message: 'You already have the latest schedule',
          offline: false,
        });
        return;
      }
      if (!response.ok) throw new Error('temporary-error');
      const schedule = publishedSchema.parse(await response.json());
      if (schedule.shareId !== this.id) throw new Error('wrong-schedule');
      const old = this.state.schedule;
      const oldRows = new Map(old?.rows.map((r) => [r.id, JSON.stringify(r)]) || []);
      const changedIds = old
        ? schedule.rows.filter((r) => oldRows.get(r.id) !== JSON.stringify(r)).map((r) => r.id)
        : [];
      const etag = response.headers.get('etag') || '';
      this.failures = 0;
      this.update({
        schedule,
        etag,
        checkedAt: new Date().toISOString(),
        message:
          old && old.version === schedule.version
            ? 'You already have the latest schedule'
            : 'Schedule updated',
        offline: false,
        unavailable: false,
        changedIds,
      });
      try {
        await this.cache.write(schedule, etag);
      } catch {
        this.update({ message: 'Schedule updated. Offline caching unavailable in this browser.' });
      }
    } catch {
      if (!this.active) return;
      this.failures = Math.min(this.failures + 1, 3);
      this.update({
        offline: !navigator.onLine,
        message: manual
          ? 'Could not check for updates. The last available schedule is still shown.'
          : 'Unable to check for updates. Showing the last available schedule.',
      });
    } finally {
      clearTimeout(timeout);
      this.controller = undefined;
      if (this.active) {
        this.update({ checking: false });
        this.schedule();
      }
    }
  }
}
