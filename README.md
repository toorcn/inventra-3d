# Inventra

Inventra is a Next.js app for exploring breakthrough inventions around the world through an interactive 3D globe, rich invention briefs, an interactive 3D “exploded view” for select inventions, and an AI “expert” chat panel for contextual explanations.

## What you can do

- **Browse a 3D globe** and click countries to focus the dataset.
- **Filter by category** (energy, computing, biology, materials, etc.).
- **Search in plain language** (e.g. “renewable energy in Europe”, “after 1950 in the US”).
- **Open an invention detail page** with a story/brief.
- **Explore select inventions in 3D** with component picking and an exploded view.
- **Control supported 3D models with webcam gestures** for rotation, explode, and assemble.
- **Ask the AI Expert** questions about the invention or a selected component.
- **Connect a live voice session** powered by Agora, ask spoken follow-ups in real time, and keep typed and spoken turns in one shared transcript.

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

## Gesture controls

Gesture controls are available on invention detail pages for entries that have a 3D model.

- Click `Enable Gestures` in the viewer toolbar.
- Allow webcam access when prompted.
- Show one hand to the camera.
- `Open_Palm`: rotate the model by moving your hand left/right/up/down in the camera view.
- `Thumb_Up`: explode the model.
- `Thumb_Down`: assemble the model.

Implementation notes:

- Gesture recognition runs locally in the browser with MediaPipe Tasks Vision.
- Rotation uses palm-center movement, not wrist twist.
- The viewer keeps `Open_Palm` tracking alive through short recognition dropouts to reduce stop/restart behavior.
- The webcam preview includes a debug overlay with the detected hand bounds, palm center, gesture label, confidence, and tracking state (`Stable`, `Grace`, `Searching`).
- Standard mouse/touch orbit controls remain available in the 3D viewer alongside webcam gestures.

## Configuration (optional)

Create `.env.local` in the project root:

```bash
# Enables OpenRouter Gemini chat/search/vision and Nano Banana image generation.
OPENROUTER_API_KEY=...

# Enables fal.ai Trellis 2 image-to-3D generation.
FAL_KEY=...

# Enables Vercel Blob-backed patent workspace caching.
BLOB_READ_WRITE_TOKEN=...

# Used for OpenRouter headers (optional).
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Agora live voice session configuration.
NEXT_PUBLIC_AGORA_APP_ID=...
AGORA_APP_CERTIFICATE=...
AGORA_CUSTOMER_ID=...
AGORA_CUSTOMER_SECRET=...

# Agora CAE uses ElevenLabs for spoken replies.
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=...

# Optional override for the spoken voice model.
ELEVENLABS_MODEL_ID=eleven_multilingual_v2
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
- **Patent PDF extraction + component normalization (POC)**: `pdfjs-dist` + `canvas` + OpenRouter vision (`src/app/api/patent/extract/route.ts`)
- **Patent component generation (POC)**: OpenRouter Nano Banana image generation/editing (`src/app/api/patent/components/generate/route.ts`)
- **Patent hero/subassembly 3D generation (POC)**: fal.ai Trellis 2 mesh generation (`src/app/api/patent/three-d/generate/route.ts`)

## Project structure

- `src/app/page.tsx`: globe + discovery side panel
- `src/app/invention/[id]/page.tsx`: invention detail + 3D viewer + AI chat
- `src/app/api/search/route.ts`: search endpoint (filters inventions)
- `src/app/api/chat/route.ts`: AI chat endpoint (returns plain text)
- `src/app/api/patent/extract/route.ts`: patent PDF upload + patent workspace extraction endpoint
- `src/app/api/patent/components/review/route.ts`: component triage persistence endpoint
- `src/app/api/patent/components/generate/route.ts`: variant-aware component image generation endpoint
- `src/app/api/patent/three-d/generate/route.ts`: featured hero + subassembly Trellis 2 generation endpoint
- `src/app/api/chat/route.ts`: shared expert chat endpoint for typed turns
- `src/app/api/voice/*`: Agora live session, agent lifecycle, and custom LLM webhook endpoints
- `src/data/*`: invention dataset, categories, 3D component definitions

## Patent PDF Extraction (POC)

This project includes a POC workflow to turn a patent PDF into an auto-reviewed component asset library with:

- a generated assembled-product hero image,
- generated subassembly images,
- stricter `three_d_source` image variants for featured hero/subassemblies,
- and optional Trellis 2 `GLB` outputs for the featured 3D set.

### Endpoint

- `POST /api/patent/extract`
- Content type: `multipart/form-data`
- Fields:
  - `file` (required): patent PDF file
  - `patentId` (optional): deterministic cache key; when omitted, the PDF filename slug is used

### Response

Returns a patent workspace JSON document containing:

- `patentId`
- `totalPages`
- `processedPages`
- `paths`
- `stats`
- `warnings[]`
- `capabilities`
- `figures[]` (label, page number, description, components, image filename)
- `componentCandidates[]` (raw per-figure detections)
- `componentLibrary[]` (deduped canonical components for review/generation)
- `assemblies[]`
- `reviewState`
- `featured` (hero component + auto-identified subassemblies)

### Output Files

The API caches extracted artifacts in Vercel Blob when `BLOB_READ_WRITE_TOKEN` is configured, with local `public/patents/{patentId}/` storage as the development fallback:

- `manifest.json`
- `full-text.txt`
- `page-<n>-fig-<label>.png` figure images
- `components/candidates/*.png` raw component evidence crops
- `components/generated/*-realistic_display.(png|jpg|webp)` presentation-ready component renders
- `components/generated/*-three_d_source.(png|jpg|webp)` stricter image-to-3D source renders for featured items
- `components/3d/*.glb` Trellis 2 output meshes for the featured hero/subassembly set

### Example curl

```bash
curl -X POST http://localhost:3000/api/patent/extract \
  -F "file=@docs/sample-patent.pdf" \
  -F "patentId=us-sample"
```

### Behavior and fallback

- If `OPENROUTER_API_KEY` is configured, page images are analyzed by a vision-capable model to identify figure pages, candidate parts, likely subassemblies, and functional descriptions.
- The extractor now auto-reviews strong candidates, skips obviously weak/text-heavy crops, and promotes one best-supported assembled view into a hero component.
- If `OPENROUTER_API_KEY` is configured, the UI can generate the assembled hero image first and generate featured `three_d_source` images on demand with Nano Banana. If `FAL_KEY` is also configured, it can convert the featured hero/subassembly set into Trellis 2 `GLB` files.
- Without API key, extraction still runs with heuristics (e.g., FIG label detection), but figure classification and component naming will be lower fidelity.
- Review decisions, hero selection, image variants, 3D mesh status, and assembly contracts are persisted into the patent workspace manifest so the inline flow survives reloads.

### Limits and deployment notes

- Current endpoint enforces a `50MB` PDF size cap.
- Page processing defaults to first `60` pages (set via `PATENT_EXTRACT_MAX_PAGES`).
- This route requires Node.js runtime (`runtime = "nodejs"`).
- Patent workspace caching is patent-ID-first. Reusing the same patent ID reopens the cached workspace instead of reprocessing the PDF.
- Local `public/` writes remain the local/dev fallback. In serverless deployments, Blob storage avoids ephemeral filesystem issues.

## Notes

- The globe loads its country geojson and textures from public GitHub URLs at runtime (`src/components/globe/GlobeClient.tsx`).
- The “3D models” in this repo are procedural primitives (no `.glb` assets in `public/` by default).
- Live voice controls automatically disable themselves when the Agora voice env vars are not configured; typed chat still works.

## Deploy

This is a standard Next.js app—deploy to Vercel (or any Node-compatible platform) the same way you would deploy any Next.js project.
