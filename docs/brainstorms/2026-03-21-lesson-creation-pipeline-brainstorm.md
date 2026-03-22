# Automated Lesson Creation Pipeline — Brainstorm

**Date:** 2026-03-21
**Status:** Brainstormed, ready for planning

---

## What We're Building

A backend automation pipeline that generates invention lessons end-to-end — from a bare invention name or topic to a fully rendered invention card with 3D model. The pipeline replaces manual TypeScript file authoring with an AI-driven workflow:

1. **Research** — Tinyfish web agent scrapes patent databases (USPTO, Google Patents), Wikipedia, and academic sources to gather patent text, inventor names, dates, and technical descriptions
2. **3D Model Sourcing** — Tinyfish finds and downloads a `.glb` model from repositories (Sketchfab, Free3D, etc.); assets stored in cloud storage (R2 or S3)
3. **Lesson Generation** — Claude synthesizes research into structured `Invention` metadata + component descriptions + lesson content
4. **Storage** — Generated content saved to Supabase (Postgres); `.glb` assets to R2/S3
5. **Frontend** — Extend 3D viewer to support `.glb` alongside existing procedural primitives; fetch inventions from Supabase API instead of static TypeScript arrays

---

## Why This Approach

**Goal:** Scale content fast — move from 25 hand-authored inventions to hundreds without manual effort.

**Why Tinyfish for research + model sourcing:** It's an AI-powered web automation platform with MCP integration with Claude. Can navigate authenticated sites, handle dynamic interfaces, and return structured JSON. Ideal for patent scraping and Sketchfab browsing.

**Why full pipeline upfront (not phased):** User wants the complete automation story. Phasing risks building a text-only system that then needs significant rework when .glb is added.

**Why Next.js API route (not Trigger.dev/Lambda):** Simplest starting point. Long-running routes work for a prototype. Can graduate to Trigger.dev if jobs exceed timeout limits.

**Why Supabase:** Managed Postgres with built-in Auth (for admin UI), storage, and real-time. Zero-ops, integrates cleanly with Next.js. R2/S3 for .glb file storage.

---

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Research source | Tinyfish web agent | Handles dynamic sites, MCP-native |
| 3D model format | `.glb` sourced from Sketchfab/Free3D | Real assets; existing procedural models kept as-is |
| .glb storage | Cloud storage (R2 or S3) | Assets too large for DB; CDN-friendly |
| Content generation | Claude (via OpenRouter, existing setup) | Already wired; `structuredOutput<T>` for typed generation |
| Data persistence | Supabase (Postgres) | Managed, Auth included, real-time ready |
| Worker execution | Next.js API route | Simplest starting point; upgrade to Trigger.dev if needed |
| Trigger mechanism | Admin UI (simple form) | Non-technical team can trigger pipeline |
| Existing inventions | Keep as static TypeScript | No migration needed; auto-generated inventions live in DB |
| 3D Viewer | Extend to support both `.glb` and procedural | Dual-path renderer: GLTF loader for DB inventions, existing procedural for static |

---

## Pipeline Steps (Detail)

```
Admin inputs: "Invention Name" (e.g. "Diesel Engine")
         ↓
[Step 1] Tinyfish: Research patents + history
         → Returns: patentNumber, inventors[], year, country, description, patentText
         ↓
[Step 2] Tinyfish: Search Sketchfab/Free3D for matching .glb
         → Returns: modelUrl, modelAttribution
         → Download + upload to R2/S3
         ↓
[Step 3] Claude (structuredOutput): Generate lesson
         → Returns: Invention record + InventionComponent[] (descriptions, materials)
         ↓
[Step 4] Save to Supabase
         → inventions table, invention_components table, model_assets table
         ↓
[Step 5] Frontend fetches from API
         → /api/inventions replaces static import
```

---

## Architecture Changes Required

### Backend
- Add Supabase client (`@supabase/supabase-js`)
- New tables: `inventions`, `invention_components`, `model_assets`
- New API routes:
  - `GET /api/inventions` — serves merged static + DB inventions
  - `POST /api/pipeline/generate` — triggers the lesson creation pipeline
- Tinyfish integration for Steps 1 + 2

### Frontend
- `useInventions` hook: fetch from `/api/inventions` instead of static import
- 3D Viewer: add GLTF/GLB loader path (`useGLTF` from drei already available in R3F)
- Admin UI: simple form to trigger pipeline + job status display

### Data Model Changes
- Static TypeScript inventions remain unchanged (hybrid approach)
- DB inventions augment the static set
- `hasModel: true` + `modelType: 'glb' | 'procedural'` to route viewer

---

## Open Questions

1. **Sketchfab licensing** — Free models may have attribution requirements or CC licenses. Need a license filter in the Tinyfish search step.
2. **Pipeline timeout** — Next.js API routes time out at ~10s (Vercel). Multi-step pipeline will exceed this. May need to move to Trigger.dev or background job sooner than expected.
3. **3D model quality** — Auto-found .glb models may not match the invention well. Consider a human review step before publishing.
4. **Patent scraping legality** — USPTO has a public API (PatentsView); Google Patents may block scrapers. Need to validate Tinyfish's stealth mode is sufficient, or use official APIs.
5. **Supabase vs stay static** — If the pipeline only runs occasionally, generated TypeScript files committed to the repo might be simpler than adding a full DB dependency.
6. **Admin auth** — Who has access to trigger generation? Simple API key header or Supabase Auth?

---

## Out of Scope (for now)

- Automatic content refresh / re-generation
- SEO optimization of generated lessons
- Multi-language lesson support
- Real-time pipeline progress beyond basic polling
