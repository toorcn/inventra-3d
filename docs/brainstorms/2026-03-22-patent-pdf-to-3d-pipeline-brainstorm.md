---
date: 2026-03-22
topic: patent-pdf-to-3d-pipeline
---

# Patent PDF to 3D Model Pipeline

## What We're Building

An end-to-end automated pipeline that takes a patent PDF as input and produces a fully integrated invention entry in Inventra — complete with metadata, subassembly breakdown, and real 3D mesh (.glb) files. The user uploads a patent PDF, the system extracts and analyzes it using AI, identifies figures suitable for 3D conversion, generates meshes via fal.ai Trellis, and writes the result as new static data files + .glb assets that appear on the globe alongside hand-curated inventions.

## Why This Approach

### Approaches Considered

1. **Monolithic Next.js pipeline (chosen)** — Trigger.dev background jobs within the existing Next.js app. Writes .glb files to `public/models/` and invention data to TypeScript files. Simplest to ship, single deployment.

2. **Standalone pipeline service** — Separate Node.js/Python service. More decoupled but adds operational overhead that isn't justified at current scale.

3. **Edge functions + external orchestrator** — Cloud-native with Step Functions/Temporal. Most scalable but massive infrastructure overkill.

### Why Monolithic Next.js

- Trigger.dev integrates natively with Next.js and provides job monitoring
- The existing static TypeScript data pattern is preserved — generated inventions look identical to hand-curated ones
- Single codebase, single deployment, minimal infrastructure
- fal.ai client is already a devDependency with a working proof-of-concept in `scripts/`

## Key Decisions

- **3D output: Real .glb meshes** — Moving beyond procedural primitives. The viewer needs to support loading .glb files alongside existing procedural geometry. This is a significant viewer change.

- **Processing: Background job queue (Trigger.dev)** — Patent analysis involves multiple AI calls and 3D generation that can take minutes. Async processing with status updates is essential.

- **Storage: Filesystem + static files** — Generated .glb files go to `public/models/<invention-id>/`. Invention metadata is written to the existing TypeScript data files (`inventions.ts`, `invention-components.ts`). This means a dev server restart or rebuild to see new inventions, which is acceptable for MVP.

- **3D generation: fal.ai Trellis** — Image-to-3D mesh generation. Already prototyped in the repo. Pay-per-use API.

- **Figure extraction: AI vision to identify + crop** — Send PDF pages as images to a multimodal LLM (via OpenRouter), have it identify which figures are suitable for 3D conversion, then programmatically extract/crop those regions.

- **Subassembly strategy: AI-driven** — The AI analyzes the patent to understand the invention's structure, identifies which figures represent subassemblies vs. alternative views, and can also *imagine* additional subassemblies based on its understanding. Each subassembly becomes a separate .glb component that supports exploded view.

- **MVP scope: Fully automated end-to-end** — Upload PDF, get a complete invention entry with no human intervention. The pipeline should handle metadata extraction (title, year, inventors, description, category, location) and 3D model generation in one flow.

## Pipeline Steps (Conceptual)

1. **Upload** — User uploads patent PDF via web UI
2. **PDF Parsing** — Extract text and render pages as images
3. **Patent Analysis** — AI reads text + images to extract invention metadata (title, year, inventors, description, category, country, patent number)
4. **Figure Identification** — AI vision identifies which figures are 3D-convertible and what subassemblies they represent
5. **Figure Extraction** — Programmatically crop/extract identified figures from PDF pages
6. **Subassembly Planning** — AI determines the component breakdown: which figures map to which subassemblies, positions, colors, materials
7. **3D Generation** — Send each figure/subassembly image to fal.ai Trellis to generate .glb meshes
8. **Assembly** — Define assembled/exploded positions for each component mesh
9. **Data Writing** — Write invention entry to `inventions.ts`, components to `invention-components.ts`, model definition to `models.ts`, .glb files to `public/models/`
10. **Completion** — Notify user, invention appears on globe after restart/rebuild

## Open Questions

- **How to handle the viewer for .glb files?** — The current viewer is built entirely around procedural `GeometryDef`. Need to either extend `GeometryDef` to support a `"glb"` type or build a parallel viewer path. This is a key architectural decision for the planning phase.

- **How to handle PDF pages as images?** — Need a PDF-to-image conversion step. Options include `pdf-lib` + canvas rendering, `pdfjs-dist`, or a dedicated service. Server-side image rendering in Node.js can be tricky.

- **What happens when Trellis produces poor quality meshes?** — Some patent figures (especially cross-sections or schematic diagrams) may not convert well to 3D. Need a quality check or fallback strategy.

- **How to determine assembled/exploded positions for generated meshes?** — Currently hand-tuned `[x,y,z]` values. The AI would need to suggest reasonable spatial layouts, or positions could be auto-calculated based on mesh bounding boxes.

- **Should generated inventions be editable after creation?** — If the AI gets something wrong (category, description, etc.), is there a way to fix it without manually editing TypeScript files?

- **Rate limiting and costs** — fal.ai Trellis and OpenRouter both cost money per call. A single patent with 5 subassemblies = 5 Trellis calls + multiple LLM calls. Need to understand cost per patent.

- **How does the static file writing work in production?** — Writing to the filesystem works in dev, but in a deployed environment (Vercel, etc.) the filesystem is read-only. This approach is dev/self-hosted only unless we add a database later.

## Next Steps

-> `/workflows:plan` for implementation details
