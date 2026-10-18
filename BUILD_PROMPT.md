# AMA Tatami Planner — Consolidated Master Build Prompt

## Instructions for the coding agent

You are a senior full-stack TypeScript engineer, mobile PWA specialist, browser userscript engineer, HTML-parser engineer, security engineer, accessibility specialist, and test-automation engineer.

Build a complete, production-ready personal application named **AMA Tatami Planner**.

Do not merely describe the solution, provide pseudocode, or stop after scaffolding. Create the complete runnable repository, all source files, tests, documentation, sample fixtures, build scripts, Vercel configuration, browser capture helper, and deployment instructions.

Work through the project autonomously. Make reasonable implementation decisions when details are not specified. Do not ask the user to choose routine technical options. Do not claim the project is complete until linting, strict type checking, tests, and production builds pass.

This is a **personal, non-commercial hobby project** used by a karate coach to plan tournament-day coverage for Arun Martial Arts students. It will not be sold and will not be used commercially.

---

# 1. Product objective

The user will paste a SportData Karate tournament URL, such as:

```text
https://www.sportdata.org/karate/set-online/veranstaltung_info_main.php?active_menu=calendar&vernr=10695#a_eventhead
```

The application must help the coach identify every participant from the configured club and create a fast, phone-friendly schedule containing:

- Student name
- Category name
- Category ID or code when available
- Competition date
- Initial pool
- Exact Tatami for that student's pool
- Scheduled start time
- Scheduled end time when available
- Status such as upcoming, starting soon, in progress, completed, or review required
- Direct SportData draw link
- Direct SportData timetable link

Each final schedule row must represent exactly one unique combination of:

```text
Student + Category
```

The primary tournament-day question the application must answer is:

> Which Arun Martial Arts student is competing next, at what time, and on which Tatami?

The application must be optimized for urgent use at a live tournament from a mobile phone.

---

# 2. Fixed product decisions

These decisions are final and must not be changed:

1. The default club is:

   ```text
   Arun Martial Arts(AMA)
   ```

2. The club name and aliases must be configurable.

3. One row must be shown per Student + Category.

4. The application must determine the student's exact initial pool and map it to the correct Tatami and start time whenever the source pages provide enough information.

5. Multi-day tournaments must have:
   - An **All** tab
   - One tab for each tournament day

6. The default schedule order is chronological by category/pool start time.

7. The user must be able to sort by every meaningful displayed column, including:
   - Student
   - Category
   - Date
   - Start time
   - End time
   - Tatami
   - Pool
   - Status

8. Both the student name and category name must open the corresponding SportData draw.

9. The application must include a separate link to the SportData timetable.

10. The application must include a guided refresh/capture workflow.

11. There is no SportData API access.

12. The application must be mobile-first.

13. The main organizer experience is for the user and other Arun Martial Arts coaches.

14. The organizer's device must retain the current tournament URL and working schedule until the user changes the tournament.

15. When the user changes the tournament:
    - The previous local tournament data must be removed.
    - The previous published schedule must be unpublished or invalidated.
    - No tournament history must be retained.

16. The application must include:
    - Schedule View
    - Student View
    - Now and Next View

17. It must support a configurable upcoming threshold, defaulting to 60 minutes.

18. There must be no coach login, access code, password, or individual account system.

19. Do not include:
    - Permission-request templates
    - Compliance modes
    - Permission-confirmation switches
    - Legal acceptance checkboxes

20. The application must never bypass, solve, manipulate, or automate SportData's human-verification screen.

21. A user must complete any SportData human-verification step manually in a visible browser tab.

22. The application must allow the organizer to publish the normalized schedule so colleagues can open a private read-only link on their own phones.

23. Colleagues must not need:
    - Firefox
    - A userscript
    - A PWA installation
    - An account
    - An access code

24. The published shared schedule must include:
    - Copy Sharing Link
    - Share through WhatsApp
    - General native Share action
    - Show QR Code
    - Open Shared View
    - Update Published Schedule
    - Unpublish Schedule
    - Actual last-updated time, for example `Last updated at 8:35 AM`
    - Automatic refresh every 30–60 seconds, default 45 seconds
    - A manual Refresh button

---

# 3. Required user journeys

## 3.1 Organizer setup journey

1. Open the application on a phone.
2. Paste a SportData tournament URL.
3. Confirm or edit the club name and aliases.
4. Confirm or edit the event timezone.
5. Save the tournament locally.
6. Open the guided capture workflow.
7. Open SportData in Firefox or another supported browser.
8. Complete SportData verification manually if it appears.
9. Capture the visible entries page.
10. Capture each timetable day.
11. Capture only the relevant draw pages needed to determine pools.
12. Import or paste the resulting capture into the application.
13. Review ambiguous mappings.
14. Correct any unresolved pool, Tatami, time, or draw link manually.
15. Generate the final tournament schedule.
16. Use the Now and Next screen during the tournament.
17. Publish the normalized schedule.
18. Share the read-only link through WhatsApp, QR code, clipboard, or native sharing.

## 3.2 Shared coach journey

1. Receive the private sharing URL.
2. Open it in any modern mobile browser.
3. See the latest published schedule without logging in.
4. Use:
   - Now and Next
   - All Schedule
   - Day tabs
   - Student View
   - Student, category, Tatami, and day filters
5. See `Last updated at ...` and `Checked ...` information.
6. Receive automatic updates every 45 seconds while the page is active.
7. Tap Refresh for an immediate update.
8. Continue seeing the last available schedule during temporary network problems.

## 3.3 Change tournament journey

1. Organizer selects Change Tournament.
2. Display a clear destructive-action confirmation.
3. Unpublish or invalidate the previous shared schedule.
4. Delete the prior local tournament data and manual corrections.
5. Save the new tournament URL and configuration.
6. Do not keep a history of the previous tournament.
7. Generate a new sharing URL only when the new tournament is published.

---

# 4. Technical architecture

Use a single repository built around **Next.js with the App Router** because the project requires both a mobile PWA and a small Vercel-hosted serverless API for schedule sharing.

Use current stable versions of maintained libraries at implementation time.

## 4.1 Required technologies

- Next.js App Router
- React
- Strict TypeScript
- Tailwind CSS
- Zod for runtime validation
- Dexie for IndexedDB
- TanStack Table for desktop sorting and filtering
- date-fns and date-fns-tz, or equivalent maintained libraries
- A maintained Next.js-compatible PWA/service-worker solution
- A maintained client-side QR code library
- Upstash Redis or another Vercel-compatible managed key-value store
- Vitest for unit and parser tests
- Playwright for end-to-end tests
- ESLint
- Prettier

## 4.2 Architecture boundaries

The system has three major components:

