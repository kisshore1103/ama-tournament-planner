# AMA Tatami Planner — Codex Working Instructions

## Project boundary

- Work only inside this repository.
- Treat the current repository root as the only writable project directory.
- Do not read, edit, delete, rename, or run Git commands in parent or sibling directories.
- Do not access or modify any other application or repository on this computer.
- Never use destructive cleanup commands outside this repository.

## Product specification

- Read `BUILD_PROMPT.md` completely before beginning implementation.
- Treat `BUILD_PROMPT.md` as the authoritative product specification.
- Do not modify, shorten, replace, rename, or delete `BUILD_PROMPT.md`.
- Map implementation work to the requirements and acceptance criteria in that file.

## Implementation process

- Create an implementation plan before creating application files.
- Implement the application phase by phase.
- Keep all generated files inside this repository.
- Run linting, type checking, tests, and production builds.
- Use Git checkpoints after stable implementation phases.
- Do not commit secrets, `.env.local`, tokens, credentials, or private keys.
- Create `.env.example` for required environment variables.

## When to pause

Pause only when an action genuinely requires:

- Account credentials
- A Vercel account action
- A cloud-database account action
- A secret or API key
- A decision not addressed by `BUILD_PROMPT.md`