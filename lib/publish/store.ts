import { Redis } from '@upstash/redis';
import type { PublishedSchedule } from '@/lib/validation/models';
export type StoredSchedule = { schedule: PublishedSchedule; editTokenHash: string };
export interface ScheduleStore {
  get(id: string): Promise<StoredSchedule | null>;
  create(id: string, record: StoredSchedule): Promise<boolean>;
  update(id: string, oldVersion: number, record: StoredSchedule): Promise<boolean>;
  remove(id: string, hash: string): Promise<boolean>;
  limit(key: string, maximum: number, seconds: number): Promise<boolean>;
}
export class MemoryStore implements ScheduleStore {
  records = new Map<string, StoredSchedule>();
  counters = new Map<string, { count: number; until: number }>();
  async get(id: string) {
    return structuredClone(this.records.get(id) || null);
  }
  async create(id: string, record: StoredSchedule) {
    if (this.records.has(id)) return false;
    this.records.set(id, structuredClone(record));
    return true;
  }
  async update(id: string, oldVersion: number, record: StoredSchedule) {
    const old = this.records.get(id);
    if (!old || old.schedule.version !== oldVersion || old.editTokenHash !== record.editTokenHash)
      return false;
    this.records.set(id, structuredClone(record));
    return true;
  }
  async remove(id: string, hash: string) {
    const old = this.records.get(id);
    if (!old || old.editTokenHash !== hash) return false;
    return this.records.delete(id);
  }
  async limit(key: string, maximum: number, seconds: number) {
    const old = this.counters.get(key);
    const item =
      old && old.until > Date.now() ? old : { count: 0, until: Date.now() + seconds * 1000 };
    item.count++;
    this.counters.set(key, item);
    if (this.counters.size > 10000)
      for (const [k, v] of this.counters) if (v.until < Date.now()) this.counters.delete(k);
    return item.count <= maximum;
  }
}
class RedisStore implements ScheduleStore {
  constructor(private redis: Redis) {}
  private key(id: string) {
    return `ama:schedule:${id}`;
  }
  async get(id: string) {
    return this.redis.get<StoredSchedule>(this.key(id));
  }
  async create(id: string, record: StoredSchedule) {
    return (await this.redis.set(this.key(id), record, { nx: true })) === 'OK';
  }
  async update(id: string, oldVersion: number, record: StoredSchedule) {
    const result = await this.redis.eval(
      "local v=redis.call('GET',KEYS[1]); if not v then return 0 end; local r=cjson.decode(v); if r.schedule.version~=tonumber(ARGV[1]) or r.editTokenHash~=ARGV[2] then return 0 end; redis.call('SET',KEYS[1],ARGV[3]); return 1",
      [this.key(id)],
      [oldVersion, record.editTokenHash, JSON.stringify(record)],
    );
    return Number(result) === 1;
  }
  async remove(id: string, hash: string) {
    const result = await this.redis.eval(
      "local v=redis.call('GET',KEYS[1]); if not v then return 0 end; if cjson.decode(v).editTokenHash~=ARGV[1] then return 0 end; return redis.call('DEL',KEYS[1])",
      [this.key(id)],
      [hash],
    );
    return Number(result) === 1;
  }
  async limit(key: string, maximum: number, seconds: number) {
    const count = await this.redis.eval(
      "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n",
      [`ama:rate-limit:${key}`],
      [seconds],
    );
    return Number(count) <= maximum;
  }
}
const globalStore = globalThis as typeof globalThis & { __amaTestStore?: MemoryStore };
export function storeFor(request: Request): ScheduleStore {
  const host = new URL(request.url).hostname;
  if (
    process.env.AMA_E2E_STORE === '1' &&
    !process.env.VERCEL &&
    ['localhost', '127.0.0.1', '[::1]'].includes(host)
  )
    return (globalStore.__amaTestStore ||= new MemoryStore());
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN)
    throw new Error('storage-unavailable');
  return new RedisStore(
    new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
      automaticDeserialization: true,
    }),
  );
}