1. **Organizer PWA**
   - Stores working tournament and capture data locally in IndexedDB.
   - Parses imported SportData captures.
   - Allows review, correction, schedule generation, publishing, and unpublishing.

2. **SportData capture helper userscript**
   - Runs only on visible SportData pages.
   - Requires an explicit user tap to capture the current page.
   - Never automatically navigates or makes hidden SportData requests.
   - Exports normalized capture data locally as JSON or clipboard text.

3. **Shared schedule service**
   - Stores only the final normalized current schedule.
   - Provides a private unguessable read-only URL.
   - Supports update, unpublish, conditional refresh, and offline viewing.

## 4.3 Do not implement

Do not implement any of the following:

- Coach accounts
- Access codes
- Password authentication
- SportData API authentication
- Server-side SportData scraping
- Vercel functions that fetch SportData pages
- Browser CORS proxies to SportData
- Headless browsers
- CAPTCHA-solving services
- CAPTCHA manipulation
- Automated SportData navigation
- Automatic link clicking
- Proxy rotation
- Browser fingerprint spoofing
- Cookie export
- SportData session export
- Hidden iframes for SportData
- Scheduled or background SportData crawling
- Tournament-history storage
- Raw SportData HTML storage in the cloud
- Public schedule directories or search pages

---

# 5. Suggested repository structure

Create a clean repository similar to:

```text
ama-tatami-planner/
  app/
    api/
      schedules/
        route.ts
        [shareId]/
          route.ts
    s/
      [shareId]/
        page.tsx
    organizer/
      page.tsx
    layout.tsx
    page.tsx
  components/
    organizer/
    schedule/
    shared/
    ui/
  lib/
    authz/
    capture/
    db/
    export/
    parser/
    publish/
    schedule/
    security/
    time/
    validation/
  public/
    icons/
    manifest.webmanifest
  userscripts/
    ama-sportdata-helper.user.js
  fixtures/
    sportdata/
  tests/
    unit/
    integration/
    e2e/
  docs/
    ARCHITECTURE.md
    PHONE_SETUP.md
    CAPTURE_WORKFLOW.md
    VERCEL_DEPLOYMENT.md
    TROUBLESHOOTING.md
    PARSER_MAINTENANCE.md
    SHARING_AND_PRIVACY.md
  scripts/
  README.md
  package.json
  tsconfig.json
  next.config.*
  playwright.config.*
  vitest.config.*
  eslint.config.*
```

The exact structure may differ if a cleaner implementation is justified, but keep parser, storage, UI, sharing, and security concerns clearly separated.

---

# 6. Local data and privacy model

The organizer's working data must be stored in IndexedDB on the organizer's device.

Store locally:

- Current tournament URL
- Event ID
- Tournament name
- Tournament date or date range
- Event timezone
- Club configuration
- Club aliases
- Captured entries
- Captured timetable records
- Captured draw/pool assignments
- Final normalized schedule
- Manual corrections
- Current sorting and filtering preferences
- Capture timestamps
- Publish metadata
- Public share ID
- Private edit token

The application must store only one current tournament locally.

When changing the tournament, remove:

- Previous event URL
- Previous entries
- Previous timetable records
- Previous draw captures
- Previous pool assignments
- Previous schedule rows
- Previous manual overrides
- Previous publish metadata

Do not retain local tournament history.

The application must not upload organizer working data until the user explicitly selects Publish Schedule.

Only the final normalized schedule may be uploaded.

Never upload:

- Raw SportData HTML
- SportData cookies
- Verification information
- CAPTCHA data
- Browser history
- Browser local storage from SportData
- Browser session storage from SportData
- SportData credentials
- Userscript storage unrelated to normalized capture data

---

# 7. Tournament URL handling

Accept SportData Karate tournament URLs such as:

```text
https://www.sportdata.org/karate/set-online/veranstaltung_info_main.php?active_menu=calendar&vernr=10695#a_eventhead
```

Validate all URLs strictly.

## 7.1 Allowed URL rules

- HTTPS only
- Hostname must be exactly:
  - `sportdata.org`
  - `www.sportdata.org`
- The URL must represent the Karate system.
- The `vernr` query parameter must be a positive integer.
- Reject lookalike domains.
- Reject JavaScript, data, file, and other unsupported schemes.
- Normalize harmless URL variations.

For the sample URL, extract:

```text
Event ID: 10695
```

## 7.2 Derived links

Derive these links when an actual source-page URL is unavailable.

Tournament:

```text
https://www.sportdata.org/karate/set-online/veranstaltung_info_main.php?active_menu=calendar&vernr={EVENT_ID}
```

Timetable:

```text
https://www.sportdata.org/setglinc/dtm/dtm_timetable.php?eventid={EVENT_ID}&system=karate
```

Draw-list page:

```text
https://www.sportdata.org/karate/set-online/veranstaltung_info_main.php?active_menu=calendar&vernr={EVENT_ID}&ver_info_action=catauslist#a_eventheadend
```

All-entries page when available:

```text
https://www.sportdata.org/karate/set-online/popup_nennungen_main.php?popup_action=nennungenall&verid={EVENT_ID}
```

Always prefer actual links captured from page anchors over assumed URL patterns.

---

# 8. Club configuration and matching

Default club display name:

```text
Arun Martial Arts(AMA)
```

Default aliases:

```text
Arun Martial Arts(AMA)
Arun Martial Arts (AMA)
Arun Martial Arts
AMA
```

Allow the organizer to add, edit, reorder, or delete aliases.

Club matching must:

- Normalize Unicode
- Compare case-insensitively
- Trim leading and trailing whitespace
- Collapse repeated whitespace
- Normalize harmless punctuation
- Normalize parentheses
- Ignore harmless count suffixes such as `[8]`
- Handle country suffixes when present
- Prefer exact normalized matches
- Avoid broad fuzzy matching
- Treat `AMA` as a complete abbreviation or club-field match, not a loose substring
- Avoid matching unrelated club names containing the letters `AMA`
- Return match confidence and a human-readable matching reason
- Mark uncertain matches for manual review

---

# 9. SportData interaction boundaries

The PWA itself must not request SportData pages programmatically.

The capture helper must operate only on a page that the user has opened normally in a visible browser tab.

The user must manually complete any SportData verification step.

The helper must never:

- Solve a verification challenge
- Manipulate a verification challenge
- Inspect verification answers
- Submit verification answers
- Read or export cookies
- Read or export SportData session identifiers
- Make hidden page requests
- Automatically navigate to another SportData page
- Automatically click SportData links
- Crawl categories or draw pages
- Run on unrelated websites

The helper may inspect only the DOM of the currently loaded visible page after the user explicitly taps Capture for AMA Planner.

---

# 10. Mobile SportData capture helper

Create:

```text
userscripts/ama-sportdata-helper.user.js
```

