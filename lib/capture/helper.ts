import { detectPageType, parsePage, safeSportLink, verificationDetected } from '@/lib/parser/dom';
import { captureSessionSchema, type CaptureSession, type CaptureType } from './schema';

declare function GM_getValue<T>(key: string, fallback: T): T;
declare function GM_setValue(key: string, value: unknown): void;
declare function GM_deleteValue(key: string): void;

// No page data is read until the user opens this control and explicitly captures.
if (
  ['www.sportdata.org', 'sportdata.org'].includes(location.hostname) &&
  location.protocol === 'https:' &&
  window.top === window.self
) {
  const control = document.createElement('details');
  control.id = 'ama-capture-control';
  control.style.cssText =
    'position:fixed;bottom:12px;left:12px;z-index:2147483000;max-width:min(360px,calc(100vw - 24px));background:#fff;color:#152e2c;padding:12px;border:2px solid #315e4f;border-radius:12px;font:14px/1.5 sans-serif;box-shadow:0 5px 25px #0004;max-height:85vh;overflow:auto';
  const summary = document.createElement('summary');
  summary.textContent = 'Capture for AMA Planner';
  summary.style.cssText = 'cursor:pointer;font-weight:bold;min-height:32px';
  control.append(summary);
  const content = document.createElement('div');
  control.append(content);
  document.body.append(control);
  const sessionKey = 'ama-normalized-capture-v1';
  let memory: CaptureSession | null = null;
  const read = (): CaptureSession | null => {
    try {
      const raw =
        typeof GM_getValue === 'function' ? GM_getValue<unknown>(sessionKey, null) : memory;
      const parsed = captureSessionSchema.safeParse(raw);
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  };
  function button(label: string, action: () => void | Promise<void>) {
    const el = document.createElement('button');
    el.textContent = label;
    el.type = 'button';
    el.style.cssText =
      'display:block;min-height:44px;padding:8px 12px;margin:8px 0;width:100%;background:#e9eee3;border:1px solid #829d8c;border-radius:7px;color:#152e2c;font:inherit';
    el.addEventListener('click', () => {
      Promise.resolve(action()).catch(() => {
        status.textContent = 'Action failed. Use the visible JSON text or download fallback.';
      });
    });
    content.append(el);
    return el;
  }
  const status = document.createElement('p');
  status.setAttribute('aria-live', 'polite');
  const output = document.createElement('textarea');
  output.setAttribute('aria-label', 'Normalized capture JSON to copy');
  output.readOnly = true;
  output.rows = 5;
  output.style.cssText = 'width:100%;box-sizing:border-box';
  function showJSON() {
    const session = read();
    output.value = session ? JSON.stringify(session, null, 2) : '';
    return output.value;
  }
  function formField(label: string, input: HTMLElement) {
    const wrapper = document.createElement('label');
    wrapper.textContent = label;
    wrapper.style.cssText = 'display:block;margin:12px 0;font-weight:bold';
    input.style.cssText =
      'display:block;width:100%;box-sizing:border-box;min-height:44px;background:white;color:#152e2c;border:1px solid #829d8c;padding:7px;font:inherit';
    wrapper.append(input);
    content.append(wrapper);
  }
  control.addEventListener('toggle', () => {
    if (!control.open) return;
    content.replaceChildren();
    if (verificationDetected(document)) {
      const message = document.createElement('p');
      message.textContent =
        'Complete SportData verification normally. Capture will become available after the SportData page loads.';
      content.append(message);
      button('Close', () => {
        control.open = false;
      });
      return;
    }
    const params = new URL(location.href).searchParams;
    const id = document.createElement('input');
    id.type = 'text';
    id.inputMode = 'numeric';
    id.value =
      params.get('vernr') || params.get('eventid') || params.get('verid') || read()?.eventId || '';
    formField('Event ID', id);
    const aliases = document.createElement('textarea');
    aliases.rows = 3;
    aliases.value = 'Arun Martial Arts(AMA)\nArun Martial Arts (AMA)\nArun Martial Arts\nAMA';
    formField('Club aliases (one per line)', aliases);
    const timezone = document.createElement('input');
    timezone.value = 'America/Toronto';
    formField('Event timezone', timezone);
    const select = document.createElement('select');
    for (const name of ['event', 'entries', 'participants', 'timetable', 'draw', 'unknown']) {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      select.append(option);
    }
    select.value = detectPageType(document);
    formField('Page type (correct if needed)', select);
    button('Capture Current Page', () => {
      if (document.visibilityState !== 'visible') {
        status.textContent = 'Open this page visibly before capturing.';
        return;
      }
      if (verificationDetected(document)) {
        control.open = false;
        control.open = true;
        return;
      }
      try {
        const existing = read();
        if (
          existing &&
          existing.eventId !== id.value.trim() &&
          !confirm('Clear the prior tournament capture session before capturing this event?')
        )
          return;
        const page = parsePage(document, {
          sourceUrl: safeSportLink(location.href, location.href),
          eventId: id.value.trim(),
          aliases: aliases.value
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
          timezone: timezone.value.trim(),
          type: select.value as CaptureType,
        });
        const session = captureSessionSchema.parse({
          schemaVersion: 1,
          eventId: page.eventId,
          pages: [
            ...(existing?.eventId === page.eventId
              ? existing.pages.filter(
                  (p) =>
                    p.sourceUrl !== page.sourceUrl ||
                    p.type !== page.type ||
                    (page.type === 'timetable' &&
                      p.timetable[0]?.eventDateISO !== page.timetable[0]?.eventDateISO),
                )
              : []),
            page,
          ],
        });
        if (typeof GM_setValue === 'function') GM_setValue(sessionKey, session);
        else memory = session;
        status.textContent = `Captured ${page.entries.length} entries, ${page.timetable.length} timetable records, ${page.assignments.length} pool assignments. ${page.warnings.join(' ')}`;
        showJSON();
      } catch (error) {
        status.textContent =
          error instanceof Error
            ? error.message
            : 'Capture could not be validated. Use manual entry.';
      }
    });
    button('View Capture Summary', () => {
      const s = read();
      status.textContent = s
        ? `Event ${s.eventId}: ${s.pages.length} captured pages; ${s.pages.reduce((n, p) => n + p.entries.length, 0)} entries; ${s.pages.reduce((n, p) => n + p.timetable.length, 0)} timetable records; ${s.pages.reduce((n, p) => n + p.assignments.length, 0)} pool assignments. ${s.pages.flatMap((p) => p.warnings).join(' ')}`
        : 'No pages captured.';
      showJSON();
    });
    button('Copy Capture JSON', async () => {
      const text = showJSON();
      if (!text) {
        status.textContent = 'Capture a page first.';
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
        status.textContent = 'Normalized capture JSON copied.';
      } catch {
        output.focus();
        output.select();
        status.textContent = 'Select and copy the normalized JSON below.';
      }
    });
    button('Download Capture File', () => {
      const text = showJSON();
      if (!text) {
        status.textContent = 'Capture a page first.';
        return;
      }
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      const download = document.createElement('a');
      download.href = url;
      download.download = `event-${read()?.eventId}.ama-capture.json`;
      download.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      status.textContent = 'Capture file downloaded.';
    });
    button('Clear Capture Session', () => {
      if (!confirm('Clear this local normalized capture session?')) return;
      if (typeof GM_deleteValue === 'function') GM_deleteValue(sessionKey);
      memory = null;
      output.value = '';
      status.textContent = 'Capture session cleared.';
    });
    button('Move control', () => {
      const top = control.style.top === '12px';
      control.style.top = top ? '' : '12px';
      control.style.bottom = top ? '12px' : '';
    });
    button('Close', () => {
      control.open = false;
    });
    content.append(status, output);
    if (typeof GM_setValue !== 'function')
      status.textContent =
        'Userscript storage unavailable. This session lasts only until this page closes; export before leaving.';
  });
}
