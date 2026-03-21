# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # start dev server at localhost:3000
npm run build      # production build
npm run start      # start production server
npm test           # run vitest once
npm run test:watch # vitest in watch mode
```

To run a single test file: `npx vitest run src/lib/__tests__/search-parser.test.ts`

## Configuration

Create `.env.local` to enable real AI responses:

```bash
OPENROUTER_API_KEY=...         # enables AI chat + structured search parsing
NEXT_PUBLIC_APP_URL=http://localhost:3000  # optional, for OpenRouter headers
```

Without `OPENROUTER_API_KEY`, chat and search fall back to offline heuristics gracefully.

## Architecture

**Next.js App Router** with two main routes:
- `src/app/page.tsx` — globe + discovery side panel
- `src/app/invention/[id]/page.tsx` — invention detail, 3D viewer, AI chat panel

**API routes** (server-side):
- `POST /api/chat` — builds a system prompt from invention/component context, calls OpenRouter, streams plain text back
- `POST /api/search` — parses natural language query (via `parseSearchQuery`), applies filters, returns matching inventions

**Data layer** (`src/data/`): All static TypeScript datasets — no database. `inventions.ts` is the canonical list; `invention-components.ts` defines the 3D component breakdown per invention; `models.ts` maps inventions to procedural geometry configs.

**3D models are all procedural primitives** (box, sphere, cylinder, torus, etc.) defined in `src/data/models.ts` — no `.glb` assets. `GeometryDef` in `src/types/index.ts` describes the geometry spec.

**Globe** (`src/components/globe/`): Uses `react-globe.gl` (client-only, wrapped in `Globe.tsx` → `GlobeClient.tsx`). Loads country GeoJSON and textures from public GitHub URLs at runtime.

**3D viewer** (`src/components/viewer/`): Uses React Three Fiber + drei. `ModelViewerClient.tsx` is the client-only entry point; `ExplodedView.tsx` handles assembled vs. exploded animation via `@react-spring/three`.

**AI layer** (`src/lib/openrouter.ts`): Three exported functions — `chatCompletion` (plain text), `structuredOutput<T>` (JSON schema), `chatCompletionStream` (SSE stream). Default model: `google/gemini-2.0-flash-001`.

**Search** (`src/lib/search-parser.ts`): Uses `structuredOutput` to parse natural language into `SearchFilters`. Falls back to a keyword-only heuristic when no API key is present.

**State management**: `useInventions` hook owns all globe/discovery state (category filter, country filter, selected invention). `useExpert` hook owns AI chat state. Both live in `src/hooks/`.

**Component organization**:
- `src/components/globe/` — 3D globe
- `src/components/discovery/` — side panel, invention cards, category filter
- `src/components/viewer/` — 3D model viewer, exploded view, component info
- `src/components/expert/` — AI chat panel, message bubbles, suggested questions
- `src/components/ui/` — shared primitives (Button, Badge, Panel, Spinner, etc.)
- `src/components/demo/` — demo mode overlay

**All shared types** are in `src/types/index.ts` — `Invention`, `InventionComponent`, `SearchFilters`, `ChatMessage`, `GlobeMarker`, etc.