Make it compatible with common userscript managers on desktop and mobile browsers where supported, with particular attention to Firefox on Android.

Use narrow match patterns limited to SportData, for example:

```text
https://www.sportdata.org/*
https://sportdata.org/*
```

## 10.1 Floating control

Inject a small movable or collapsible floating control labelled:

```text
Capture for AMA Planner
```

It must not cover important SportData controls.

The capture helper must never capture automatically.

## 10.2 Allowed helper operations

The helper may:

- Read the current document title
- Read visible page headings, tables, anchors, and relevant DOM structure
- Parse the current page into normalized structured data
- Save the normalized capture in userscript-local storage
- Copy normalized JSON to the clipboard
- Download an `.ama-capture.json` file
- Display capture progress and a local capture summary

## 10.3 Prohibited helper APIs and behaviours

Do not use:

- `fetch`
- `XMLHttpRequest`
- `GM_xmlhttpRequest`
- WebSocket
- Cookie APIs
- Browser-history APIs
- Automatic navigation
- Programmatically generated clicks on SportData links
- Background tabs created for crawling

## 10.4 Verification-screen behaviour

Detect likely verification pages by checking for indicators such as:

- A title indicating verification
- Visible text such as `Verifying you are not a robot`
- Challenge containers or frames
- Absence of expected SportData content

When verification is detected:

- Disable capture.
- Do not inspect or manipulate the challenge.
- Display:

  ```text
  Complete SportData verification normally. Capture will become available after the SportData page loads.
  ```

- Provide only a Close action.
- After the normal page loads, the user can manually tap Capture for AMA Planner.

## 10.5 Capture session

Maintain a local capture session containing normalized data only:

- Event ID
- Event name
- Source URL
- Capture type
- Capture timestamp
- Student names
- Club names
- Category names
- Category IDs
- Category codes
- Draw URLs
- Participant-list URLs
- Timetable records
- Pool assignments
- Parser warnings

After parsing, discard raw HTML.

Provide these helper actions:

- Capture Current Page
- View Capture Summary
- Copy Capture JSON
- Download Capture File
- Clear Capture Session

The helper should identify the current page type automatically, but allow the user to correct the page type when detection is uncertain.

Supported page types:

- Tournament/event page
- All-entries page
- Category/participant list page
- Timetable page
- Draw page
- Unknown page requiring manual selection

---

# 11. Guided capture workflow in the PWA

Create a phone-friendly wizard.

## Step 1 — Tournament

- Paste the SportData tournament URL.
- Validate it.
- Extract the event ID.
- Save it locally.
- Configure club name, aliases, timezone, and upcoming threshold.

Default timezone:

```text
America/Toronto
```

Default upcoming threshold:

```text
60 minutes
```

## Step 2 — Entries

- Show an **Open SportData Entries** button.
- Explain that the user must complete SportData verification normally if requested.
- Explain how to tap Capture for AMA Planner.
- Allow import by:
  - Uploading `.ama-capture.json`
  - Pasting capture JSON
  - Pasting text
  - Uploading CSV or TSV
  - Entering rows manually

## Step 3 — Timetable

- Show **Open SportData Timetable**.
- Derive the timetable URL from the event ID.
- Ask the user to capture every tournament day.
- Show captured and missing days.
- Allow manual addition of a timetable record.

## Step 4 — Pools and draws

- Determine which relevant categories have multiple initial pools or ambiguous Tatami mappings.
- Categories with a single initial timetable record do not require a draw capture.
- For each category requiring a draw capture, show:
  - Category name
  - Category ID
  - Students needing pool assignment
  - Direct Open Draw button
  - Capture status
  - Review status

The user opens each relevant draw manually and captures the visible draw page.

Do not ask the user to capture unrelated categories.

## Step 5 — Review

Show all warnings and ambiguous mappings.

Allow the organizer to:

- Choose the correct club match
- Correct a student name
- Correct a category
- Select a pool
- Select a Tatami
- Select a date
- Select a start time
- Select an end time
- Replace or correct a draw URL
- Exclude an erroneous row
- Add a missing row

Do not silently guess uncertain mappings.

## Step 6 — Ready

- Generate the normalized schedule.
- Save it locally.
- Make it available offline.
- Show Now and Next.
- Enable publishing.

---

# 12. Entries parser

Build entries parsing as a standalone, well-tested module.

Parse the current visible all-entries page, category participant page, or equivalent SportData page.

Extract:

- Student or team name
- Club name exactly as displayed
- Country when available
- Category name
- Category code
- Category ID
- Draw URL when available
- Participant-list URL when available
- Entry type: individual or team
- Source URL

Filter results to the configured club using the alias matching rules.

Create one final entry per unique:

```text
Student + Category
```

Deduplicate repeated appearances.

## 12.1 Team categories

When a team entry includes identifiable member names:

- Extract the team entry.
- Extract each reliably identifiable team member.
- Create one Student + Category row for each identifiable member.
- Mark the entry type as `team`.
- Link each team-member row to the same draw.

Do not invent team-member names.

Place unresolved team entries in manual review.

## 12.2 Parser resilience

- Prefer semantic DOM structure, labels, headings, and anchors.
- Do not rely only on fragile text-position assumptions.
- Provide fallback selectors for minor page variations.
- Return structured warnings when expected fields are absent.
- Keep parsing logic isolated from UI code.

---

# 13. Timetable parser

Build timetable parsing as a standalone, well-tested module.

Parse every captured timetable day.

Extract:

- Tournament name
- Event date
- Tournament day label
- Tatami or area
- Category name
- Category ID
- Category code
- Pool number
- Total pool count
- Phase
- Start time
- End time
- Duration when available
- Entry count when available
- Draw URL
- Participant-list URL
- Source URL

Recognize phases such as:

- Pool
- Main Tree Pool
- Double-Elimination
- Elimination
- Repechage
- Poolwinner Tree
- Final

Ignore non-category timetable cells such as:

- Lunch break
- Medal ceremony
- Line up
- General session
- Empty slot

Retain non-category records only if useful for optional context, but never present them as student entries.

Store both:

- Original displayed date/time text
- Normalized sortable ISO date/time values

Treat times as local to the configured event timezone unless the page explicitly provides another timezone.

---

# 14. Draw and pool parser

Build draw parsing as a standalone, well-tested module.

For each configured-club participant, determine the participant's **initial competition pool**.

Recognize structures and headings such as:

- Main Tree Pool 1
- Main Tree Pool 2
- Pool 1 / 2
- Pool 2 / 2
- Double-Elimination
- Poolwinner Tree
- Repechage Pool 1
- Repechage Pool 2
- Final

## 14.1 Pool-selection rules

