import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryStore, storeFor } from '@/lib/publish/store';
import { handleApi } from '@/lib/publish/api';
import { defaults, makeRow, newWorking } from '@/lib/schedule/core';
import {
  publicationPayload,
  recoveryFile,
  whatsappMessage,
  whatsappUrl,
} from '@/lib/publish/client';
import { credentials, hashToken, validToken } from '@/lib/security/tokens';
const working = () => {
  const data = newWorking(
    'https://sportdata.org/karate/set-online/event.php?vernr=90001',
    'Fixture Cup',
    defaults,
  );
  data.rows = [
    makeRow(
      {
        studentName: 'Asha Rao',
        categoryName: 'Kata',
        categoryId: '11',
        pool: '2',
        tatami: '7',
        eventDate: '2026-10-18',
        startTime: '09:15',
      },
      data.tournament,
    ),
  ];
  data.tournament.eventDays = ['2026-10-18'];
  return data;
};
let store: MemoryStore;
beforeEach(() => {
  store = new MemoryStore();
  vi.unstubAllEnvs();
});
function request(
  method = 'POST',
  body: unknown = publicationPayload(working()),
  token?: string,
  origin = 'http://localhost:3000',
) {
  return new Request('http://localhost:3000/api/schedules', {
    method,
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(method === 'GET' || method === 'DELETE' ? {} : { body: JSON.stringify(body) }),
  });
}
async function create() {
  const response = await handleApi(request(), undefined, store);
  expect(response.status).toBe(201);
  return response.json();
}
describe('publication security', () => {
  it('rejects links carrying session or verification parameters', async () => {
    const p = publicationPayload(working());
    p.rows[0].drawUrl =
      'https://sportdata.org/karate/set-online/draw.php?vernr=90001&session=private';
    expect((await handleApi(request('POST', p), undefined, store)).status).toBe(422);
  });
  it('enforces read and write rate limits as well as create limits', async () => {
    const meta = await create();
    const read = request('GET');
    for (let i = 0; i < 240; i++)
      expect((await handleApi(read, meta.shareId, store)).status).toBe(200);
    expect((await handleApi(read, meta.shareId, store)).status).toBe(429);
    const write = request('DELETE');
    for (let i = 0; i < 60; i++)
      expect((await handleApi(write, meta.shareId, store)).status).toBe(401);
    expect((await handleApi(write, meta.shareId, store)).status).toBe(429);
  });
  it('generates independent cryptographic credentials and secure hashes', () => {
    const a = credentials(),
      b = credentials();
    expect(a.shareId).toMatch(/^[\w-]{32}$/);
    expect(a.editToken).toMatch(/^[\w-]{43}$/);
    expect(a.shareId).not.toBe(b.shareId);
    expect(validToken(a.editToken, hashToken(a.editToken))).toBe(true);
    expect(validToken(b.editToken, hashToken(a.editToken))).toBe(false);
  });
  it('stores only a hash and publishes no token', async () => {
    const meta = await create();
    const record = await store.get(meta.shareId);
    expect(record?.editTokenHash).toBe(hashToken(meta.editToken));
    expect(JSON.stringify(record)).not.toContain(meta.editToken);
    const response = await handleApi(request('GET'), meta.shareId, store);
    expect(response.status).toBe(200);
    expect(await response.text()).not.toContain(meta.editToken);
    expect(meta.shareUrl).not.toContain(meta.editToken);
  });
  it('rejects unauthorized update and deletion', async () => {
    const meta = await create();
    expect((await handleApi(request('PUT'), meta.shareId, store)).status).toBe(401);
    expect((await handleApi(request('DELETE'), meta.shareId, store)).status).toBe(401);
    expect((await store.get(meta.shareId))?.schedule.version).toBe(1);
  });
  it('updates atomically with the same public ID and deletes without history', async () => {
    const meta = await create();
    const response = await handleApi(
      request('PUT', publicationPayload(working()), meta.editToken),
      meta.shareId,
      store,
    );
    expect((await response.json()).shareId).toBe(meta.shareId);
    expect((await store.get(meta.shareId))?.schedule.version).toBe(2);
    expect(store.records.size).toBe(1);
    expect(
      (await handleApi(request('DELETE', undefined, meta.editToken), meta.shareId, store)).status,
    ).toBe(200);
    expect((await handleApi(request('GET'), meta.shareId, store)).status).toBe(404);
    expect(store.records.size).toBe(0);
  });
  it('rejects stale version compare-and-set rather than resurrecting a deletion', async () => {
    const meta = await create();
    const record = (await store.get(meta.shareId))!;
    expect(
      await store.update(meta.shareId, 1, {
        ...record,
        schedule: { ...record.schedule, version: 2 },
      }),
    ).toBe(true);
    expect(await store.update(meta.shareId, 1, record)).toBe(false);
    await store.remove(meta.shareId, record.editTokenHash);
    expect(await store.update(meta.shareId, 2, record)).toBe(false);
  });
  it('supports ETag and body-free 304', async () => {
    const meta = await create();
    const first = await handleApi(request('GET'), meta.shareId, store);
    const second = await handleApi(
      new Request(request('GET'), { headers: { 'If-None-Match': first.headers.get('etag')! } }),
      meta.shareId,
      store,
    );
    expect(second.status).toBe(304);
    expect(await second.text()).toBe('');
  });
  it('has no public listing endpoint', async () =>
    expect((await handleApi(request('GET'), undefined, store)).status).toBe(405));
  it('rejects cross-origin writes', async () =>
    expect(
      (
        await handleApi(
          request('POST', undefined, undefined, 'https://evil.example'),
          undefined,
          store,
        )
      ).status,
    ).toBe(403));
  it('rejects HTML, working data, unsupported URLs and duplicate identities', async () => {
    const p = publicationPayload(working());
    for (const invalid of [
      { ...p, rawHTML: '<table>private</table>' },
      { ...p, tournamentUrl: 'http://sportdata.org/karate/set-online/event.php?vernr=90001' },
      { ...p, rows: [p.rows[0], p.rows[0]] },
      { ...p, rows: [{ ...p.rows[0], drawUrl: 'https://evil.example/draw' }] },
    ])
      expect((await handleApi(request('POST', invalid), undefined, store)).status).toBe(422);
  });
  it('checks canonical student identity rather than trusting imported normalization', async () => {
    const p = publicationPayload(working());
    p.rows[0].normalizedStudentName = 'wrong';
    expect((await handleApi(request('POST', p), undefined, store)).status).toBe(422);
  });
  it('enforces byte and row limits', async () => {
    vi.stubEnv('MAX_PUBLISH_PAYLOAD_BYTES', '1024');
    expect(
      (await handleApi(request('POST', { x: 'x'.repeat(2000) }), undefined, store)).status,
    ).toBe(413);
    vi.stubEnv('MAX_PUBLISH_PAYLOAD_BYTES', '500000');
    vi.stubEnv('MAX_PUBLISHED_ROWS', '1');
    const p = publicationPayload(working());
    p.rows.push({
      ...p.rows[0],
      studentName: 'Dev Singh',
      normalizedStudentName: 'dev singh',
      id: '90001:dev%20singh:11',
    });
    expect((await handleApi(request('POST', p), undefined, store)).status).toBe(413);
  });
  it('rate-limits repeated creates', async () => {
    for (let i = 0; i < 8; i++)
      expect((await handleApi(request(), undefined, store)).status).toBe(201);
    const blocked = await handleApi(request(), undefined, store);
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('retry-after')).toBe('60');
  });
  it('does not allow tournament replacement through an existing link', async () => {
    const meta = await create();
    const p = publicationPayload(working());
    p.eventId = '90002';
    p.tournamentUrl = p.tournamentUrl.replace('90001', '90002');
    p.rows = p.rows.map((r) => ({
      ...r,
      id: r.id.replace('90001', '90002'),
      tournamentUrl: p.tournamentUrl,
    }));
    expect((await handleApi(request('PUT', p, meta.editToken), meta.shareId, store)).status).toBe(
      409,
    );
  });
  it('uses test storage only on local non-Vercel hosts', () => {
    vi.stubEnv('AMA_E2E_STORE', '1');
    expect(storeFor(request())).toBeInstanceOf(MemoryStore);
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
    expect(() => storeFor(request())).toThrow('storage-unavailable');
  });
  it('recovery export contains exactly two private fields', async () => {
    const meta = await create();
    expect(Object.keys(JSON.parse(recoveryFile(meta))).sort()).toEqual(['editToken', 'shareId']);
  });
  it('shares the public URL and actual event-zone timestamp', () => {
    const message = whatsappMessage(
      'Cup',
      'AMA',
      'https://example.test/s/public',
      '2026-10-18T12:35:00.000Z',
      'America/Toronto',
    );
    expect(message).toContain('8:35 AM');
    expect(new URL(whatsappUrl(message)).searchParams.get('text')).toBe(message);
  });
});
