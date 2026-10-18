# Implementation plan

Authoritative specification: `BUILD_PROMPT.md`, read completely before implementation. It will remain unchanged. Workspace and Git root: `C:\Kisshore\Projects\ama-tournament-planner`. All project work stays here. Existing commits and user files are preserved.

## Checkpoint 0 — plan and status

Record scope, requirements, verification, dependencies, and external actions. Commit this plan and `STATUS.md` before application files.

## Phase 1 — usable local organizer

Implement Next.js App Router, React, strict TypeScript, Tailwind, Zod models, Dexie single-current-tournament storage, URL validation, configurable aliases/timezone/threshold, manual student and timetable entry, editing/deleting, mobile cards, TanStack desktop table, All/day tabs, all column sorting, filters, Students, live Now and Next, conflicts, links, CSV/TSV/text/JSON fallbacks and exports. Add installable offline PWA with a maintained service-worker library, icons, manifest, local restore, calendar/ICS, print, details sharing and optional open-app notifications. A rejected import must preserve valid data. Checkpoint after local verification.

Specification mapping: §§1–8, 11 (setup/manual path), 16–22, 32–34, 39–41. Acceptance criteria (AC): 2–7, 13–22, 26–34, 36, 62–63, 68. Phase 4 completes shared invalidation for AC35. Tests: URL/club, schemas, time/status/conflicts, persistence/replacement, imports/exports; initial mobile/desktop journeys.

## Phase 2 — capture and entries/timetable parsing

Build explicit-tap visible-page-only SportData userscript, collapsible control, verification guard, page-type selection, local normalized session, summary/copy/download/clear. Share isolated parser code with local HTML import. Implement entries, team members, club confidence, timetable days/phases/links and structured warnings. Guided workflow shows capture coverage and preserves manual fallbacks. Add sanitized fixtures; no tests call SportData. Checkpoint after parser and helper checks.

Specification mapping: §§9–13, 21, 33, 35–36 (parsers), 38 (capture/parser guides), 40–41. AC8–12, 61. Also completes capture paths supporting AC13–22, 26. Never inspect challenge answers, use SportData network APIs, navigate automatically, export cookies, or upload HTML.

### Capture maintenance — loaded page incorrectly blocked

Investigate verification false positives reported on an ordinary visible draw. Restrict DOM verification evidence to visible content, excluding hidden widget remnants and the helper itself; continue blocking verification titles, visible challenge containers/frames and visible human-verification messages. Add synthetic parser/helper regressions, rebuild/version the userscript, document updating an installed script and run all release checks. The reported screenshot does not identify the exact matching element; confirm the installed update on the real page manually. This maintenance supports §§9–10, 33, 35–37 and AC8–12, 25–26, 64–67 without changing source access or manual fallback behavior.

## Phase 3 — exact pool mapping and review

Implement conservative normalized athlete/category matching, initial draw pool selection excluding finals/repechage/poolwinner rounds, category-ID-first timetable mapping, duplicate handling, stable IDs, review explanations, override precedence, missing-draw queue and optional Possible Later Rounds. Checkpoint after fixture/mapping/manual correction tests.

Specification mapping: §§11–16, 20–21, 33, 35–36, 41. AC17, 21, 23–26. Verify simultaneous pools/different times, unknown names/layouts, ambiguous names, single pool, teams, double elimination and repeat appearances.

## Phase 4 — secure current-schedule sharing

Implement Upstash REST Redis storage and create/read/update/delete Next.js API. Independent cryptographic share/edit credentials, hashed tokens, timing-safe authorization, atomic current-record replacement, strict normalized-only payload, no listing/history, bounded payloads, rate limits, same-origin writes and safe errors. Organizer publish resolved rows, stable URL update, unpublish confirmation, tournament replacement only after successful invalidation, optional private recovery export/import. Public read-only route uses same views/filters, local QR, clipboard/native/WhatsApp, timezone-aware actual publication time, ETag/304, 45-second active-only polling, timeout/backoff/no overlap, manual refresh, changed-row text and IndexedDB offline cache. Checkpoint after API/security/polling tests.