1. Prefer the participant's earliest appearance in the initial main draw.
2. Do not treat repechage as the participant's initial pool.
3. Do not treat a final as the participant's initial pool.
4. If there is one pool and no explicit number, assign pool 1.
5. Deduplicate the participant's repeated appearances in later rounds.
6. Do not assign a pool when the name match is ambiguous.
7. Allow the organizer to select the pool manually.

## 14.2 Name matching

Handle:

- Uppercase versus title case
- Surname-first versus given-name-first display
- Hyphens
- Apostrophes
- Accents and Unicode normalization
- Repeated spaces
- Harmless punctuation
- Team-name prefixes

Use normalized token comparison and conservative matching.

Do not use broad fuzzy matching that could assign the wrong athlete.

Return:

- Matched participant display name
- Pool number
- Match confidence
- Matching reason
- Draw URL
- Source heading
- Warnings
- `requiresReview`

---

# 15. Exact pool-to-Tatami mapping

For every Student + Category entry:

1. Match the entry to timetable records using category ID whenever available.
2. Fall back to conservative category-name matching only when the category ID is absent.
3. If the category has one initial timetable record, use that record.
4. If the category has multiple initial pools, use the participant's initial draw pool.
5. Select the timetable record with the matching pool.
6. Assign:
   - Event date
   - Start time
   - End time
   - Tatami
   - Pool
7. Do not use the category's first timetable slot if the student belongs to another pool.
8. If the pool is unknown and pools are on different Tatamis, show Review required.
9. Do not guess the Tatami.
10. Allow a manual override.

For later phases such as finals or repechage:

- Show them only under **Possible Later Rounds**.
- Do not imply that the student is guaranteed to participate.
- Keep the initial pool as the primary schedule row.

---

# 16. Data model and validation

Create Zod schemas and strict TypeScript types.

## 16.1 AppSettings

```text
clubDisplayName
clubAliases
normalizedClubAliases
eventTimezone
upcomingThresholdMinutes
defaultView
defaultSort
autoRefreshSeconds
```

Defaults:

```text
eventTimezone = America/Toronto
upcomingThresholdMinutes = 60
autoRefreshSeconds = 45
```

## 16.2 Tournament

```text
eventId
tournamentUrl
eventName
timetableUrl
drawListUrl
eventTimezone
eventDays
createdAt
lastCapturedAt
lastGeneratedAt
```

## 16.3 StudentEntry

```text
id
studentName
normalizedStudentName
clubName
country
entryType
categoryId
categoryCode
categoryName
drawUrl
participantListUrl
sourceUrl
warnings
requiresReview
```

## 16.4 TimetableRecord

```text
id
categoryId
categoryCode
categoryName
eventDateISO
eventDateLabel
startTimeDisplay
endTimeDisplay
startDateTimeISO
endDateTimeISO
tatami
pool
totalPools
phase
drawUrl
participantListUrl
sourceUrl
warnings
```

## 16.5 DrawPoolAssignment

```text
studentName
normalizedStudentName
categoryId
pool
matchedName
confidence
matchingReason
drawUrl
sourceHeading
warnings
requiresReview
```

## 16.6 ScheduleRow

```text
id
studentName
normalizedStudentName
clubName
entryType
categoryId
categoryCode
categoryName
eventDateISO
eventDateLabel
startTimeDisplay
endTimeDisplay
startDateTimeISO
endDateTimeISO
tatami
pool
totalPools
phase
drawUrl
participantListUrl
tournamentUrl
timetableUrl
status
warnings
requiresReview
manualOverride
possibleLaterRounds
```

Generate a stable schedule row ID from:

```text
event ID + normalized student name + category ID
```

If category ID is unavailable, use a stable normalized category-name fallback and flag the row.

## 16.7 PublishedSchedule

```text
schemaVersion
shareId
eventId
eventName
tournamentUrl
timetableUrl
clubDisplayName
eventTimezone
eventDays
rows
warnings
createdAt
lastUpdatedAt
version
```

The edit token must never be included in PublishedSchedule.

---

# 17. Organizer mobile dashboard

Design for approximately a 390 × 844 pixel viewport first.

Do not require horizontal scrolling on mobile.

## 17.1 Header summary

Display:

- Tournament name
- Tournament date or range
- Club name
- Local capture timestamp
- Published timestamp when applicable
- Number of unique students
- Number of category entries
- Next student
- Next start time
- Next Tatami
- Outstanding review count

## 17.2 Primary organizer actions

- Now and Next
- All Schedule
- Students
- Capture / Refresh Data
- Open Tournament
- Open Timetable
- Publish Schedule
- Sharing Options
- Change Tournament

## 17.3 Mobile schedule card

Each card must prominently display:

- Start time
- Tatami
- Student name
- Category name
- Pool
- Date
- Status

Make the Tatami and start time the most visually prominent values.

Both student name and category name must open the corresponding draw.

Use:

```html
target="_blank"
rel="noopener noreferrer"
```

## 17.4 Desktop table

On larger screens, display a sortable table with columns:

- Date
- Start
- End
- Tatami
- Student
- Category
- Pool
- Status

All meaningful columns must be sortable.

Default sort:

1. Date ascending
2. Start time ascending
3. Tatami ascending
4. Student ascending

---

# 18. Day tabs, filters, and sorting

Create tabs:

- All
- One tab for each tournament day

Default to All.

Allow sorting by:

- Student
- Category
- Date
- Start time
- End time
- Tatami
- Pool
- Status

Allow filtering by:

- Student
- Category
- Tatami
- Day
- Pool
- Starting within the configured threshold
- Review required
- Completed
- Upcoming
- In progress

Persist organizer sort and filter state for the current browser session.

Use the same filter and sort state for mobile cards and desktop tables.

---

# 19. Student View

Group all entries by student.

Sort students alphabetically.

Within each student, sort entries chronologically.

Each student summary must show:

- Student name
- Next category
- Next start time
- Next Tatami
- Total category entries
- All category cards
- Draw links

Provide student search.

---

# 20. Now and Next View

This is the most important live-tournament screen.

Display:

- Entries likely active now based on scheduled start and end time
- Entries starting within the next configured threshold, default 60 minutes
- The next five AMA entries
- Time remaining before each entry
- Tatami in large text
- Schedule conflicts where AMA students overlap on different Tatamis
- Rows requiring review

Statuses:

- Starts soon
- Starting now
- Likely in progress
- Completed by schedule
- Upcoming
- Time not available
- Review required

Do not rely only on colour. Use icons and text.

Recalculate statuses as time passes without requiring a page reload.

---

# 21. Manual entry and import fallbacks

The application must remain useful even if a parser cannot recognize a SportData page.

Provide:

