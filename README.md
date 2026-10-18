# AMA Tatami Planner

A personal tournament-day planner for Arun Martial Arts coaches. Keep one working tournament on your phone, find the next student and Tatami, and publish a private read-only schedule for colleagues. There are no coach accounts or access codes.

`BUILD_PROMPT.md` is the unchanged product specification. Implementation progress and remaining verification are recorded in `STATUS.md`.

## Run locally

1. Install the current Node.js LTS Windows installer from [nodejs.org](https://nodejs.org/en/download). Include npm in the installer options. Node 22 or later is required; this repository is being developed with Node 24.
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

Deployment, phone capture and sharing guides are added in the corresponding implementation phases. Consult `STATUS.md` for what has actually passed verification.
