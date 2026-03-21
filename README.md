# InventorNet

InventorNet is a Next.js app for exploring breakthrough inventions around the world through an interactive 3D globe, rich invention briefs, an interactive 3D “exploded view” for select inventions, and an AI “expert” chat panel for contextual explanations.

## What you can do

- **Browse a 3D globe** and click countries to focus the dataset.
- **Filter by category** (energy, computing, biology, materials, etc.).
- **Search in plain language** (e.g. “renewable energy in Europe”, “after 1950 in the US”).
- **Open an invention detail page** with a story/brief.
- **Explore select inventions in 3D** with component picking and an exploded view.
- **Ask the AI Expert** questions about the invention or a selected component.

> Note: without an API key, chat/search fall back to offline heuristics and a baseline response.

## Getting Started

### Prerequisites

- Node.js (recommended: latest LTS)

### Install & run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Configuration (optional)

Create `.env.local` in the project root:

```bash
# Enables real AI responses via OpenRouter (chat + structured search parsing).
OPENROUTER_API_KEY=...

# Enables Google Gemini image-to-image enhancement for extracted patent figures.
GEMINI_API_KEY=...

# Used for OpenRouter headers (optional).
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Scripts

```bash
npm run dev        # start dev server
npm run build      # production build
npm run start      # start production server
npm test           # run vitest once
npm run test:watch # vitest in watch mode
```

## Tech overview

- **Framework**: Next.js (App Router), React
- **3D globe**: `react-globe.gl` (client-only)
- **3D models / exploded view**: React Three Fiber + drei + three
- **UI**: Tailwind CSS
- **AI**: OpenRouter (server route at `src/app/api/chat/route.ts`)
- **Patent PDF extraction (POC)**: `pdfjs-dist` + `canvas` + OpenRouter vision (`src/app/api/patent/extract/route.ts`)
- **Patent figure enhancement (POC)**: Google Gemini native image generation / Nano Banana (`src/app/api/patent/enhance/route.ts`)

## Project structure

- `src/app/page.tsx`: globe + discovery side panel
- `src/app/invention/[id]/page.tsx`: invention detail + 3D viewer + AI chat
- `src/app/api/search/route.ts`: search endpoint (filters inventions)
- `src/app/api/chat/route.ts`: AI chat endpoint (returns plain text)
- `src/app/api/patent/extract/route.ts`: patent PDF upload + figure/text extraction endpoint
- `src/data/*`: invention dataset, categories, 3D component definitions

## Patent PDF Extraction (POC)

This project includes a POC endpoint to extract patent figure pages and context from uploaded PDFs.

### Endpoint

- `POST /api/patent/extract`
- Content type: `multipart/form-data`
- Fields:
  - `file` (required): patent PDF file
  - `patentId` (optional): custom ID used for output folder naming

### Response

Returns JSON with extracted figures and output paths:

- `patentId`
- `outputDirectory`
- `manifestPath`
- `textPath`
- `totalPages`
- `processedPages`
- `figureCount`
- `warnings[]`
- `figures[]` (label, page number, description, components, image filename)

### Output Files

The API writes extracted artifacts to `public/patents/{patentId}/`:

- `manifest.json`
- `full-text.txt`
- `page-<n>-fig-<label>.png` figure images
- `enhanced/*.png|jpg|webp` realistic figure-to-product renders generated on demand

### Example curl

```bash
curl -X POST http://localhost:3000/api/patent/extract \
  -F "file=@docs/sample-patent.pdf" \
  -F "patentId=us-sample"
```

### Behavior and fallback

- If `OPENROUTER_API_KEY` is configured, page images are analyzed by a vision-capable model to identify figure pages and infer component names/reference numbers.
- If `GEMINI_API_KEY` is configured, each extracted figure card can also trigger a second-stage image-to-image pass that converts the patent sketch/crop into a more realistic component render.
- Without API key, extraction still runs with heuristics (e.g., FIG label detection), but figure classification and component naming will be lower fidelity.
- Each extracted figure includes `analysisSource` (`vision` or `heuristic`) and `failureReason` (when falling back).

### Limits and deployment notes

- Current endpoint enforces a `50MB` PDF size cap.
- Page processing defaults to first `60` pages (set via `PATENT_EXTRACT_MAX_PAGES`).
- This route requires Node.js runtime (`runtime = "nodejs"`).
- Writing to `public/` is suitable for local/dev POC. Serverless production deployments usually require object storage (S3/Vercel Blob/etc.) because local filesystem writes are ephemeral/read-only.

## Notes

- The globe loads its country geojson and textures from public GitHub URLs at runtime (`src/components/globe/GlobeClient.tsx`).
- The “3D models” in this repo are procedural primitives (no `.glb` assets in `public/` by default).

## Deploy

This is a standard Next.js app—deploy to Vercel (or any Node-compatible platform) the same way you would deploy any Next.js project.
