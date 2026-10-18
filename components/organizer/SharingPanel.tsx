'use client';
import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { WorkingData, PublishMeta } from '@/lib/validation/models';
import {
  publish,
  unpublish,
  recover,
  recoveryFile,
  whatsappMessage,
  whatsappUrl,
} from '@/lib/publish/client';
import { copyText, download, shareText } from '@/lib/export/files';
import { formatTime } from '@/lib/schedule/core';
import { ExternalLink } from '@/components/ui/Fields';

export default function SharingPanel({
  data,
  onMetadata,
  onRecovery,
  onBusy,
  onMessage,
}: {
  data: WorkingData;
  onMetadata: (meta: PublishMeta | null) => Promise<void>;
  onRecovery: (data: WorkingData) => Promise<void>;
  onBusy: (busy: boolean) => void;
  onMessage: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false),
    [qr, setQr] = useState(false),
    [large, setLarge] = useState(false);
  const lock = useRef(false),
    dialog = useRef<HTMLDialogElement>(null);
  const meta = data.publish,
    unresolved = data.rows.filter((r) => r.requiresReview).length,
    resolved = data.rows.length - unresolved;
  const message = meta
    ? whatsappMessage(
        data.tournament.eventName,
        data.settings.clubDisplayName,
        meta.shareUrl,
        meta.lastUpdatedAt,
        data.settings.eventTimezone,
      )
    : '';
  useEffect(() => {
    if (qr && !dialog.current?.open) dialog.current?.showModal();
    else if (!qr && dialog.current?.open) dialog.current.close();
  }, [qr]);
  async function action(task: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    onBusy(true);
    try {
      await task();
    } catch (error) {
      onMessage(
        error instanceof Error
          ? error.message
          : 'Sharing action failed. Your working data is safe.',
      );
    } finally {
      lock.current = false;
      setBusy(false);
      onBusy(false);
    }
  }
  const copy = () =>
    action(async () => {
      if (!meta) return;
      await copyText(meta.shareUrl);
      onMessage('Sharing link copied');
    });
  const share = () =>
    action(async () => {
      if (!meta) return;
      await shareText(
        data.tournament.eventName,
        `${data.settings.clubDisplayName}\nLast updated: ${formatTime(meta.lastUpdatedAt, data.settings.eventTimezone, true)}`,
        meta.shareUrl,
      );
      onMessage('Sharing options opened. If unavailable, copy the public link below.');
    });
  return (
    <section className="panel sharing-panel" aria-label="Organizer sharing">
      <span className="step-label">YOUR COACHING TEAM</span>
      <h2>{meta ? 'Share the plan' : 'One link. Your whole team.'}</h2>
      <p>
        Anyone with this link can view the published tournament schedule. Share it only with trusted
        AMA coaches.
      </p>
      {unresolved > 0 && (
        <p className="warning">
          {unresolved} unresolved entries will be excluded. Publishing includes only the {resolved}{' '}
          resolved entries.
        </p>
      )}
      <div className="actions">
        <button
          disabled={busy || !resolved}
          onClick={() =>
            action(async () => {
              const result = await publish(data);
              await onMetadata(result);
              onMessage(
                `Published successfully. ${resolved} category entries; ${new Set(data.rows.filter((r) => !r.requiresReview).map((r) => r.normalizedStudentName)).size} students.`,
              );
            })
          }
        >
          {busy ? 'Working…' : meta ? 'Update Published Schedule' : 'Publish Schedule'}
        </button>
      </div>
      {meta && (
        <>
          <p>
            Published: {formatTime(meta.lastUpdatedAt, data.settings.eventTimezone, true)} · Version{' '}
            {meta.version}
          </p>
          <label className="field">
            <span>Public sharing link</span>
            <input readOnly value={meta.shareUrl} onFocus={(e) => e.currentTarget.select()} />
          </label>
          <div className="actions">
            <button disabled={busy} className="secondary" onClick={copy}>
              Copy Sharing Link
            </button>
            <button disabled={busy} className="secondary" onClick={share}>
              Share
            </button>
            <ExternalLink className="button secondary-link" href={whatsappUrl(message)}>
              Share through WhatsApp
            </ExternalLink>
            <button className="secondary" onClick={() => setQr(true)}>
              Show QR Code
            </button>
            <ExternalLink className="button secondary-link" href={meta.shareUrl}>
              Open Shared View
            </ExternalLink>
            <button
              className="quiet danger"
              disabled={busy}
              onClick={() => {
                if (
                  confirm(
                    'Unpublish this schedule?\n\nOther coaches will immediately lose access to this tournament schedule. Your local working copy will remain on this device.',
                  )
                )
                  void action(async () => {
                    await unpublish(meta);
                    await onMetadata(null);
                    onMessage('Schedule unpublished');
                  });
              }}
            >
              Unpublish Schedule
            </button>
          </div>
          <details>
            <summary>WhatsApp message and private recovery</summary>
            <label className="field">
              <span>WhatsApp message</span>
              <textarea readOnly value={message} rows={6} />
            </label>
            <button
              className="secondary"
              onClick={() =>
                action(async () => {
                  await copyText(message);
                  onMessage('WhatsApp message copied');
                })
              }
            >
              Copy Message
            </button>
            <p className="warning">
              Clearing browser storage can remove your ability to update or unpublish. The optional
              organizer recovery file is private. Never share it with colleagues.
            </p>
            <button
              className="secondary"
              onClick={() => {
                download('organizer.ama-recovery.json', recoveryFile(meta));
                onMessage('Private organizer recovery file exported. Keep it safe.');
              }}
            >
              Export Organizer Recovery File
            </button>
          </details>
        </>
      )}
      <details>
        <summary>Import Organizer Recovery File</summary>
        <p>
          Use only on a trusted organizer device. Save the same tournament first. Recovery restores
          its current published rows and update credential.
        </p>
        <label className="field">
          <span>Private organizer recovery file</span>
          <input
            disabled={busy}
            type="file"
            accept=".json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 10000) {
                onMessage('Recovery file is too large.');
                return;
              }
              void action(async () => {
                const recovered = await recover(await file.text(), data);
                await onRecovery(recovered);
                onMessage('Organizer recovery imported. Keep this file private.');
              });
              e.target.value = '';
            }}
          />
        </label>
      </details>
      {meta && (
        <dialog
          ref={dialog}
          aria-labelledby="qr-title"
          className={large ? 'qr-large' : ''}
          onClose={() => setQr(false)}
        >
          <div className="section-heading">
            <h2 id="qr-title">Share schedule QR code</h2>
            <button className="quiet" onClick={() => setQr(false)} autoFocus>
              Close
            </button>
          </div>
          <p>
            {data.tournament.eventName}
            <br />
            {data.settings.clubDisplayName}
          </p>
          <div data-public-qr={meta.shareUrl}>
            <QRCodeSVG
              value={meta.shareUrl}
              size={300}
              level="M"
              marginSize={4}
              title="Public read-only schedule URL"
            />
          </div>
          <p className="share-url">{meta.shareUrl}</p>
          <p className="muted">
            Last updated {formatTime(meta.lastUpdatedAt, data.settings.eventTimezone, true)}
          </p>
          <div className="actions">
            <button className="secondary" onClick={copy}>
              Copy Link
            </button>
            <button className="secondary" onClick={share}>
              Share
            </button>
            <button className="secondary" onClick={() => setLarge(!large)}>
              {large ? 'Normal display' : 'Full-screen display'}
            </button>
          </div>
        </dialog>
      )}
    </section>
  );
}