- Add Student Entry manually
- Add Timetable Record manually
- Paste plain text
- Paste CSV
- Paste TSV
- Paste capture JSON
- Upload `.ama-capture.json`
- Upload `.ama-schedule.json`
- Upload saved HTML for local parsing
- Edit every schedule row
- Delete an incorrect row
- Select a pool manually
- Select a Tatami manually
- Select a date and time manually
- Enter or correct a draw URL manually

Supported CSV/TSV columns:

```text
studentName
categoryName
categoryId
categoryCode
pool
tatami
eventDate
startTime
endTime
drawUrl
```

Only `studentName` and `categoryName` are mandatory for initial import.

Validate all imported data and show row-level errors.

---

# 22. Local PWA and offline behaviour

The application must be installable as a PWA and usable as a normal website.

Provide:

- Web app manifest
- App icons
- Service worker
- Offline shell
- IndexedDB persistence
- Offline organizer schedule
- Offline shared schedule cache

Organizer startup behaviour:

1. Load current local tournament from IndexedDB.
2. Restore the current schedule and settings.
3. Show an offline warning when appropriate.
4. Never erase valid local data because a network request fails.

The current tournament URL and schedule must survive:

- Browser refresh
- Closing and reopening the browser
- Phone restart
- Reopening the installed PWA

---

# 23. Publishing the shared schedule

The organizer must be able to publish the final normalized schedule so colleagues can view it from any modern browser.

Add a prominent action:

```text
Publish Schedule
```

When selected:

1. Validate the normalized schedule.
2. Warn about unresolved rows.
3. Allow publishing resolved rows while clearly excluding unresolved rows.
4. Generate a cryptographically secure random public share ID with at least 128 bits of entropy.
5. Generate a separate cryptographically secure edit token with at least 128 bits of entropy.
6. Upload only the normalized PublishedSchedule payload.
7. Store the edit token only in IndexedDB on the organizer's device.
8. Store only a secure hash of the edit token on the server.
9. Never put the edit token in the sharing URL.
10. Return a sharing URL such as:

   ```text
   https://ama-tatami-planner.vercel.app/s/{shareId}
   ```

11. Keep the same sharing URL when the organizer updates the same tournament.
12. Replace the published schedule atomically.
13. Show:
    - Published successfully
    - Sharing URL
    - Last updated timestamp
    - Number of students
    - Number of category entries

Do not use sequential IDs, event IDs, student names, club names, or predictable values as the share ID.

Display this organizer notice:

```text
Anyone with this link can view the published tournament schedule. Share it only with trusted AMA coaches.
```

---

# 24. Organizer sharing actions

After publication, display:

- Copy Sharing Link
- Share
- Share through WhatsApp
- Show QR Code
- Open Shared View
- Update Published Schedule
- Unpublish Schedule

All actions must be easy to use on a phone.

## 24.1 Copy Sharing Link

- Copy only the public read-only URL.
- Never copy the edit token.
- Show:

  ```text
  Sharing link copied
  ```

- Provide a manual-copy fallback if Clipboard API access is unavailable.

## 24.2 General Share action

Use `navigator.share` when supported.

Share:

- Tournament name
- Club name
- Last-updated time
- Public sharing URL

Provide clipboard fallback.

## 24.3 Share through WhatsApp

Create a properly URL-encoded WhatsApp sharing action.

Suggested message:

```text
AMA Tournament Schedule

The Arun Martial Arts tournament schedule is available here:

{SHARING_URL}

Last updated: {FORMATTED_LAST_UPDATED}

Open the link to see the latest student, category, Tatami, pool, and start-time information.
```

Requirements:

- Include the public schedule link.
- Include the actual last-updated date and time.
- Do not include the edit token.
- Do not include raw capture data.
- Provide Copy Message fallback.

## 24.4 Show QR Code

Open a phone-friendly modal.

Generate the QR code locally in the browser.

The QR code must contain only the public read-only sharing URL.

Do not use an external QR-code web service.

Display:

- Tournament name
- Club name
- QR code
- Sharing URL
- Last-updated time

Include:

- Copy Link
- Share
- Full-screen display
- Close

Use high contrast, a plain background, and a sufficiently large code for phone-to-phone scanning.

## 24.5 Update Published Schedule

When the organizer republishes the current tournament:

- Require the locally stored edit token.
- Keep the same public share URL.
- Replace the schedule atomically.
- Increment the schedule version.
- Update `lastUpdatedAt`.
- Do not create a historical version.

## 24.6 Unpublish Schedule

This is a destructive organizer action.

Confirmation text:

```text
Unpublish this schedule?

Other coaches will immediately lose access to this tournament schedule. Your local working copy will remain on this device.
```

On confirmation:

1. Send the edit token securely to the server.
2. Validate it server-side.
3. Delete or invalidate the published schedule.
4. Keep the organizer's local working schedule.
5. Remove local publish metadata after success.
6. Show:

   ```text
   Schedule unpublished
   ```

The former public URL must display:

```text
This tournament schedule is no longer available. Please request the latest link from the AMA coach.
```

Use the same generic unavailable response for nonexistent and unpublished share IDs.

---

# 25. Shared Coach View

Route:

```text
/s/{shareId}
```

This page is public to anyone with the unguessable link and is strictly read-only.

It must work in current mobile versions of:

- Chrome
- Safari
- Firefox
- Samsung Internet
- Edge

It must not require:

- Login
- Access code
- Firefox
- Userscript
- PWA installation

Display:

- Tournament name
- Tournament date or date range
- Club name
- Last updated timestamp
- Last checked timestamp
- Manual Refresh button
- Automatic-refresh status
- Now and Next
- All Schedule
- Student View
- Day tabs
- Student filter
- Category filter
- Tatami filter
- Draw links
- Timetable link

The shared page must not allow viewers to:

- Change the tournament
- Import data
- Upload files
- Modify students
- Modify categories
- Change pools
- Change Tatamis
- Change times
- Publish
- Unpublish
- Access organizer settings
- View or obtain the edit token

The shared page must be mobile-first and must not require horizontal scrolling.

---

# 26. Last-updated and last-checked information

Store `lastUpdatedAt` as an ISO UTC timestamp.

Display it in the configured tournament timezone.

Examples:

```text
Last updated at 8:35 AM
```

and, where space allows:

```text
Last updated October 18, 2026 at 8:35 AM
```

Also show a relative age when useful:

```text
2 minutes ago
```

Organizer labels:

```text
Captured locally: October 18, 2026 at 8:31 AM
Published: October 18, 2026 at 8:35 AM
```

Shared-view labels:

```text
Last updated at 8:35 AM
Checked just now
```

Do not display the viewer's check time as if it were the schedule's update time.

If a refresh finds no changes, keep the original `lastUpdatedAt` unchanged.

---

# 27. Automatic refresh on shared screens

Default interval:

```text
45 seconds
```

The code-level configuration must allow 30–60 seconds, but never less than 30 seconds.

