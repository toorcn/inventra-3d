# Inventra — Codex Agent Instructions

You are working in **Inventra**, a **Next.js (App Router) + React** app for exploring a curated inventions dataset on an interactive **3D globe**, with optional **3D “exploded view”** models and an **AI expert chat** panel.

## North Star

- Preserve the demo’s “wow” factor (globe + viewer) while keeping changes **small, typed, and testable**.
- Keep the app functional **without** an API key (chat/search fall back to offline heuristics/baseline text).

## Quick Commands (npm)

- Install: `npm install`
- Dev: `npm run dev`
- Tests: `npm test` (Vitest)
- Build: `npm run build`

`package-lock.json` is present — prefer **npm** unless the repo is intentionally migrated.

## Environment

- `OPENROUTER_API_KEY` (optional): enables real AI responses + structured search parsing.
- `NEXT_PUBLIC_APP_URL` (optional): used for OpenRouter request headers; defaults to `http://localhost:3000`.
- Never print or commit secrets; if you add new env vars, update `README.md` and `.env.local` comments.

## Project Map

- `src/app/*`: Next.js App Router pages/layouts (many are client components).
- `src/app/api/*/route.ts`: server routes.
  - `chat`: returns **plain text** (streamed via `ReadableStream`).
  - `search`: returns **JSON** with `filters`, `explanation`, and `inventions`.
- `src/components/*`: UI + globe + viewer + expert chat components (Tailwind).
- `src/data/*`: static datasets (inventions, components, categories, countries).
- `src/lib/*`: OpenRouter client, search parsing, invention context builders (has unit tests).
- `src/types/index.ts`: shared types; keep data and API payloads aligned with these.

## Coding Conventions

- TypeScript is **strict**. Prefer `import type` where appropriate and keep types accurate.
- Use the `@/*` path alias for imports from `src/*`.
- Match existing formatting: **double quotes**, **semicolons**, and readable multi-line objects/args.
- Tailwind CSS v4 is used (see `src/app/globals.css`). Prefer existing CSS variables (e.g. `--bg-panel`, `--text-secondary`) and existing component patterns in `src/components/ui/*`.

## Client vs Server Boundaries (important)

- Anything using hooks, browser APIs, `three`, `react-globe.gl`, or R3F **must** stay in a `"use client";` file.
- Avoid importing heavy 3D dependencies into server routes or server components.

## AI / OpenRouter Behavior

- `src/lib/openrouter.ts` provides offline fallbacks when `OPENROUTER_API_KEY` is missing:
  - Keep that offline behavior intact unless explicitly changing product requirements.
- `structuredOutput()` is only valid when the key exists; call sites should gracefully degrade.

## Tests

- Unit tests live in `src/lib/__tests__` (Vitest, jsdom).
- When changing parsing/context logic, add/update tests near the affected module.

## Data Hygiene

- Treat `src/data/*` as curated content: keep IDs stable and maintain `inventionId` ↔ component relationships.
- Prefer adding small, well-typed entries over broad rewrites.
