# AMA Tatami Planner

A personal tournament-day planner for Arun Martial Arts coaches. Keep one working tournament on your phone, find the next student and Tatami, and publish a private read-only schedule for colleagues. There are no coach accounts or access codes.

`BUILD_PROMPT.md` is the unchanged product specification. Implementation progress and remaining verification are recorded in `STATUS.md`.

## Run locally

1. Install Node.js 24 LTS or later from [nodejs.org](https://nodejs.org/en/download). Include npm in the installer options. This repository is verified with Node 24.
2. Open a terminal **inside this repository**. npm is included with Node; no global package-manager installation is needed.
3. Run `npm.cmd ci` (on macOS/Linux, use `npm ci`).
4. Run `npm.cmd run dev` and open `http://localhost:3000`.
5. For the installable offline version, run `npm.cmd run build`, then `npm.cmd start`. The development server intentionally does not register a service worker.

The organizer works without environment variables. Cloud publishing requires the server-only Upstash values in `.env.local`; use `.env.example` as the template. Never commit `.env.local`.

## First local tournament

1. Paste a SportData Karate tournament URL. For example: `https://www.sportdata.org/karate/set-online/veranstaltung_info_main.php?active_menu=calendar&vernr=10695#a_eventhead`. No sample event data is built into the app.
2. Enter the event name, confirm club aliases and set the **event** timezone. The default is `America/Toronto`.
3. Select **Save tournament**.
4. Select **Add Student Entry**. Enter a student/category pair, date, start/end, pool, Tatami and the actual draw URL. Uncertain fields may stay blank; the row remains in review.
5. Alternatively, open **Import / Export** and paste CSV/TSV with the header `studentName,categoryName,categoryId,categoryCode,pool,tatami,eventDate,startTime,endTime,drawUrl`. Dates use `YYYY-MM-DD`; times use `HH:mm` in the event timezone. Only studentName and categoryName are mandatory.
6. Correct rows with **Edit**, choose **All Schedule**, **Students**, or **Now and Next**, and use the day and filter controls.
7. Export schedule JSON for a portable local copy. This export does not contain the private publishing credential.

## Verification commands

Use `npm.cmd` on Windows PowerShell if the `npm` script launcher is blocked.

```text
npm.cmd run format:check
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run userscript:build
npm.cmd run userscript:check
npm.cmd run browsers:install
npm.cmd run test:e2e
npm.cmd run build
```

`npm.cmd run format` applies formatting; `npm.cmd run test:watch` runs unit tests interactively. Dependency and browser caches stay in this repository. Tests use sanitized fixtures and never request live SportData pages.

## Capture from SportData

Open **Capture / Refresh Data**, then install the helper from its link. In Firefox Android, install Firefox, add Tampermonkey from Extensions, open the helper link and choose Install. If the manager does not intercept the link, create a new script in its dashboard, paste the generated `.user.js` file and save. No Mozilla account is required.

Open SportData normally and complete verification yourself. Capture the entries page, manually select and capture every timetable day, and capture only relevant category draws needed for unknown initial pools. In the helper, download `.ama-capture.json` or copy its normalized JSON. Return to **Import / Export** and import it. You can also import saved HTML locally. Use **Review** to correct a pool, Tatami, time or draw URL, then **Generate schedule** and use **Now and Next**. Finals and repechage appear only as possible later rounds.

See [the capture walkthrough](docs/CAPTURE_WORKFLOW.md) and [phone setup](docs/PHONE_SETUP.md) for exact steps, installation and offline checks.

## Publish and share

Select **Publish Schedule**. Review items are visibly excluded; only resolved normalized rows are uploaded. Use **Copy Sharing Link**, **Share through WhatsApp**, native **Share**, **Show QR Code**, or **Open Shared View**. The local QR code contains only the public read-only link. A colleague opens it in a normal browser without an account or helper. The page shows the actual publication time, checks every 45 seconds while visible and online, offers **Refresh**, and retains a validated offline copy.

After a correction, select **Update Published Schedule** to keep the same URL. Select **Unpublish Schedule** and confirm to remove cloud access while keeping the working copy. Under **WhatsApp message and private recovery**, use **Export Organizer Recovery File**; keep that file private. On another trusted organizer device, save the same event and use **Import Organizer Recovery File**. The public schedule export does not contain the edit token.

**Change Tournament** asks for confirmation, invalidates the existing publication, and replaces the old local data only after the new tournament is saved. If invalidation fails, the app keeps the current tournament. No tournament history is retained. Read [sharing and privacy](docs/SHARING_AND_PRIVACY.md) before clearing browser storage.

## Deploy to Vercel Hobby

1. Sign in to GitHub, create an empty repository if needed, connect its HTTPS remote in this repository and run `git push -u origin main`. Preserve any existing remote; do not commit secrets.
2. Sign in to Vercel, select **Add New → Project**, import that repository, select Next.js and use its root directory. The committed configuration runs `npm ci` and `npm run build`.
3. In Vercel Marketplace, add **Upstash Redis**, create a database and connect it to the project. This is an account/billing action for the owner.
4. In Vercel project environment settings, set `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` and `NEXT_PUBLIC_APP_URL=https://YOUR-PROJECT.vercel.app`. The first two must remain server-only. Set the applicable Production/Preview scopes.
5. Deploy or redeploy, then open the HTTPS site, publish a small test schedule, open it on another phone, update it and unpublish it. Install the PWA and test an offline reload.

Full setup, environment names, preview domains and troubleshooting: [Vercel and Upstash deployment](docs/VERCEL_DEPLOYMENT.md). This repository does not provision external accounts or claim a live deployment without those owner actions.

## Guides and limits

| Guide                                              | Purpose                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------ |
| [Architecture](docs/ARCHITECTURE.md)               | Storage, parsing, service and security boundaries                  |
| [Phone setup](docs/PHONE_SETUP.md)                 | Firefox, userscript manager, helper and PWA installation           |
| [Capture workflow](docs/CAPTURE_WORKFLOW.md)       | First tournament, timetable days, pool review and manual fallbacks |
| [Deployment](docs/VERCEL_DEPLOYMENT.md)            | GitHub, Vercel Hobby, Upstash and environment values               |
| [Troubleshooting](docs/TROUBLESHOOTING.md)         | Import, storage, verification, publishing and offline errors       |
| [Parser maintenance](docs/PARSER_MAINTENANCE.md)   | Selectors, sanitized fixtures and safe matching changes            |
| [Sharing and privacy](docs/SHARING_AND_PRIVACY.md) | Publishing, WhatsApp/QR, recovery and device limitations           |

The parser supports labelled tables, conservative timetable grids and text-based initial draw sections. Image/PDF/canvas brackets, unlabelled layouts, missing date context, ambiguous athlete names and unidentified team members require manual correction. Automated fixtures are synthetic; a live SportData layout is not assumed to have been verified. The app follows scheduled times, not live referee progress, and uses an explicit 30-minute activity estimate when an end time is absent. Notifications require an open page. Unpublishing cannot erase a copy another phone already downloaded while offline.

Consult `STATUS.md` for executed verification and remaining external validation.

The complete [source repository tree](docs/REPOSITORY_TREE.md) omits ignored caches and private test artifacts.
