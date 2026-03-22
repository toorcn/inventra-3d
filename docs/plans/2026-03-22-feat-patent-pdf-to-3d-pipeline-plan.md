---
title: "feat: Patent PDF to 3D Model Pipeline"
type: feat
date: 2026-03-22
---

# Patent PDF to 3D Model Pipeline

## Overview

An end-to-end automated pipeline that ingests patent PDFs, uses AI to extract metadata and identify 3D-convertible figures, generates real `.glb` meshes via fal.ai Trellis 2, and writes the result as a fully integrated invention entry — appearing on the globe alongside hand-curated inventions.

## Problem Statement

Currently, adding a new invention to Inventra requires manually editing three TypeScript files (`inventions.ts`, `invention-components.ts`, `models.ts`) and is limited to 7 procedural geometry primitives. There is no way to ingest a real patent document and generate a rich 3D model from it. This feature automates the entire process: PDF in, invention on the globe out.

## Proposed Solution

A Trigger.dev background job pipeline within the existing Next.js app. The pipeline:
1. Accepts a PDF upload via a new API route
2. Extracts text and renders pages as images (unpdf + @napi-rs/canvas)
3. Uses a multimodal LLM (via OpenRouter) to extract metadata and identify figures
4. Sends figures to fal.ai Trellis 2 for `.glb` mesh generation
5. Writes generated data to separate TypeScript files and `.glb` assets to `public/models/`

## Technical Approach

### Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────────────────────┐
│  Upload UI   │────>│ POST /api/ingest │────>│ Trigger.dev: patent-pipeline    │
│  (new route) │     │  (validates PDF, │     │                                 │
│              │     │   triggers job)  │     │  1. Parse PDF → page images     │
│              │     └──────────────────┘     │  2. AI: extract metadata        │
│              │                              │  3. AI: identify figures         │
│              │     ┌──────────────────┐     │  4. Crop figures                │
│              │<────│ GET /api/ingest/ │     │  5. AI: plan subassemblies      │
│  (poll       │     │   [jobId]/status │<────│  6. fal.ai Trellis → .glb      │
│   status)    │     └──────────────────┘     │  7. Write data files + .glb     │
└──────────────┘                              └─────────────────────────────────┘
```

### Key Architectural Decisions

**1. Separate generated data files (not modifying hand-authored files)**

Instead of appending to `inventions.ts`, `invention-components.ts`, and `models.ts`, the pipeline writes to separate generated files:
- `src/data/generated/inventions-generated.ts`
- `src/data/generated/components-generated.ts`
- `src/data/generated/models-generated.ts`

The existing data files are updated to import and merge generated data:
```typescript
// src/data/inventions.ts (modified once)
import { generatedInventions } from './generated/inventions-generated';
export const inventions: Invention[] = [...staticInventions, ...generatedInventions];
```

**Why:** Avoids fragile AST manipulation of hand-authored TypeScript. Generated files can be overwritten safely. Separation of concerns between curated and AI-generated content.

**2. Extend GeometryDef with `"glb"` type**

```typescript
// src/types/index.ts
export interface GeometryDef {
  type: "box" | "sphere" | "cylinder" | "torus" | "torusKnot" | "plane" | "roundedBox" | "glb";
  args: number[];
  rotation?: [number, number, number];
  glbUrl?: string; // path relative to public/, e.g. "models/us223898/body.glb"
}
```

The viewer's `ComponentMesh.tsx` gains a new branch that uses `useGLTF` from `@react-three/drei` when `type === "glb"`. Material properties from the `.glb` file are used as-is (Trellis bakes textures into the mesh).

**3. Trigger.dev for background processing**

The pipeline runs as a Trigger.dev task with subtasks for each step. This provides:
- Async processing (5-10 min total)
- Built-in retry policies per step
- Job monitoring dashboard
- Idempotency keys to prevent duplicate work on retries

**4. Cost control: cap at 6 subassemblies per invention**

The AI analysis step is instructed to identify at most 6 key subassemblies. At $0.30/Trellis call, this caps cost at ~$1.80 per patent plus LLM costs.

### Implementation Phases

#### Phase 1: Viewer .glb Support

Extend the existing viewer to load and display `.glb` meshes alongside procedural geometry. This is the foundation everything else depends on.

**Tasks:**

- [x] Extend `GeometryDef` type in `src/types/index.ts` — add `"glb"` to the type union and optional `glbUrl` field
- [x] Create `GlbMesh` component in `src/components/viewer/GlbMesh.tsx` — uses `useGLTF` from drei to load and render a `.glb` file, applying scene scaling and centering based on bounding box
- [x] Update `ComponentMesh.tsx` — add a branch: if `geometry.type === "glb"`, render `<GlbMesh>` instead of `GeometryFromDef`
- [x] Update `ModelDefinition` and `ComponentModel` in `src/data/models.ts` — no structural changes needed since they reference `GeometryDef` which now includes `"glb"`
- [ ] Add auto-camera framing — when all components are `.glb` type, compute bounding box of loaded meshes and set `cameraPosition`/`cameraTarget` automatically
- [ ] Manual test: place a sample `.glb` file in `public/models/test/` and create a test invention entry to verify the full render path works

**Files to create/modify:**
- `src/types/index.ts` (modify — extend GeometryDef)
- `src/components/viewer/GlbMesh.tsx` (create)
- `src/components/viewer/ComponentMesh.tsx` (modify — add glb branch)

**Success criteria:**
- [ ] A `.glb` file placed in `public/models/` renders correctly in the 3D viewer
- [ ] Exploded view animation works with `.glb` components
- [ ] Component highlighting/selection works with `.glb` components
- [ ] Existing procedural geometry inventions continue working unchanged

---

#### Phase 2: Trigger.dev Setup + PDF Parsing

Set up the background job infrastructure and implement PDF-to-image conversion.

**Tasks:**

- [ ] Install dependencies: `@trigger.dev/sdk`, `unpdf`, `pdfjs-dist`, `@napi-rs/canvas`
- [ ] Move `@fal-ai/client` from devDependencies to dependencies
- [ ] Create `trigger.config.ts` at project root with project ref, `dirs: ["./trigger"]`, retry defaults
- [ ] Create `trigger/patent-pipeline.ts` — orchestrator task that chains subtasks
- [ ] Create `trigger/tasks/parse-pdf.ts` — accepts PDF buffer (or uploaded file URL), renders each page as PNG using unpdf, returns array of `{ pageNumber, imageBase64, text }` (text extracted via pdfjs getTextContent)
- [ ] Create `POST /api/ingest/route.ts` — accepts multipart form upload, validates (max 20MB, PDF content-type, not encrypted), saves to `/tmp`, triggers the pipeline task, returns `{ jobId }`
- [ ] Create `GET /api/ingest/[jobId]/status/route.ts` — calls `runs.retrieve()` and returns job status + progress
- [ ] Update `package.json` dev script to run Trigger.dev dev alongside Next.js using concurrently
- [ ] Add `FAL_KEY` and `TRIGGER_SECRET_KEY` to `.env.local` documentation

**Files to create/modify:**
- `trigger.config.ts` (create)
- `trigger/patent-pipeline.ts` (create)
- `trigger/tasks/parse-pdf.ts` (create)
- `src/app/api/ingest/route.ts` (create)
- `src/app/api/ingest/[jobId]/status/route.ts` (create)
- `package.json` (modify — add deps, update dev script)
- `.env.local` (modify — add keys)

**Success criteria:**
- [ ] `npx trigger.dev@latest dev` runs alongside `next dev`
- [ ] Uploading a PDF via `/api/ingest` triggers a background job and returns a job ID
- [ ] The parse-pdf task extracts text and renders pages as PNG images
- [ ] `/api/ingest/[jobId]/status` returns current job state

---

#### Phase 3: AI Analysis Pipeline

Use multimodal LLM to extract patent metadata and identify 3D-convertible figures.

**Tasks:**

- [ ] Create `trigger/tasks/analyze-patent.ts` — sends page images + extracted text to OpenRouter multimodal LLM. Uses `structuredOutput<T>` pattern from existing `src/lib/openrouter.ts`. Extracts:
  ```typescript
  interface PatentAnalysis {
    title: string;
    year: number;
    inventors: string[];
    description: string;
    category: CategoryId;
    country: string;
    countryCode: string;
    patentNumber: string;
    location: { lat: number; lng: number };
  }
  ```
  Validates extracted `category` against the `CategoryId` union. Validates `year` is between 1700-2030. Validates `countryCode` is a valid ISO alpha-2 code. Generates a URL-safe `id` slug from the patent number (e.g., `"us-223898"`), checking for collisions against existing inventions.

- [ ] Create `trigger/tasks/identify-figures.ts` — sends page images to multimodal LLM asking it to:
  1. Identify which figures show 3D-representable objects (not flowcharts, circuit diagrams, or graphs)
  2. For each figure, describe what subassembly it represents
  3. Return bounding box coordinates (x, y, width, height as percentages of page dimensions) for cropping
  4. Suggest materials, colors, and spatial relationships between components
  5. Cap at 6 subassemblies maximum

  Returns:
  ```typescript
  interface FigureAnalysis {
    figures: Array<{
      pageNumber: number;
      boundingBox: { x: number; y: number; width: number; height: number }; // percentages
      componentName: string;
      description: string;
      materials: string[];
      color: string; // hex
      patentText: string | null;
      spatialHint: "top" | "bottom" | "left" | "right" | "center" | "front" | "back";
    }>;
  }
  ```

- [ ] Create `trigger/tasks/crop-figures.ts` — takes page images and bounding boxes, uses `@napi-rs/canvas` to crop each figure region, uploads cropped images to fal.ai storage via `fal.storage.upload()`, returns array of image URLs

- [ ] Wire subtasks into `trigger/patent-pipeline.ts` orchestrator using `triggerAndWait().unwrap()` with idempotency keys

**Files to create/modify:**
- `trigger/tasks/analyze-patent.ts` (create)
- `trigger/tasks/identify-figures.ts` (create)
- `trigger/tasks/crop-figures.ts` (create)
- `trigger/patent-pipeline.ts` (modify — wire in subtasks)
- `src/lib/openrouter.ts` (may need to add image support to `structuredOutput` if not already multimodal)

**Success criteria:**
- [ ] Given a patent PDF, the pipeline extracts correct metadata (title, year, inventors, etc.)
- [ ] The AI identifies relevant figures and provides bounding boxes
- [ ] Cropped figure images are uploaded to fal.ai storage and accessible via URL
- [ ] Invalid metadata is caught by validation (bad category, out-of-range year, etc.)

---

#### Phase 4: 3D Mesh Generation + Data Writing

Generate `.glb` meshes and write all output files.

**Tasks:**

- [ ] Create `trigger/tasks/generate-meshes.ts` — for each cropped figure URL, calls `fal.subscribe("fal-ai/trellis-2", { input: { image_url, resolution: 1024, texture_size: 2048 } })`. Downloads the `.glb` from `result.data.model_glb.url`. Returns array of `{ componentName, glbBuffer }`. Retry policy: 2 attempts per Trellis call with exponential backoff. If a call fails after retries, skip that component (minimum 1 component must succeed).

- [ ] Create `trigger/tasks/calculate-positions.ts` — given the AI's `spatialHint` for each component, calculates `assembledPosition` and `explodedPosition` tuples:
  - Assembled: pack components based on spatial hints (center at origin, arrange others relative)
  - Exploded: radially distribute components outward from center, spacing based on component count
  - Camera position: compute bounding sphere of all assembled positions, place camera at 2x radius

- [ ] Create `trigger/tasks/write-output.ts` — the final step that:
  1. Saves `.glb` files to `public/models/<invention-id>/<component-slug>.glb`
  2. Reads existing generated data files (or creates them if first run)
  3. Appends new invention to `src/data/generated/inventions-generated.ts`
  4. Appends new components to `src/data/generated/components-generated.ts`
  5. Appends new model definition to `src/data/generated/models-generated.ts`
  6. Uses JSON.stringify for data + a code template wrapper to produce valid TypeScript

- [ ] Create `src/data/generated/inventions-generated.ts` (initial empty file with typed export)
- [ ] Create `src/data/generated/components-generated.ts` (initial empty file)
- [ ] Create `src/data/generated/models-generated.ts` (initial empty file)
- [ ] Update `src/data/inventions.ts` — import and merge `generatedInventions`
- [ ] Update `src/data/invention-components.ts` — import and merge `generatedComponents`
- [ ] Update `src/data/models.ts` — import and merge `generatedModelDefinitions`, update `getModelDefinitionByInventionId` to search both

**Files to create/modify:**
- `trigger/tasks/generate-meshes.ts` (create)
- `trigger/tasks/calculate-positions.ts` (create)
- `trigger/tasks/write-output.ts` (create)
- `src/data/generated/inventions-generated.ts` (create — empty scaffold)
- `src/data/generated/components-generated.ts` (create — empty scaffold)
- `src/data/generated/models-generated.ts` (create — empty scaffold)
- `src/data/inventions.ts` (modify — merge generated data)
- `src/data/invention-components.ts` (modify — merge generated data)
- `src/data/models.ts` (modify — merge generated data)
- `trigger/patent-pipeline.ts` (modify — wire in final subtasks)

**Success criteria:**
- [ ] `.glb` files are saved to `public/models/<id>/` and are servable
- [ ] Generated TypeScript files contain valid, type-checked code
- [ ] After dev server restart, the new invention appears on the globe
- [ ] Clicking the invention opens the detail page with working 3D viewer showing `.glb` meshes
- [ ] Exploded view works with the generated component positions
- [ ] Existing hand-curated inventions continue to work unchanged

---

#### Phase 5: Upload UI + Job Status

Build the user-facing interface for uploading patents and monitoring progress.

**Tasks:**

- [ ] Create new route `src/app/ingest/page.tsx` — the upload page with:
  - Drag-and-drop file zone (or file input) accepting `.pdf` files
  - File size validation (max 20MB client-side)
  - Upload button that POSTs to `/api/ingest`
  - After upload, transitions to a progress view showing job status

- [ ] Create `src/components/ingest/UploadForm.tsx` — the upload form component
- [ ] Create `src/components/ingest/PipelineProgress.tsx` — polls `/api/ingest/[jobId]/status` every 3 seconds. Shows step-by-step progress:
  - Parsing PDF...
  - Analyzing patent...
  - Identifying figures...
  - Generating 3D models (X of Y)...
  - Writing data...
  - Complete! (with link to the new invention page)
- [ ] Create `src/hooks/useIngestJob.ts` — hook that manages job ID state, polling, and status transitions
- [ ] Add navigation link to the ingest page from the main UI (e.g., a "+" button in the discovery panel header)

**Files to create/modify:**
- `src/app/ingest/page.tsx` (create)
- `src/components/ingest/UploadForm.tsx` (create)
- `src/components/ingest/PipelineProgress.tsx` (create)
- `src/hooks/useIngestJob.ts` (create)
- `src/components/discovery/DiscoveryPanel.tsx` (modify — add ingest link)

**Success criteria:**
- [ ] User can upload a PDF via the web UI
- [ ] Progress indicator updates in real-time as each pipeline step completes
- [ ] On completion, user sees a link to the newly created invention
- [ ] Error states are displayed clearly (upload failed, pipeline failed, etc.)

---

#### Phase 6: Polish + Error Handling

Harden the pipeline and handle edge cases.

**Tasks:**

- [ ] Add rate limiting to `/api/ingest` — max 5 uploads per hour per IP
- [ ] Add PDF validation: reject encrypted/password-protected PDFs, reject files > 20MB, validate content-type
- [ ] Add path traversal prevention: sanitize invention ID to only allow `[a-z0-9-]` characters
- [ ] Add duplicate detection: check if patent number already exists in inventions data before processing
- [ ] Add cleanup on failure: if the pipeline fails partway, remove any partially written `.glb` files and don't append partial data to generated files
- [ ] Add `.glb` mesh optimization: after Trellis generation, optionally compress with draco/meshopt if file size > 5MB
- [ ] Add loading states to the viewer for `.glb` files (drei's `useGLTF` is async)
- [ ] Add "AI-generated" badge to invention cards for generated inventions

**Files to modify:**
- `src/app/api/ingest/route.ts` (modify — validation, rate limiting)
- `trigger/patent-pipeline.ts` (modify — cleanup on failure, duplicate check)
- `trigger/tasks/write-output.ts` (modify — atomic writes)
- `src/components/viewer/GlbMesh.tsx` (modify — loading state)
- `src/components/discovery/InventionCard.tsx` (modify — AI badge)

**Success criteria:**
- [ ] Invalid uploads are rejected with clear error messages
- [ ] Duplicate patents are detected and rejected
- [ ] Pipeline failures don't leave partial data
- [ ] The UI gracefully handles all error states

## Alternative Approaches Considered

1. **Modify hand-authored TypeScript files directly** — Rejected due to fragility. AST manipulation (ts-morph) adds complexity; regex-based insertion is error-prone.

2. **Database + object storage** — Better for production but adds significant infrastructure. The filesystem approach works for dev/self-hosted and keeps the "static data" pattern consistent.

3. **Synchronous API route** — Would timeout for multi-step pipelines. Next.js API routes have request time limits.

4. **Manual figure selection** — User picks which figures to convert. More control but doesn't achieve the "fully automated" goal.

## Acceptance Criteria

### Functional Requirements

- [ ] User can upload a patent PDF and receive a complete invention entry with `.glb` 3D models
- [ ] Generated inventions appear on the globe with correct location markers
- [ ] The 3D viewer renders `.glb` meshes with exploded view support
- [ ] AI extracts metadata (title, year, inventors, description, category, country, patent number)
- [ ] AI identifies and crops 3D-convertible figures from patent pages
- [ ] Pipeline runs asynchronously with progress tracking
- [ ] Existing hand-curated inventions are unaffected

### Non-Functional Requirements

- [ ] Pipeline completes within 10 minutes for a typical patent (5-15 pages, 3-5 figures)
- [ ] Cost per patent stays under $3 (max 6 Trellis calls + LLM calls)
- [ ] `.glb` files are under 10MB each after generation
- [ ] Upload validation prevents abuse (file size, rate limiting, content validation)

### Quality Gates

- [ ] TypeScript compiles with no errors after generated files are written
- [ ] All existing tests continue to pass (`npm test`)
- [ ] The viewer renders both procedural and `.glb` geometries correctly
- [ ] Manual test: process at least 3 different real patent PDFs end-to-end

## Dependencies & Prerequisites

- **fal.ai account** with API key and credits ($0.30/generation)
- **Trigger.dev account** with project set up (free tier available)
- **OpenRouter API key** (already used by the app for chat/search)
- **Node.js 20+** (for unpdf/canvas compatibility)

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Trellis produces poor quality meshes from patent diagrams | High | Medium | Patent figures are often line drawings, not photos. Test with real patents early. Consider pre-processing figures (adding shading, cleaning backgrounds) before sending to Trellis. |
| AI extracts wrong metadata | Medium | Low | Validation layer catches obvious errors. Generated data is in separate files, easy to delete and regenerate. |
| Pipeline timeout/failure partway through | Medium | Medium | Trigger.dev retry policies per subtask. Cleanup logic removes partial output on failure. |
| `.glb` files too large, slow viewer | Medium | Medium | Cap at 6 components. Consider mesh decimation post-processing. Lazy-load meshes. |
| Generated TypeScript has syntax errors | Low | High | Use JSON.stringify for data values, wrap in a known-good template. Run `tsc --noEmit` as validation step before finalizing. |
| Filesystem writes fail in production (Vercel) | Certain | High | This approach is scoped to dev/self-hosted only. Document clearly. Future: migrate to DB + cloud storage. |

## New Dependencies

| Package | Purpose | Install as |
|---------|---------|-----------|
| `@trigger.dev/sdk` | Background job framework | dependency |
| `unpdf` | PDF page rendering | dependency |
| `pdfjs-dist` | PDF text extraction + rendering engine | dependency |
| `@napi-rs/canvas` | Server-side canvas for image operations | dependency |
| `concurrently` | Run Next.js + Trigger.dev dev servers | devDependency |

Move `@fal-ai/client` from devDependencies to dependencies.

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `FAL_KEY` | Yes | fal.ai API authentication |
| `TRIGGER_SECRET_KEY` | Yes | Trigger.dev project authentication |
| `OPENROUTER_API_KEY` | Yes | Already exists — used for patent analysis |

## References & Research

### Internal References
- Brainstorm: `docs/brainstorms/2026-03-22-patent-pdf-to-3d-pipeline-brainstorm.md`
- Type definitions: `src/types/index.ts:24-28` (GeometryDef), `src/types/index.ts:10-22` (Invention)
- Viewer entry: `src/components/viewer/ComponentMesh.tsx:17-36` (GeometryFromDef switch)
- Model definitions: `src/data/models.ts:20-25` (ModelDefinition)
- fal.ai PoC: `scripts/fal-trellis-test.mjs`
- AI structured output: `src/lib/openrouter.ts` (structuredOutput function)

### External References
- [Trigger.dev Next.js Guide](https://trigger.dev/docs/guides/frameworks/nextjs)
- [fal.ai Trellis 2 API](https://fal.ai/models/fal-ai/trellis-2/api)
- [unpdf GitHub](https://github.com/unjs/unpdf)
- [@react-three/drei useGLTF](https://drei.docs.pmnd.rs/loaders/gltf)
