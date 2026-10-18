# How the planner works

## Three boundaries

The Next.js App Router app contains a local organizer, a small publication API and a read-only shared route. The separate userscript runs on SportData. The organizer and API never request SportData pages. Coaches open those pages visibly and complete verification themselves.

The organizer stores one current working record in Dexie/IndexedDB: settings, event, normalized entries/timetable/draw assignments, generated rows, manual corrections, exclusions, preferences and publish metadata. Saves are validated and transactional. A failed import does not replace it. No tournament-history table exists. Changing tournament first invalidates the publication and then clears old local data.

Parsers read a supplied DOM and return normalized structures with warnings. Saved HTML is parsed locally in an inert document, never rendered or uploaded. The helper calls the same parser after an explicit capture tap. It stores only normalized capture sessions through userscript-local storage. No automatic navigation, SportData network APIs, cookies or challenge interaction are used.

Schedule mapping prefers category IDs and exact normalized names. Name tokens handle surname-first display and harmless punctuation; they never perform broad fuzzy matching. Initial pool selection excludes later rounds. Ambiguous mappings are review rows, with no guessed Tatami. Manual overrides are applied last and survive later imports. Final rows deduplicate Student + Category using stable event/name/category identities.

## Publication service

`POST /api/schedules` creates a random public ID and independent private edit credential. `GET /api/schedules/{id}` is read-only; `PUT` and `DELETE` require the Bearer edit token. No listing endpoint exists. Only resolved normalized rows pass the publication schema. The server stores a hash of the token, the current schedule, version and timestamps in Redis. It never stores HTML, sessions or working captures. Atomic compare-and-set updates prevent concurrent overwrites from corrupting version order, and deletion invalidates access.

All endpoints validate limits and links, apply rate limits and return safe messages. Writes require the current origin; credentials never appear in URLs or public responses. The test adapter is an explicit local-only test facility and is disabled on Vercel. Missing production Redis credentials cause safe publication failure, not silent in-memory storage.

## Shared refresh and offline

The read-only screen validates responses, stores its latest public payload in a separate IndexedDB cache and uses conditional ETag requests. It checks every 45 seconds by default (30–60 allowed), pauses while hidden/offline, checks on reconnection and after foregrounding from a long pause, and prevents overlapping requests. Requests have a timeout and bounded backoff. No-change responses leave the publication timestamp intact. Permanent unavailable responses clear cache and stop polling; temporary failures keep the last valid schedule.

Serwist provides a production service worker, cached application assets and offline shells. API responses are not cached by the service worker; public schedule data is cached explicitly with Zod validation. Organizer and shared fallbacks remain separate. Offline copies already downloaded to another phone cannot be remotely erased.

## Files and verification

`lib/validation` owns schemas; `lib/schedule` owns time/identity/mapping; `lib/parser` and `lib/capture` own DOM parsing and helper; `lib/db` owns local persistence; `lib/publish` and `lib/security` own server publication and authorization; `components` owns UI. Tests use synthetic fixtures rather than live SportData. Production builds use the documented Serwist Webpack integration. See `STATUS.md` for executed checks and any remaining external validation.
