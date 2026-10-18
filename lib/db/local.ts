import Dexie, { type EntityTable } from 'dexie';
import {
  workingSchema,
  publishedSchema,
  type WorkingData,
  type PublishedSchedule,
} from '@/lib/validation/models';
export class PlannerDB extends Dexie {
  current!: EntityTable<WorkingData, 'key'>;
  shared!: EntityTable<{ shareId: string; schedule: PublishedSchedule; etag: string }, 'shareId'>;
  constructor(name = 'ama-tatami-planner') {
    super(name);
    this.version(1).stores({ current: 'key', shared: 'shareId' });
  }
}
export const db = new PlannerDB();
export async function loadWorking() {
  const data = await db.current.get('current');
  return data ? workingSchema.parse(data) : null;
}
export async function saveWorking(data: WorkingData) {
  const valid = workingSchema.parse(data);
  await db.transaction('rw', db.current, async () => {
    await db.current.clear();
    await db.current.put(valid);
  });
}
export async function replaceWorking(data: WorkingData) {
  await db.transaction('rw', db.current, db.shared, async () => {
    await db.current.clear();
    await db.shared.clear();
    await db.current.put(workingSchema.parse(data));
  });
}
export async function cacheShared(schedule: PublishedSchedule, etag: string) {
  await db.shared.put({
    shareId: schedule.shareId,
    schedule: publishedSchema.parse(schedule),
    etag,
  });
}
