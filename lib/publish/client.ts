import {
  payloadSchema,
  publishMetaSchema,
  publishedSchema,
  recoverySchema,
  type WorkingData,
  type PublishMeta,
} from '@/lib/validation/models';
import { formatTime } from '@/lib/schedule/core';
export function publicationPayload(data: WorkingData) {
  return payloadSchema.parse({
    schemaVersion: 1,
    eventId: data.tournament.eventId,
    eventName: data.tournament.eventName,
    tournamentUrl: data.tournament.tournamentUrl,
    timetableUrl: data.tournament.timetableUrl,
    clubDisplayName: data.settings.clubDisplayName,
    eventTimezone: data.settings.eventTimezone,
    eventDays: data.tournament.eventDays,
    rows: data.rows.filter((r) => !r.requiresReview),
    warnings: data.captureWarnings,
  });
}
async function requestJSON(url: string, options: RequestInit) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(15000),
    cache: 'no-store',
  });
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error('Schedule service returned an invalid response. Your working copy is safe.');
  }
  if (!response.ok)
    throw new Error(body.error || 'Schedule request failed. Your local working data is safe.');
  return body;
}
export async function publish(data: WorkingData): Promise<PublishMeta> {
  const existing = data.publish;
  const result = await requestJSON(
    existing ? `/api/schedules/${existing.shareId}` : '/api/schedules',
    {
      method: existing ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(existing ? { Authorization: `Bearer ${existing.editToken}` } : {}),
      },
      body: JSON.stringify(publicationPayload(data)),
    },
  );
  return publishMetaSchema.parse({ ...result, editToken: existing?.editToken || result.editToken });
}
export async function unpublish(meta: PublishMeta) {
  await requestJSON(`/api/schedules/${meta.shareId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${meta.editToken}` },
  });
}
export function recoveryFile(meta: PublishMeta) {
  return JSON.stringify(
    recoverySchema.parse({ shareId: meta.shareId, editToken: meta.editToken }),
    null,
    2,
  );
}
export async function recover(text: string, data: WorkingData): Promise<WorkingData> {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('Invalid organizer recovery JSON.');
  }
  const credentials = recoverySchema.parse(raw);
  if (data.publish && data.publish.shareId !== credentials.shareId)
    throw new Error('Unpublish the current schedule before importing another recovery file.');
  const result = await requestJSON(`/api/schedules/${credentials.shareId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${credentials.editToken}` },
  });
  const schedule = publishedSchema.parse(result);
  if (schedule.eventId !== data.tournament.eventId)
    throw new Error('Save this recovery file’s tournament before importing it.');
  return {
    ...data,
    rows: schedule.rows,
    overrides: Object.fromEntries(schedule.rows.map((r) => [r.id, { ...r, manualOverride: true }])),
    tournament: {
      ...data.tournament,
      eventName: schedule.eventName,
      eventDays: schedule.eventDays,
      eventTimezone: schedule.eventTimezone,
    },
    settings: {
      ...data.settings,
      eventTimezone: schedule.eventTimezone,
      clubDisplayName: schedule.clubDisplayName,
    },
    publish: {
      ...credentials,
      shareUrl: `${location.origin}/s/${credentials.shareId}`,
      version: schedule.version,
      lastUpdatedAt: schedule.lastUpdatedAt,
    },
  };
}
export function whatsappMessage(
  eventName: string,
  club: string,
  url: string,
  updatedAt: string,
  zone: string,
) {
  return `AMA Tournament Schedule\n\n${eventName}\nThe ${club} tournament schedule is available here:\n\n${url}\n\nLast updated: ${formatTime(updatedAt, zone, true)}\n\nOpen the link to see the latest student, category, Tatami, pool, and start-time information.`;
}
export function whatsappUrl(message: string) {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