Automatic-refresh behaviour:

1. Start after the initial schedule loads.
2. Check every 45 seconds by default.
3. Pause when:
   - The tab is hidden
   - The page is backgrounded
   - The device is offline
4. Resume when:
   - The tab becomes visible
   - The page returns to the foreground
   - Connectivity returns
5. Perform an immediate refresh after the page returns to the foreground following more than 30 seconds hidden.
6. Prevent overlapping requests.
7. Use a request timeout.
8. Use bounded exponential backoff for temporary failures.
9. Do not retry permanent unavailable responses continuously.
10. Preserve the last working schedule during temporary failures.
11. Show:

   ```text
   Unable to check for updates. Showing the last available schedule.
   ```

12. Resume normal polling after recovery.
13. Minimize network traffic using conditional requests.

Use one of:

- ETag and `If-None-Match`
- `If-Modified-Since`
- A lightweight version endpoint

Prefer ETag and HTTP 304.

When unchanged:

- Return HTTP 304.
- Do not redownload the full payload.
- Update only the Checked indicator.

When changed:

1. Validate the response with Zod.
2. Replace the displayed schedule atomically.
3. Preserve the viewer's current:
   - View
   - Day tab
   - Filters
   - Sort selection
4. Update Last updated.
5. Show:

   ```text
   Schedule updated
   ```

6. Briefly identify changed rows without relying only on colour.
7. Recalculate statuses and conflicts.

Display a subtle status such as:

```text
Auto-refresh: On · Every 45 seconds
```

Possible states:

- Auto-refresh on
- Checking for updates
- Updated just now
- No changes
- Offline
- Reconnecting
- Schedule unavailable

Do not use a distracting persistent countdown.

---

# 28. Manual Refresh button

Add a visible **Refresh** button near the Last updated text.

Example mobile header:

```text
AMA Tournament Schedule

Last updated at 8:35 AM
Checked just now                         [Refresh]
```

On tap:

1. Immediately request the latest schedule.
2. Disable the button while running.
3. Show a spinner and accessible text:

   ```text
   Checking for updates
   ```

4. Prevent duplicate concurrent requests.
5. If updated:
   - Validate and replace atomically.
   - Show `Schedule updated`.
6. If unchanged:
   - Show `You already have the latest schedule`.
7. If failed:
   - Keep the existing schedule visible.
   - Show:

     ```text
     Could not check for updates. The last available schedule is still shown.
     ```

8. After success, show `Checked just now`.
9. Use an `aria-live` region for results.

---

# 29. Shared-view offline cache

Cache the latest successfully viewed published schedule in IndexedDB on the colleague's device.

On shared-page load:

1. Request the latest schedule.
2. If successful:
   - Display it.
   - Cache it.
3. If the network fails and a cache exists:
   - Display the cached schedule.
   - Show:

     ```text
     Offline — showing the schedule last updated at 8:35 AM
     ```

4. Pause automatic refresh while offline.
5. Keep the Refresh button visible.
6. On reconnect:
   - Refresh immediately.
   - Resume 45-second polling.

Never cache or expose the organizer's edit token in the Shared Coach View.

---

# 30. Cloud storage and serverless API

Use a minimal Vercel serverless backend only for publishing and reading the normalized schedule.

Recommended storage:

- Upstash Redis through Vercel Marketplace
- Or an equivalent Vercel-compatible managed key-value store

Store only:

- Random public share ID
- Hashed edit token
- Current normalized PublishedSchedule payload
- Schema version
- Created timestamp
- Last-updated timestamp
- Schedule version or ETag source value

Do not store:

- Raw SportData HTML
- SportData cookies
- CAPTCHA data
- Verification data
- SportData sessions
- Previous tournament versions
- Tournament history
- Organizer browser history

## 30.1 Suggested key model

```text
ama:schedule:{shareId}
ama:rate-limit:{scope}:{identifier}
```

Updating a schedule must overwrite the current record atomically.

Unpublishing must delete or invalidate the current record.

## 30.2 API routes

Implement endpoints similar to:

### Create

```text
POST /api/schedules
```

Purpose:

- Create first published schedule.

Returns:

```text
shareId
editToken
shareUrl
lastUpdatedAt
version
```

### Update

```text
PUT /api/schedules/{shareId}
```

Require:

```text
Authorization: Bearer {editToken}
```

Purpose:

- Update the existing current schedule.

### Delete / unpublish

```text
DELETE /api/schedules/{shareId}
```

Require:

```text
Authorization: Bearer {editToken}
```

Purpose:

- Unpublish the schedule.

### Read

```text
GET /api/schedules/{shareId}
```

Purpose:

- Public read-only schedule access.

Support:

- ETag
- `If-None-Match`
- HTTP 304
- Appropriate cache headers

Do not create a public listing endpoint.

Do not implement:

```text
GET /api/schedules
```

---

# 31. Security requirements

Even though there is no login, apply strong security controls.

## 31.1 Identifiers and edit authorization

- Generate share IDs with cryptographically secure randomness.
- Use at least 128 bits of entropy.
- Generate edit tokens independently from share IDs.
- Use at least 128 bits of entropy.
- Never include edit tokens in URLs.
- Store edit tokens only on the organizer's device.
- Hash edit tokens before server storage.
- Use timing-safe comparison.
- Never log edit tokens.

## 31.2 Validation and limits

Apply:

- Strict Zod validation
- Maximum request-body size
- Maximum schedule-row count
- Maximum string lengths
- Allowed URL validation for SportData links
- Duplicate-row checks
- Rate limiting for create, update, delete, and read
- Safe error messages
- Server-side sanitization

## 31.3 HTTP and browser security

Apply:

- Content Security Policy
- Referrer-Policy
- X-Content-Type-Options
- Frame-ancestor restrictions where appropriate
- Same-origin write requests
- No cross-origin write access
- Generic unavailable responses

Add to shared pages:

```html
<meta name="robots" content="noindex,nofollow,noarchive" />
```

Also return:

```text
X-Robots-Tag: noindex, nofollow, noarchive
```

Do not expose a sitemap entry for shared URLs.

## 31.4 Organizer device limitation

Because there is no account system, the edit token stored on the organizer's device is the only update/unpublish credential.

Document clearly:

- Clearing browser storage can remove the ability to update or unpublish an existing link.
- Provide an optional **Export Organizer Recovery File** containing only the share ID and edit token.
- Warn that this recovery file is private and must not be shared.
- Provide **Import Organizer Recovery File** on another trusted organizer device.
- Never place the recovery information in the public share link.

This recovery feature must remain optional and simple.

---

# 32. Notifications, calendar, and sharing utilities

Provide:

