# Share a schedule with other coaches

## Publish and send

1. Resolve the schedule's review items. Select **Publish Schedule**. The organizer shows the number of unresolved rows that will be excluded; only resolved normalized rows are uploaded.
2. After success, note **Published** and its actual date/time in the event timezone. Anyone with the link can view the published tournament schedule. Share it only with trusted AMA coaches.
3. **Copy Sharing Link** copies only the public URL. If clipboard access is unavailable, select and copy the URL shown in the panel.
4. **Share through WhatsApp** opens a URL-encoded message containing the public link and actual update time. **Copy Message** and the visible message offer a fallback.
5. **Share** uses your phone's native sharing sheet where supported, with clipboard fallback.
6. **Show QR Code** creates a code locally. The code contains only the public URL. Use the large display, Copy Link, Share or Close controls. Scan it with another phone's camera.
7. **Open Shared View** opens the read-only schedule. The colleague needs a modern browser only, with no account, access code, Firefox, helper or PWA installation.

## Update and unpublish

Edit the local schedule and select **Update Published Schedule**. The link stays the same for this tournament. The server replaces its current normalized record and changes the actual publication timestamp and version. Viewers check every 45 seconds while the page is visible and online. Refresh can check immediately. A no-change response updates **Checked**, not **Last updated**. Tabs, filters and sort selection remain in place.

To remove access, select **Unpublish Schedule** and confirm. The local working copy remains. The former URL gives the same unavailable message as a nonexistent link. A viewer already offline may still have a previous local cached copy; deleting the server record cannot erase data already downloaded onto another phone. Once that viewer receives an unavailable response, the app removes its cached copy and stops polling.

Change Tournament first invalidates the current published link, then replaces local working data. If the server cannot unpublish, replacement stops and preserves the current tournament so an old link is not forgotten.

## Optional private recovery file

The organizer's edit token is the only update/unpublish credential. Clearing site data, losing the device or using another browser may remove it. There is no account or password recovery system.

After publishing, choose **Export Organizer Recovery File**. Keep the `.ama-recovery.json` file private. It contains **only** the share ID and edit token. Do not send it to colleagues or put it in a Git repository. The ordinary schedule JSON export and public link do not include this credential.

On another trusted organizer device, save the same tournament, then select **Import Organizer Recovery File** and choose the private file. The app validates the credential against the existing schedule before storing it. Import the schedule data separately or retrieve the currently published normalized copy during recovery. Deleting the cloud record makes its recovery file unusable.

## What stays where

| Organizer device only                                                                                         | Published current record                                                                               |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Current settings, normalized captures, working rows, manual corrections, filters, share ID and raw edit token | Public share ID, hashed edit token, final normalized rows, event/club/timezone, version and timestamps |

No organizer working data is uploaded before an explicit Publish/Update action. No raw SportData HTML, cookies, verification data, session identifiers or history is sent to the server. Shared URLs are unguessable and excluded from indexing; possession of the URL grants read access. The app has no public listing. Local storage is not a substitute for a private backup.
