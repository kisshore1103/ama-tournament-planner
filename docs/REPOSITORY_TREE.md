# Source repository tree

Generated build output, dependency/browser caches, private files and test artifacts are ignored and omitted.

```text
ama-tournament-planner/
├── app/
│   ├── api/
│   │   └── schedules/
│   │       ├── [shareId]/
│   │       │   └── route.ts
│   │       └── route.ts
│   ├── offline/
│   │   └── page.tsx
│   ├── organizer/
│   │   └── page.tsx
│   ├── s/
│   │   └── [shareId]/
│   │       └── page.tsx
│   ├── shared-offline/
│   │   └── page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx
│   └── sw.ts
├── components/
│   ├── organizer/
│   │   ├── CaptureWorkflow.tsx
│   │   ├── EntryForm.tsx
│   │   ├── Organizer.tsx
│   │   └── SharingPanel.tsx
│   ├── schedule/
│   │   └── ScheduleBoard.tsx
│   ├── shared/
│   │   ├── OfflineShared.tsx
│   │   └── SharedSchedule.tsx
│   └── ui/
│       └── Fields.tsx
├── docs/
│   ├── ARCHITECTURE.md
│   ├── CAPTURE_WORKFLOW.md
│   ├── PARSER_MAINTENANCE.md
│   ├── PHONE_SETUP.md
│   ├── REPOSITORY_TREE.md
│   ├── SHARING_AND_PRIVACY.md
│   ├── TROUBLESHOOTING.md
│   └── VERCEL_DEPLOYMENT.md
├── fixtures/
│   └── sportdata/
│       ├── ambiguous-draw.html
│       ├── double-elimination.html
│       ├── draw.html
│       ├── entries.html
│       ├── event.html
│       ├── grid.html
│       ├── missing-fields.html
│       ├── participants.html
│       ├── README.md
│       ├── timetable.html
│       ├── unknown.html
│       └── verification.html
├── lib/
│   ├── capture/
│   │   ├── helper.ts
│   │   ├── import.ts
│   │   └── schema.ts
│   ├── db/
│   │   └── local.ts
│   ├── export/
│   │   └── files.ts
│   ├── parser/
│   │   └── dom.ts
│   ├── publish/
│   │   ├── api.ts
│   │   ├── client.ts
│   │   ├── poller.ts
│   │   └── store.ts
│   ├── schedule/
│   │   ├── core.ts
│   │   └── mapping.ts
│   ├── security/
│   │   └── tokens.ts
│   ├── time/
│   │   └── checked.ts
│   └── validation/
│       └── models.ts
├── public/
│   ├── icons/
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   ├── ama-sportdata-helper.user.js
│   └── manifest.webmanifest
├── scripts/
│   ├── browsers.mjs
│   ├── e2e.mjs
│   ├── icons.mjs
│   ├── userscript-build.mjs
│   └── userscript-check.mjs
├── tests/
│   ├── e2e/
│   │   ├── capture.spec.ts
│   │   ├── hardening.spec.ts
│   │   ├── organizer.spec.ts
│   │   └── sharing.spec.ts
│   ├── integration/
│   │   └── storage.test.ts
│   ├── unit/
│   │   ├── api.test.ts
│   │   ├── core.test.ts
│   │   ├── helper.test.ts
│   │   ├── mapping.test.ts
│   │   ├── parser.test.ts
│   │   └── poller.test.ts
│   └── setup.ts
├── userscripts/
│   └── ama-sportdata-helper.user.js
├── .env.example
├── .gitignore
├── .npmrc
├── .prettierignore
├── .prettierrc.json
├── AGENTS.md
├── BUILD_PROMPT.md
├── eslint.config.mjs
├── IMPLEMENTATION_PLAN.md
├── next-env.d.ts
├── next.config.ts
├── package-lock.json
├── package.json
├── playwright.config.ts
├── postcss.config.mjs
├── README.md
├── STATUS.md
├── tsconfig.json
├── vercel.json
└── vitest.config.ts
```
