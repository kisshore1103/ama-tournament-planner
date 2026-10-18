import { payloadSchema, publishedSchema, type PublishPayload } from '@/lib/validation/models';
import { normalizeName, normalize, parseTournamentUrl, rowId } from '@/lib/schedule/core';
import { formatInTimeZone } from 'date-fns-tz';
import { credentials, hashToken, validToken } from '@/lib/security/tokens';
import { storeFor, type ScheduleStore, type StoredSchedule } from './store';

export const unavailable =
  'This tournament schedule is no longer available. Please request the latest link from the AMA coach.';
class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
const headers = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Referrer-Policy': 'no-referrer',
};
function response(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { ...headers, ...extra } });
}
function originCheck(request: Request) {
  if (
    request.headers.get('origin') !== new URL(request.url).origin ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  )
    throw new ApiError(403, 'Open the organizer on this site before making changes.');
}
async function rateLimit(request: Request, store: ScheduleStore, scope: string, id = '') {
  const ip = process.env.VERCEL
    ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim() || 'unknown'
    : 'local';
  if (
    !(await store.limit(
      `${scope}:${hashToken(ip).slice(0, 24)}`,
      scope === 'create' ? 8 : scope === 'read' ? 240 : 60,
      60,
    ))
  )
    throw new ApiError(429, 'Rate limit reached. Wait a minute and try again.');
  if (id && !(await store.limit(`${scope}:schedule:${id}`, scope === 'read' ? 240 : 60, 60)))
    throw new ApiError(429, 'Rate limit reached. Wait a minute and try again.');
}
export async function readPayload(request: Request): Promise<PublishPayload> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
    throw new ApiError(415, 'Use a JSON schedule.');
  const limit = Math.min(
    500000,
    Math.max(1024, Number(process.env.MAX_PUBLISH_PAYLOAD_BYTES) || 500000),
  );
  if (Number(request.headers.get('content-length')) > limit)
    throw new ApiError(413, 'Schedule is too large.');
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, 'Schedule body is missing.');
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      throw new ApiError(413, 'Schedule is too large.');
    }
    chunks.push(value);
  }
  const all = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    all.set(chunk, offset);
    offset += chunk.length;
  }
  let raw: unknown;
  try {
    raw = JSON.parse(new TextDecoder().decode(all));
  } catch {
    throw new ApiError(400, 'Invalid schedule JSON.');
  }
  const parsed = payloadSchema.safeParse(raw);
  if (!parsed.success)
    throw new ApiError(
      422,
      'Invalid schedule. Resolve row errors, duplicates and invalid links before publishing.',
    );
  const data = parsed.data;
  if (data.rows.length > Math.min(500, Math.max(1, Number(process.env.MAX_PUBLISHED_ROWS) || 500)))
    throw new ApiError(413, 'Too many schedule rows.');
  if (parseTournamentUrl(data.tournamentUrl).eventId !== data.eventId)
    throw new ApiError(422, 'Tournament URL and event ID do not match.');
  const seen = new Set<string>();
  for (const row of data.rows) {
    const key = `${normalizeName(row.studentName)}:${row.categoryId || normalize(row.categoryName)}`;
    if (
      seen.has(key) ||
      row.normalizedStudentName !== normalizeName(row.studentName) ||
      row.id !== rowId(data.eventId, row.studentName, row.categoryId, row.categoryName)
    )
      throw new ApiError(422, 'Invalid or duplicate Student + Category identity.');
    seen.add(key);
    if (
      !row.eventDateISO ||
      formatInTimeZone(row.startDateTimeISO, data.eventTimezone, 'yyyy-MM-dd') !==
        row.eventDateISO ||
      (row.endDateTimeISO && row.endDateTimeISO <= row.startDateTimeISO) ||
      row.tournamentUrl !== data.tournamentUrl ||
      row.timetableUrl !== data.timetableUrl
    )
      throw new ApiError(422, 'Check row dates, times and tournament links.');
  }
  return data;
}
async function existing(store: ScheduleStore, id: string): Promise<StoredSchedule> {
  if (!/^[A-Za-z0-9_-]{32}$/.test(id)) throw new ApiError(404, unavailable);
  const record = await store.get(id);
  if (!record) throw new ApiError(404, unavailable);
  return record;
}
function authorize(request: Request, record: StoredSchedule) {
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '') || '';
  if (!validToken(token, record.editTokenHash))
    throw new ApiError(
      401,
      'Edit token is invalid or lost. Import your private organizer recovery file.',
    );
}
function shareUrl(request: Request, id: string) {
  let origin = new URL(request.url).origin;
  try {
    const configured = process.env.NEXT_PUBLIC_APP_URL;
    if (configured) {
      const u = new URL(configured);
      if (u.protocol === 'https:' || u.hostname === 'localhost' || u.hostname === '127.0.0.1')
        origin = u.origin;
    }
  } catch {}
  return `${origin}/s/${id}`;
}
export async function handleApi(
  request: Request,
  id?: string,
  providedStore?: ScheduleStore,
): Promise<Response> {
  try {
    const method = request.method;
    if (!id && method !== 'POST')
      return response({ error: 'Method not allowed.' }, 405, { Allow: 'POST' });
    if (id && !['GET', 'PUT', 'DELETE'].includes(method))
      return response({ error: 'Method not allowed.' }, 405, { Allow: 'GET, PUT, DELETE' });
    if (method !== 'GET') originCheck(request);
    if (id && !/^[A-Za-z0-9_-]{32}$/.test(id)) throw new ApiError(404, unavailable);
    const store = providedStore || storeFor(request);
    await rateLimit(
      request,
      store,
      method === 'POST' ? 'create' : method === 'GET' ? 'read' : 'write',
      id,
    );
    if (method === 'POST') {
      const payload = await readPayload(request);
      const { shareId, editToken } = credentials();
      const now = new Date().toISOString();
      const schedule = publishedSchema.parse({
        ...payload,
        shareId,
        createdAt: now,
        lastUpdatedAt: now,
        version: 1,
      });
      if (!(await store.create(shareId, { schedule, editTokenHash: hashToken(editToken) })))
        throw new ApiError(503, 'Could not publish. Try again.');
      return response(
        {
          shareId,
          editToken,
          shareUrl: shareUrl(request, shareId),
          lastUpdatedAt: now,
          version: 1,
        },
        201,
      );
    }
    const record = await existing(store, id!);
    if (method === 'GET') {
      if (request.headers.has('authorization')) authorize(request, record);
      const etag = `"${hashToken(`${id}:${record.schedule.version}:${record.schedule.lastUpdatedAt}`).slice(0, 32)}"`;
      if (request.headers.get('if-none-match') === etag)
        return new Response(null, { status: 304, headers: { ...headers, ETag: etag } });
      return response(publishedSchema.parse(record.schedule), 200, { ETag: etag });
    }
    authorize(request, record);
    if (method === 'DELETE') {
      if (!(await store.remove(id!, record.editTokenHash))) throw new ApiError(404, unavailable);
      return response({ ok: true });
    }
    const payload = await readPayload(request);
    if (payload.eventId !== record.schedule.eventId)
      throw new ApiError(409, 'Unpublish before replacing the tournament.');
    const schedule = publishedSchema.parse({
      ...payload,
      shareId: id!,
      createdAt: record.schedule.createdAt,
      lastUpdatedAt: new Date().toISOString(),
      version: record.schedule.version + 1,
    });
    if (
      !(await store.update(id!, record.schedule.version, {
        schedule,
        editTokenHash: record.editTokenHash,
      }))
    )
      throw new ApiError(409, 'Schedule changed during this update. Try publishing again.');
    return response({
      shareId: id!,
      shareUrl: shareUrl(request, id!),
      lastUpdatedAt: schedule.lastUpdatedAt,
      version: schedule.version,
    });
  } catch (error) {
    return error instanceof ApiError
      ? response(
          { error: error.message },
          error.status,
          error.status === 429 ? { 'Retry-After': '60' } : {},
        )
      : response(
          {
            error: 'Schedule service is temporarily unavailable. Your local working data is safe.',
          },
          503,
        );
  }
}