Specification mapping: §§2–4, 6, 23–31, 33–34, 36–37, 39–41. AC35, 37–61; also AC33–36, 68. Local API tests use an explicitly test-only local storage adapter; production requires Redis and must fail safely without credentials.

## Phase 5 — verification, documentation and deployment preparation

Complete security headers, accessibility/keyboard/dialog/reduced-motion review, sanitized fixtures and all required automated coverage. Run formatting, ESLint, strict TypeScript, Vitest unit/integration, userscript static/build checks, Playwright mobile/desktop and production build. Fix failures. Write all eight requested guides in plain language, including limitations and exact setup/deployment/capture/sharing/recovery steps. Review Git diff for secrets and specification integrity; commit stable verified result. Present final tree, workflow, commands, manual actions and limitations.

Specification mapping: §§31–43, plus verification of every preceding section. AC1 (deployment configuration locally; actual cloud deploy requires owner sign-in), 2, 30–32, 45–47, 62–69. No completion claim for unperformed cloud deployment or real-device manual validation.

## Acceptance coverage ledger

Every AC is assigned above; compact exhaustive index:

| Acceptance criteria | Primary phase                     |
| ------------------- | --------------------------------- |
| 1                   | 5 + owner Vercel deployment       |
| 2–7                 | 1 and architecture review in 5    |
| 8–12                | 2                                 |
| 13–22               | 1 (capture enrichment in 2–3)     |
| 23–25               | 3                                 |
| 26–34               | 1                                 |
| 35                  | 4                                 |
| 36                  | 1 and 4                           |
| 37–61               | 4                                 |
| 62–63               | all phases                        |
| 64–67               | every checkpoint, final gate in 5 |
| 68                  | all phases, final Git review      |
| 69                  | 5                                 |

## Local tools, dependencies and environment

- Installed: Node.js v24.21.0, npm 11.19.0 (`npm.cmd` on this Windows host), Git. Use npm consistently and commit lockfile. Do not change PowerShell execution policy or install global tools.
- Required packages: current stable compatible Next.js/React, TypeScript, Tailwind/PostCSS, Zod, Dexie, TanStack Table, date-fns/date-fns-tz, maintained PWA service-worker library, local QR library, Upstash Redis client, Vitest, fake-indexeddb, Playwright, ESLint, Prettier, userscript bundler and DOM test support. Resolve registry versions and document compatibility decisions.
- Download dependencies and Playwright browser into repository-local caches. Keep generated build/test artifacts ignored. No parent/sibling project access.
- `.env.example`: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `NEXT_PUBLIC_APP_URL`; optional default timezone/refresh and payload/row limits. `.env.local` and secrets always ignored. Organizer mode runs without cloud credentials.
- Local commands: `npm.cmd install`, `npm.cmd run dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:watch`, `test:e2e`, `userscript:check`, `userscript:build`, `format`, `format:check`. All will be implemented.

## Work Codex can complete locally

All application/source/test/fixture/documentation/build/config files, dependency installation, browser test setup, automated checks, repository-local Git commits, offline/cache verification and deployment-ready configuration. No SportData access needed for automated tests. No external account needed for manual organizer workflows.

## Owner-only external actions

1. GitHub: sign in, create/select remote repository and authorize pushing if needed; no repository/account changes outside this local repo are assumed.
2. Vercel: sign in, import GitHub repository, select Hobby project, set application URL and environment values, deploy and confirm HTTPS/installability.
3. Upstash: through Vercel Marketplace, create/connect a Redis database and supply server-only REST URL/token. No live publish/deploy claim until these exist.
4. Mozilla/phone: install Firefox Android and a supported userscript manager, install the generated helper, manually open SportData and complete verification; no Mozilla account is required for normal installation. Safari/Chrome PWA installation and physical QR scanning require a phone.
5. First tournament: manually capture real entries, each timetable day and relevant draws; validate layouts against sanitized fixtures and correct unresolved rows. No live source content is invented.

Pause only for credentials/account actions or genuine uncovered product decisions. Continue all independent local implementation while those remain external.