- Next 60 Minutes filter
- Optional browser notification while the PWA is open
- Configurable notification threshold
- Add to Calendar
- Download ICS
- Copy event details
- Share event details through `navigator.share` when supported
- WhatsApp-friendly text summary
- Export CSV
- Export `.ama-schedule.json`
- Import `.ama-schedule.json`
- Printable schedule view

Do not claim reliable closed-app background notifications across all mobile platforms.

A WhatsApp-friendly schedule summary should resemble:

```text
AMA TOURNAMENT SCHEDULE

8:55 AM — Tatami 7
Eishaan — U12 Male Kata
Pool 1

10:15 AM — Tatami 7
Eishaan — U12 Male Kumite -35 kg
```

---

# 33. Error handling

Provide clear user-facing errors for:

- Invalid tournament URL
- Missing event ID
- Unsupported SportData URL
- Verification page still displayed
- Unknown captured page type
- No club matches found
- Ambiguous club match
- Entries capture missing
- Timetable capture missing
- Tournament day not captured
- Draw capture missing
- Student not found in draw
- Pool ambiguous
- Tatami ambiguous
- Category not found in timetable
- Invalid JSON
- Invalid CSV or TSV
- Invalid HTML file
- Duplicate row
- IndexedDB failure
- Publish failure
- Invalid or lost edit token
- Rate limit reached
- Shared schedule unavailable
- Offline mode
- Temporary refresh failure

Never expose stack traces, Redis credentials, tokens, or internal implementation details to normal users.

Keep last valid local and shared data visible during temporary failures.

---

# 34. Accessibility

Target WCAG 2.2 AA where reasonably practical.

Include:

- Large phone-friendly touch targets
- Proper labels
- Semantic buttons
- Accessible tabs
- Accessible tables
- Keyboard navigation
- Visible focus indicators
- Sufficient contrast
- Screen-reader announcements
- `aria-live` updates for import, capture, publish, and refresh status
- Status text in addition to colour
- Reduced-motion support
- Accessible modal dialogs
- Accessible QR-code dialog

---

# 35. Test fixtures

Create sanitized static fixtures representing:

- Verification page
- Tournament event page
- All-entries page
- Category participant page
- Single-day timetable
- Multi-day timetable
- One-pool category
- Two-pool category
- Different start times for different pools
- Simultaneous pools on different Tatamis
- Kata draw
- Kumite draw
- Double elimination
- Repechage
- Final
- Team category
- Club-name variations
- Duplicate participant appearances
- Ambiguous athlete names
- Missing draw
- Missing category
- Unrecognized page layout

Automated tests must not depend on live SportData pages.

The sample event URL may be included in documentation for manual testing, but do not hard-code its tournament data.

---

# 36. Unit and integration tests

Add tests for:

## 36.1 URL and configuration

- Event-ID extraction
- Host allow-listing
- HTTPS enforcement
- Unsupported URL rejection
- Club normalization
- Club alias matching
- AMA substring false-positive prevention

## 36.2 Parsers

- Entries parsing
- Club filtering
- Team-member extraction
- Timetable parsing
- Multi-day parsing
- Draw parsing
- Pool selection
- Repechage exclusion
- Final exclusion
- Name normalization
- Duplicate removal
- Unknown layout warnings

## 36.3 Mapping

- Single-pool mapping
- Multi-pool mapping
- Pool-to-Tatami mapping
- Different start-time mapping
- Ambiguity handling
- Manual override precedence
- Stable row IDs

## 36.4 Local persistence

- IndexedDB save and restore
- Tournament replacement
- Clearing previous tournament
- Preserving last valid schedule on import failure
- Local publish metadata
- Recovery-file export/import

## 36.5 Publishing and security

- Secure share ID generation
- Secure edit-token generation
- Edit-token hashing
- Unauthorized update rejection
- Unauthorized unpublish rejection
- Payload limits
- URL allow-listing
- Publication
- Atomic update
- Same URL retained for current tournament
- Unpublish behaviour
- Previous-link invalidation after tournament change
- ETag generation
- HTTP 304 handling
- No public listing endpoint
- Edit token absent from public payloads

## 36.6 Refresh and sharing

- Timestamp formatting
- Tournament timezone display
- Automatic-refresh interval
- Polling paused while hidden
- Polling resumed when visible
- Polling paused while offline
- Immediate refresh after reconnection
- No overlapping requests
- Manual Refresh button
- No-change response
- Temporary failure fallback
- Cached offline schedule
- Copy Sharing Link
- WhatsApp URL generation
- Native Share fallback
- QR-code content
- QR code contains only the public URL

---

# 37. Playwright end-to-end tests

Test mobile and desktop viewports.

Include scenarios for:

1. Initial organizer setup.
2. Saving the tournament URL.
3. Persistence after refresh.
4. Importing capture JSON.
5. Manual student and timetable entry.
6. Review and correction.
7. Day tabs.
8. All View.
9. Student View.
10. Now and Next.
11. Sorting.
12. Filtering.
13. Student and category draw links.
14. Timetable link.
15. Changing tournaments.
16. Removing old local data.
17. Offline organizer display.
18. Publishing a schedule.
19. Copying the sharing link.
20. Generating the WhatsApp message.
21. Displaying a QR code.
22. Opening the shared link on a mobile viewport.
23. Showing the correct Last updated time.
24. Organizer updating and republishing.
25. Shared page receiving an automatic update.
26. Shared page manual Refresh.
27. No-change Refresh result.
28. Preserving selected tabs and filters after refresh.
29. Offline shared-page cache.
30. Unpublishing.
31. Shared unavailable message.
32. Shared page contains no organizer actions.
33. Edit token absent from HTML, logs, and URLs.
34. Organizer recovery export/import.

---

# 38. Documentation

Write documentation for a non-programmer.

Create:

- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/PHONE_SETUP.md`
- `docs/CAPTURE_WORKFLOW.md`
- `docs/VERCEL_DEPLOYMENT.md`
- `docs/TROUBLESHOOTING.md`
- `docs/PARSER_MAINTENANCE.md`
- `docs/SHARING_AND_PRIVACY.md`

Do not create permission-request or compliance-mode documents.

## 38.1 README requirements

Include exact steps for:

1. Installing Node.js.
2. Installing the package manager.
3. Running locally.
4. Creating a GitHub repository.
5. Creating the Upstash Redis database through Vercel Marketplace.
6. Setting environment variables.
7. Deploying to Vercel Hobby.
8. Installing Firefox on Android.
9. Installing a supported userscript manager.
10. Installing `ama-sportdata-helper.user.js`.
11. Entering a tournament URL.
12. Completing SportData verification normally.
13. Capturing the entries page.
14. Capturing each timetable day.
15. Capturing relevant draw pages.
16. Importing capture JSON.
17. Correcting a pool manually.
18. Installing the PWA.
19. Using Now and Next.
20. Publishing the schedule.
21. Sharing through WhatsApp.
22. Showing the QR code.
23. Updating the shared schedule.
24. Unpublishing.
25. Exporting and importing the organizer recovery file.
26. Replacing the tournament.
27. Troubleshooting.

## 38.2 Parser maintenance documentation

Explain:

- How page-type detection works
- How selectors are organized
- How to add a new fixture
- How to update selectors safely
- How to avoid weakening conservative name or club matching
- How to run parser tests

---

# 39. Environment variables

At minimum support:

```text
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
NEXT_PUBLIC_APP_URL
```

Optional non-secret configuration may include:

```text
NEXT_PUBLIC_DEFAULT_TIMEZONE=America/Toronto
NEXT_PUBLIC_DEFAULT_AUTO_REFRESH_SECONDS=45
MAX_PUBLISHED_ROWS=500
MAX_PUBLISH_PAYLOAD_BYTES=500000
```

Do not add coach access-code variables.

Do not add SportData credentials.

Do not add permission-confirmation variables.

Provide `.env.example` without secrets.

---

# 40. Required scripts

Provide working package scripts similar to:

```text
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm typecheck
pnpm test
pnpm test:watch
pnpm test:e2e
pnpm userscript:check
pnpm userscript:build
pnpm format
pnpm format:check
```

If another package manager is selected, keep equivalent commands and document them consistently.

Every documented command must exist and work.

---

# 41. Tomorrow-first implementation order

Implement in this order so the application becomes useful as early as possible.

## Phase 1 — Immediately usable organizer MVP

- Next.js application shell
- Tournament URL input
- URL validation and event-ID extraction
- Club settings
- IndexedDB persistence
- Manual Student + Category entry
- Manual date, time, pool, Tatami, and draw URL entry
- Mobile schedule cards
- Day tabs
- Sorting and filtering
- Student View
- Now and Next View
- Timetable link
- Offline PWA
- CSV and JSON import/export

The app must remain usable with manual data even if later parser phases fail.

## Phase 2 — Capture helper and page parsing

- Userscript
- Verification-page detection
- Explicit Capture button
- Entries capture
- Timetable capture
- Capture-session summary
- Clipboard export
- JSON-file export
- PWA capture import
- Sanitized parser fixtures
- Unit tests

## Phase 3 — Exact pool and Tatami mapping

- Draw capture
- Conservative student-name matching
- Initial-pool detection
- Pool-to-Tatami mapping
- Review workflow
- Manual overrides
- Possible Later Rounds

## Phase 4 — Shared schedule

- Upstash-backed API
- Secure share IDs
- Secure edit tokens
- Publish/update/unpublish
- Read-only shared route
- Copy link
- Native Share
- WhatsApp
- QR code
- Last updated
- ETag
- 45-second automatic refresh
- Manual Refresh
- Offline shared cache
- Recovery-file export/import

## Phase 5 — Hardening and polish

- Full accessibility pass
- Playwright coverage
- Security headers
- Rate limiting
- Payload limits
- Documentation
- Production build verification

---

# 42. Acceptance criteria

The project is complete only when all of the following are true:

1. It deploys successfully to Vercel.
2. It is suitable for a personal non-commercial hobby project.
3. It has no coach login.
4. It has no access code.
5. It has no password system.
6. It has no SportData API dependency.
7. It has no server-side SportData scraper.
8. It never bypasses SportData verification.
9. The user completes verification manually.
10. The helper captures only a visible page after an explicit user tap.
11. The helper does not automatically navigate.
12. The helper does not read or transfer cookies.
13. The default club is Arun Martial Arts(AMA).
14. Club aliases are configurable.
15. The organizer can paste a SportData tournament URL.
16. The event ID is extracted correctly.
17. One row is produced per Student + Category.
18. Multi-day tournaments have All and day tabs.
19. The default schedule is chronological.
20. All meaningful columns can be sorted.
21. Student and category names open the correct draw.
22. A separate timetable link is present.
23. Exact student pool is determined when possible.
24. Pool maps to the correct Tatami and start time.
25. Ambiguous mappings are not silently guessed.
26. Manual correction is always available.
27. Student View works.
28. Now and Next works.
29. The Next 60 Minutes filter works.
30. The application is mobile-first.
31. The organizer schedule works offline after setup.
32. The current tournament persists after browser and phone restart.
33. Only one current tournament is retained.
34. Changing tournaments removes prior local data.
35. Changing tournaments invalidates the prior shared schedule.
36. No tournament history is retained.
37. The organizer can publish a normalized schedule.
38. Publication generates an unguessable public URL.
39. The edit token is separate and never in the public URL.
40. The organizer can copy the sharing link.
41. The organizer can share through WhatsApp.
42. The organizer can use native Share where supported.
43. The organizer can display a local QR code.
44. The QR code contains only the public URL.
45. Other coaches can open the shared link from any supported phone browser.
46. Other coaches need no userscript or Firefox.
47. Other coaches need no login or access code.
48. The shared page is read-only.
49. The shared page displays the actual Last updated time.
50. The shared page automatically checks every 45 seconds by default.
51. The refresh interval remains between 30 and 60 seconds.
52. Automatic refresh pauses while hidden or offline.
53. Automatic refresh resumes on foreground or reconnection.
54. The manual Refresh button works.
55. A no-change refresh reports that the schedule is current.
56. Temporary failures preserve the last schedule.
57. Shared schedules can be viewed from cache while offline.
58. Republishing the same tournament keeps the same share URL.
59. Unpublishing immediately removes shared access.
60. Shared viewers cannot edit the schedule.
61. No raw SportData HTML, cookies, or verification data are uploaded.
62. No permission-request template exists.
63. No compliance mode exists.
64. Tests pass.
65. Strict TypeScript checking passes.
66. Linting passes.
67. The production build passes.
68. There are no hard-coded secrets.
69. Documentation is complete and usable by a non-programmer.

---

# 43. Final execution requirements for the coding agent

After implementation:

1. Install dependencies.
2. Run formatting checks.
3. Run linting.
4. Run strict TypeScript checking.
5. Run unit and integration tests.
6. Run Playwright tests.
7. Run the production build.
8. Fix every failure.
9. Present the final repository tree.
10. Summarize the implemented user workflow.
11. Provide exact local-run steps.
12. Provide exact Vercel deployment steps.
13. Provide exact Upstash setup steps.
14. Provide exact Firefox Android userscript installation steps.
15. Provide exact first-tournament capture steps.
16. Provide exact publishing and WhatsApp-sharing steps.
17. Clearly list any genuine parser limitations.
18. Do not claim unfinished functionality is complete.

The final product must prioritize a dependable tournament-day experience: the coach should be able to glance at the phone and immediately understand which AMA student is next, the scheduled start time, and the correct Tatami.
