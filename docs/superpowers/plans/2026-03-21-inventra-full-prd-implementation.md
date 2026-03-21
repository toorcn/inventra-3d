# Inventra Full PRD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the existing InventorNet globe+viewer app into Inventra — replacing react-globe.gl with CesiumJS + Google 3D Tiles, adding a Temporos timeline engine, Exa.ai semantic search, webcam holographic viewer with MediaPipe gesture controls, ElevenLabs TTS avatar personas, and Agora streaming — scoped to 4 inventions (Telephone, iPhone, Steam Engine, Galilean Telescope).

**Architecture:** CesiumJS replaces react-globe.gl as the globe renderer with Google Photorealistic 3D Tiles. A new holographic viewer composites Three.js (transparent canvas) over a live webcam feed. MediaPipe Hands provides gesture detection. OpenRouter remains the LLM, but ElevenLabs + Agora handle voice/avatar streaming. Exa.ai provides semantic search that feeds into CesiumJS globe navigation. All GLB models are pre-generated static assets.

**Tech Stack:** Next.js 15, React 19, TypeScript, CesiumJS, Google 3D Tiles, Three.js, MediaPipe Hands, Exa.ai, ElevenLabs, Agora, OpenRouter, Tailwind CSS 4

**Spec:** `docs/inventra-prd.md`

**Scope decisions:**
- Supabase database is intentionally deferred — static TypeScript data files are sufficient for the hackathon prototype. The pipeline can be backed by Supabase post-hackathon.
- 3D Asset Pipeline (Nano Banana → SAM-3D → Rodin → trimesh) runs pre-hackathon as a manual step. The plan includes a task for placing generated GLBs and loading them, but not for running the generation pipeline itself.

---

## Phase 0: Data Layer & Environment Setup

### Task 1: Replace Invention Dataset with PRD's 4 Inventions

The existing `inventions.ts` has 25 inventions. Replace with the 4 PRD inventions plus their detailed component configs.

**Files:**
- Modify: `src/data/inventions.ts`
- Modify: `src/data/categories.ts`
- Modify: `src/data/invention-components.ts`
- Modify: `src/data/models.ts`
- Modify: `src/data/countries.ts`
- Modify: `src/types/index.ts`

- [ ] **Step 1: Update type definitions**

Add new fields to `Invention` type in `src/types/index.ts`:

```typescript
export type CategoryId =
  | "communications"
  | "optics"
  | "mechanical"
  | "consumer-electronics";

export interface Invention {
  id: string;
  title: string;
  year: number;
  inventionDate: number;
  patentDate: number | null;
  commercialisationDate: number;
  inventors: string[];
  location: { lat: number; lng: number; label: string };
  country: string;
  countryCode: string;
  category: CategoryId;
  description: string;
  patentNumber: string | null;
  hasModel: boolean;
  avatarPersona: string;
  avatarVoiceStyle: string;
}

export interface InventionComponent {
  id: string;
  inventionId: string;
  name: string;
  description: string;
  materials: string[];
  patentText: string;
  file: string;            // GLB filename
  offset: [number, number, number]; // exploded view offset
  assembledPosition: [number, number, number];
  explodedPosition: [number, number, number];
  color: string;
}
```

- [ ] **Step 2: Replace inventions data**

Replace `src/data/inventions.ts` with the 4 PRD inventions:

```typescript
import { Invention } from "@/types";

export const inventions: Invention[] = [
  {
    id: "telephone",
    title: "Telephone",
    year: 1876,
    inventionDate: 1876,
    patentDate: 1876,
    commercialisationDate: 1880,
    inventors: ["Alexander Graham Bell"],
    location: { lat: 42.3601, lng: -71.0589, label: "Boston, Massachusetts" },
    country: "United States",
    countryCode: "US",
    category: "communications",
    description: "The first practical device to transmit speech electrically...",
    patentNumber: "US174465A",
    hasModel: true,
    avatarPersona: "Dr. Alexander Bell",
    avatarVoiceStyle: "Warm, Scottish-accented, Victorian academic",
  },
  {
    id: "iphone",
    title: "iPhone",
    year: 2007,
    inventionDate: 2007,
    patentDate: 2007,
    commercialisationDate: 2007,
    inventors: ["Steve Jobs", "Apple Inc."],
    location: { lat: 37.3318, lng: -122.0312, label: "Cupertino, California" },
    country: "United States",
    countryCode: "US",
    category: "consumer-electronics",
    description: "The device that redefined the smartphone...",
    patentNumber: "US7966578B2",
    hasModel: true,
    avatarPersona: "Jony",
    avatarVoiceStyle: "Calm, precise, focused on elegance of form",
  },
  {
    id: "steam-engine",
    title: "Steam Engine",
    year: 1769,
    inventionDate: 1769,
    patentDate: 1769,
    commercialisationDate: 1776,
    inventors: ["James Watt"],
    location: { lat: 52.4862, lng: -1.8904, label: "Birmingham, England" },
    country: "United Kingdom",
    countryCode: "GB",
    category: "mechanical",
    description: "The separate condenser engine that powered the Industrial Revolution...",
    patentNumber: "GB913A/1769",
    hasModel: true,
    avatarPersona: "Mr. James Watt",
    avatarVoiceStyle: "Practical, gruff, northern English, engineering-minded",
  },
  {
    id: "telescope",
    title: "Galilean Telescope",
    year: 1609,
    inventionDate: 1609,
    patentDate: null,
    commercialisationDate: 1610,
    inventors: ["Galileo Galilei"],
    location: { lat: 45.4064, lng: 11.8768, label: "Padua, Italy" },
    country: "Italy",
    countryCode: "IT",
    category: "optics",
    description: "The instrument that opened the heavens to human observation...",
    patentNumber: null,
    hasModel: true,
    avatarPersona: "Professor Galileo",
    avatarVoiceStyle: "Passionate, Italian-accented, wonder-driven",
  },
];

export function getInventionById(id: string): Invention | undefined {
  return inventions.find((inv) => inv.id === id);
}

export function getInventionsByCategory(category: string): Invention[] {
  return inventions.filter((inv) => inv.category === category);
}
```

- [ ] **Step 3: Update categories**

Replace `src/data/categories.ts`:

```typescript
import { Category } from "@/types";

export const categories: Category[] = [
  { id: "communications", name: "Communications", color: "#2563EB", icon: "Phone" },
  { id: "optics", name: "Optics / Astronomy", color: "#8B5CF6", icon: "Telescope" },
  { id: "mechanical", name: "Mechanical Engineering", color: "#F59E0B", icon: "Cog" },
  { id: "consumer-electronics", name: "Consumer Electronics", color: "#EC4899", icon: "Smartphone" },
];
```

- [ ] **Step 4: Update invention components with PRD offsets**

Replace `src/data/invention-components.ts` with telephone components (expand for others):

```typescript
import { InventionComponent } from "@/types";

export const inventionComponents: InventionComponent[] = [
  // Telephone
  {
    id: "telephone-diaphragm",
    inventionId: "telephone",
    name: "Diaphragm",
    description: "Thin iron disc that vibrates in response to sound waves, converting acoustic energy into electrical current variations.",
    materials: ["Iron"],
    patentText: "Bell, US174465A, Claim 1",
    file: "diaphragm.glb",
    offset: [0, 0.8, 0],
    assembledPosition: [0, 0, 0],
    explodedPosition: [0, 0.8, 0],
    color: "#94A3B8",
  },
  {
    id: "telephone-housing",
    inventionId: "telephone",
    name: "Wooden Housing",
    description: "Encloses the electromagnet coil. Wood chosen for its non-conductive properties.",
    materials: ["Wood"],
    patentText: "Bell, US174465A, Claim 3",
    file: "housing.glb",
    offset: [0, -0.6, 0],
    assembledPosition: [0, 0, 0],
    explodedPosition: [0, -0.6, 0],
    color: "#8B4513",
  },
  {
    id: "telephone-coil",
    inventionId: "telephone",
    name: "Electromagnet Coil",
    description: "Converts varying electrical current back into mechanical vibration at the receiver end.",
    materials: ["Copper wire", "Iron core"],
    patentText: "Bell, US174465A, Claim 2",
    file: "coil.glb",
    offset: [-0.8, 0, 0],
    assembledPosition: [0, 0, 0],
    explodedPosition: [-0.8, 0, 0],
    color: "#B87333",
  },
  {
    id: "telephone-receiver",
    inventionId: "telephone",
    name: "Receiver Horn",
    description: "Directs and amplifies sound waves toward the diaphragm during transmission.",
    materials: ["Brass"],
    patentText: "Bell, US174465A, Fig. 1",
    file: "receiver.glb",
    offset: [0.8, 0, 0],
    assembledPosition: [0, 0, 0],
    explodedPosition: [0.8, 0, 0],
    color: "#D4A017",
  },
  {
    id: "telephone-battery",
    inventionId: "telephone",
    name: "Battery Terminal",
    description: "Provides the electrical current that carries the voice signal through the wire.",
    materials: ["Zinc", "Copper"],
    patentText: "Bell, US174465A",
    file: "battery.glb",
    offset: [0, 0, 0.8],
    assembledPosition: [0, 0, 0],
    explodedPosition: [0, 0, 0.8],
    color: "#4A5568",
  },
  // iPhone
  {
    id: "iphone-display",
    inventionId: "iphone",
    name: "Display Assembly",
    description: "3.5-inch multi-touch capacitive display — the primary interface that eliminated the need for a physical keyboard.",
    materials: ["Glass", "LCD", "Capacitive sensors"],
    patentText: "Apple, US7966578B2",
    file: "display.glb",
    offset: [0, 0.8, 0],
    assembledPosition: [0, 0, 0],
    explodedPosition: [0, 0.8, 0],
    color: "#1E293B",
  },
  {
    id: "iphone-logic-board",
    inventionId: "iphone",
    name: "Logic Board",
    description: "ARM-based processor and memory — the brain that runs iPhone OS.",
    materials: ["Silicon", "PCB", "Solder"],
    patentText: "Apple, US7966578B2",
    file: "logic-board.glb",
    offset: [0, -0.6, 0],
    assembledPosition: [0, 0, 0],
    explodedPosition: [0, -0.6, 0],
    color: "#22C55E",
  },
  {
    id: "iphone-battery",
    inventionId: "iphone",
    name: "Battery",
    description: "Lithium-ion battery providing power for the device.",
    materials: ["Lithium-ion"],
    patentText: "Apple",
    file: "battery.glb",
    offset: [-0.8, 0, 0],
    assembledPosition: [0, 0, 0],
    explodedPosition: [-0.8, 0, 0],
    color: "#3B82F6",
  },
  {
    id: "iphone-camera",
    inventionId: "iphone",
    name: "Camera Module",
    description: "2-megapixel camera module — beginning of the smartphone camera revolution.",
    materials: ["Glass lens", "CMOS sensor"],
    patentText: "Apple",
    file: "camera.glb",
    offset: [0.8, 0, 0],
    assembledPosition: [0, 0, 0],
    explodedPosition: [0.8, 0, 0],
    color: "#6366F1",
  },
  {
    id: "iphone-speaker",
    inventionId: "iphone",
    name: "Speaker Assembly",
    description: "Speaker and microphone assembly for voice calls and media playback.",
    materials: ["Magnet", "Membrane", "Metal housing"],
    patentText: "Apple",
    file: "speaker.glb",
    offset: [0, 0, 0.8],
    assembledPosition: [0, 0, 0],
    explodedPosition: [0, 0, 0.8],
    color: "#F59E0B",
  },
  // Steam Engine
  {
    id: "engine-piston",
    inventionId: "steam-engine",
    name: "Piston",
    description: "Moves within the cylinder under steam pressure, converting thermal energy to mechanical motion.",
    materials: ["Cast iron"],
    patentText: "Watt, GB913A/1769",
    file: "piston.glb",
    offset: [0, 0.8, 0],
    assembledPosition: [0, 0, 0],
    explodedPosition: [0, 0.8, 0],
    color: "#6B7280",
  },
  {
    id: "engine-cylinder",
    inventionId: "steam-engine",
    name: "Cylinder",
    description: "Houses the piston. Watt's key insight was to keep the cylinder hot at all times.",
    materials: ["Cast iron", "Brass fittings"],
    patentText: "Watt, GB913A/1769",
    file: "cylinder.glb",
    offset: [0, -0.6, 0],
    assembledPosition: [0, 0, 0],
    explodedPosition: [0, -0.6, 0],
    color: "#4B5563",
  },
  {
    id: "engine-flywheel",
    inventionId: "steam-engine",
    name: "Flywheel",
    description: "Stores rotational energy and smooths out the power delivery between piston strokes.",
    materials: ["Cast iron"],
    patentText: "Watt",
    file: "flywheel.glb",
    offset: [0.8, 0, 0],
    assembledPosition: [0, 0, 0],
    explodedPosition: [0.8, 0, 0],
    color: "#374151",
  },
  {
    id: "engine-beam",
    inventionId: "steam-engine",
    name: "Beam",
    description: "The rocking beam transfers piston motion to the flywheel and pump mechanism.",
    materials: ["Wood", "Iron"],
    patentText: "Watt",
    file: "beam.glb",
    offset: [-0.8, 0, 0],
    assembledPosition: [0, 0, 0],
    explodedPosition: [-0.8, 0, 0],
    color: "#92400E",
  },
  {
    id: "engine-condenser",
    inventionId: "steam-engine",
    name: "Separate Condenser",
    description: "Watt's breakthrough — a separate chamber to condense steam without cooling the main cylinder.",
    materials: ["Copper", "Brass"],
    patentText: "Watt, GB913A/1769, Key Innovation",
    file: "condenser.glb",
    offset: [0, 0, 0.8],
    assembledPosition: [0, 0, 0],
    explodedPosition: [0, 0, 0.8],
    color: "#B45309",
  },
  {
    id: "engine-boiler",
    inventionId: "steam-engine",
    name: "Boiler",
    description: "Coal-fired boiler that generates steam to drive the engine.",
    materials: ["Iron plates", "Rivets", "Copper tubes"],
    patentText: "Watt",
    file: "boiler.glb",
    offset: [0, 0, -0.8],
    assembledPosition: [0, 0, 0],
    explodedPosition: [0, 0, -0.8],
    color: "#991B1B",
  },
  // Telescope
  {
    id: "telescope-objective",
    inventionId: "telescope",
    name: "Objective Lens",
    description: "The larger convex lens at the front that gathers and focuses light from distant objects.",
    materials: ["Glass"],
    patentText: "Galileo, pre-patent era",
    file: "objective-lens.glb",
    offset: [0, 0, 0.8],
    assembledPosition: [0, 0, 0],
    explodedPosition: [0, 0, 0.8],
    color: "#BFDBFE",
  },
  {
    id: "telescope-eyepiece",
    inventionId: "telescope",
    name: "Eyepiece Lens",
    description: "The smaller concave lens the observer looks through, magnifying the image formed by the objective.",
    materials: ["Glass"],
    patentText: "Galileo",
    file: "eyepiece-lens.glb",
    offset: [0, 0, -0.8],
    assembledPosition: [0, 0, 0],
    explodedPosition: [0, 0, -0.8],
    color: "#93C5FD",
  },
  {
    id: "telescope-outer-barrel",
    inventionId: "telescope",
    name: "Outer Barrel",
    description: "The main brass tube that holds the optical elements in alignment.",
    materials: ["Brass"],
    patentText: "Galileo",
    file: "outer-barrel.glb",
    offset: [0.8, 0, 0],
    assembledPosition: [0, 0, 0],
    explodedPosition: [0.8, 0, 0],
    color: "#D4A017",
  },
  {
    id: "telescope-inner-barrel",
    inventionId: "telescope",
    name: "Inner Barrel",
    description: "Slides within the outer barrel to adjust focus distance.",
    materials: ["Brass"],
    patentText: "Galileo",
    file: "inner-barrel.glb",
    offset: [-0.8, 0, 0],
    assembledPosition: [0, 0, 0],
    explodedPosition: [-0.8, 0, 0],
    color: "#B8860B",
  },
  {
    id: "telescope-mount-rings",
    inventionId: "telescope",
    name: "Lens Mount Rings",
    description: "Secure the lenses in position within the barrel.",
    materials: ["Brass", "Wood"],
    patentText: "Galileo",
    file: "mount-rings.glb",
    offset: [0, 0.8, 0],
    assembledPosition: [0, 0, 0],
    explodedPosition: [0, 0.8, 0],
    color: "#A0522D",
  },
];

export function getComponentsByInventionId(inventionId: string): InventionComponent[] {
  return inventionComponents.filter((c) => c.inventionId === inventionId);
}

export function getComponentById(id: string): InventionComponent | undefined {
  return inventionComponents.find((c) => c.id === id);
}
```

Note: `getComponentById` is used by `useExpert.ts` — do not remove this export.

- [ ] **Step 5: Run the app to verify data layer compiles**

Run: `cd /Users/hongbing/Documents/Project/inventornet && npx next build 2>&1 | head -30`
Expected: No TypeScript errors in data files.

- [ ] **Step 6: Commit**

```bash
git add src/types/ src/data/
git commit -m "refactor: replace 25-invention dataset with 4 PRD inventions (telephone, iPhone, steam engine, telescope)"
```

---

### Task 2: Environment Variables & New Dependencies

**Files:**
- Modify: `package.json`
- Modify: `.env.local`

- [ ] **Step 1: Install CesiumJS and related packages**

Run: `cd /Users/hongbing/Documents/Project/inventornet && npm install cesium copy-webpack-plugin`

Note: Use the monolithic `cesium` package (not `@cesium/engine` + `@cesium/widgets` split) for simplicity.

- [ ] **Step 2: Install MediaPipe Hands**

Run: `npm install @mediapipe/hands @mediapipe/camera_utils`

- [ ] **Step 3: Install Exa.ai SDK**

Run: `npm install exa-js`

- [ ] **Step 4: Install ElevenLabs SDK**

Run: `npm install elevenlabs`

- [ ] **Step 5: Install Agora SDK**

Run: `npm install agora-rtc-sdk-ng`

- [ ] **Step 6: Update .env.local with new API key placeholders**

Add to `.env.local` (do not overwrite existing keys).
Note: CesiumJS and Google 3D Tiles run client-side, so their tokens MUST have the `NEXT_PUBLIC_` prefix.

```
NEXT_PUBLIC_CESIUM_ION_ACCESS_TOKEN=your_cesium_token
NEXT_PUBLIC_GOOGLE_3D_TILES_KEY=your_google_tiles_key
EXA_API_KEY=your_exa_key
ELEVENLABS_API_KEY=your_elevenlabs_key
NEXT_PUBLIC_AGORA_APP_ID=your_agora_app_id
```

- [ ] **Step 7: Update next.config.ts for CesiumJS**

CesiumJS requires special webpack config for static assets. Update `next.config.ts`:

```typescript
import type { NextConfig } from "next";
import path from "path";
import CopyPlugin from "copy-webpack-plugin";

// Robust path to Cesium build directory
const cesiumRoot = path.dirname(require.resolve("cesium/package.json"));
const cesiumBuild = path.join(cesiumRoot, "Build/Cesium");

const nextConfig: NextConfig = {
  transpilePackages: ["three", "react-globe.gl", "three-globe"],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.plugins.push(
        new CopyPlugin({
          patterns: [
            { from: path.join(cesiumBuild, "Workers"), to: "../public/cesium/Workers" },
            { from: path.join(cesiumBuild, "ThirdParty"), to: "../public/cesium/ThirdParty" },
            { from: path.join(cesiumBuild, "Assets"), to: "../public/cesium/Assets" },
            { from: path.join(cesiumBuild, "Widgets"), to: "../public/cesium/Widgets" },
          ],
        })
      );
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

export default nextConfig;
```

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json next.config.ts .env.local
git commit -m "chore: add CesiumJS, MediaPipe, Exa, ElevenLabs, Agora dependencies and env config"
```

---

### Task 2.5: GLB Model Directory Structure & Asset Placeholders

Pre-generated GLB models must exist in `public/models/` before the holographic viewer can load them. This task creates the directory structure. Actual GLB files are generated via the PRD's pipeline (Nano Banana → SAM-3D → Rodin → trimesh) as a manual pre-hackathon step.

**Files:**
- Create: `public/models/telephone/` directory
- Create: `public/models/iphone/` directory
- Create: `public/models/steam-engine/` directory
- Create: `public/models/telescope/` directory
- Create: `public/models/README.md`

- [ ] **Step 1: Create model directory structure**

```bash
mkdir -p public/models/{telephone,iphone,steam-engine,telescope}
```

- [ ] **Step 2: Create README documenting expected files**

Create `public/models/README.md`:

```markdown
# 3D Model Assets

Pre-generate these GLB files using the pipeline described in docs/inventra-prd.md Section 9.

## Expected files per invention:

### telephone/
- hero.glb (Rodin prompt: "1876 Alexander Graham Bell telephone, wooden box body, iron diaphragm, brass fittings, Victorian era, museum quality")
- diaphragm.glb, housing.glb, coil.glb, receiver.glb, battery.glb (via SAM-3D from patent US174465A)

### iphone/
- hero.glb (Rodin prompt: "original iPhone 2007, front face, black glass screen, silver aluminum unibody back, single home button")
- display.glb, logic-board.glb, battery.glb, camera.glb, speaker.glb (via SAM-3D from iFixit teardown photos)

### steam-engine/
- hero.glb (Rodin prompt: "Watt steam engine 1769, large flywheel, piston cylinder, beam arm, coal furnace, Victorian industrial")
- piston.glb, cylinder.glb, flywheel.glb, beam.glb, condenser.glb, boiler.glb (via SAM-3D from individual part diagrams)

### telescope/
- hero.glb (Rodin prompt: "Galilean telescope 1609, long brass barrel, two lens elements, wooden mount, aged patina")
- objective-lens.glb, eyepiece-lens.glb, outer-barrel.glb, inner-barrel.glb, mount-rings.glb (via SAM-3D)

All GLBs should be cleaned with trimesh (fill_holes, fix_normals, remove_duplicate_faces) before placing here.
```

- [ ] **Step 3: Add .gitkeep files so empty directories are tracked**

```bash
touch public/models/telephone/.gitkeep public/models/iphone/.gitkeep public/models/steam-engine/.gitkeep public/models/telescope/.gitkeep
```

- [ ] **Step 4: Commit**

```bash
git add public/models/
git commit -m "chore: create GLB model directory structure with generation instructions"
```

---

## Phase 1: CesiumJS Globe & Temporos (Day 1 of PRD)

### Task 3: CesiumJS Globe Component — Basic Rendering

Replace react-globe.gl with CesiumJS. Keep old globe files for reference until new one works.

**Files:**
- Create: `src/components/globe/CesiumGlobe.tsx`
- Create: `src/components/globe/CesiumGlobeClient.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create CesiumGlobeClient component**

Create `src/components/globe/CesiumGlobeClient.tsx`:

```tsx
"use client";

import { useEffect, useRef, useCallback } from "react";
import {
  Viewer,
  Cartesian3,
  Color,
  Ion,
  createGooglePhotorealistic3DTileset,
  VerticalOrigin,
  HorizontalOrigin,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  defined,
} from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { inventions } from "@/data/inventions";
import { categories } from "@/data/categories";
import { Invention } from "@/types";

// Configure Cesium static assets path
if (typeof window !== "undefined") {
  (window as Record<string, unknown>).CESIUM_BASE_URL = "/cesium";
}

interface CesiumGlobeClientProps {
  onInventionSelect: (invention: Invention) => void;
  selectedInventionId?: string;
  temporosYear: number;
}

export default function CesiumGlobeClient({
  onInventionSelect,
  selectedInventionId,
  temporosYear,
}: CesiumGlobeClientProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    // Set Ion token if available
    const ionToken = process.env.NEXT_PUBLIC_CESIUM_ION_ACCESS_TOKEN;
    if (ionToken) Ion.defaultAccessToken = ionToken;

    const viewer = new Viewer(containerRef.current, {
      timeline: false,
      animation: false,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      selectionIndicator: false,
      navigationHelpButton: false,
      fullscreenButton: false,
      infoBox: false,
      requestRenderMode: false,
      scene3DOnly: true,
    });

    viewerRef.current = viewer;

    // Dark space background
    viewer.scene.backgroundColor = Color.fromCssColorString("#0a0a1a");
    viewer.scene.globe.baseColor = Color.fromCssColorString("#111827");

    // Add Google 3D Tiles if API key available
    const googleKey = process.env.NEXT_PUBLIC_GOOGLE_3D_TILES_KEY;
    if (googleKey) {
      createGooglePhotorealistic3DTileset(undefined, { key: googleKey })
        .then((tileset) => viewer.scene.primitives.add(tileset))
        .catch(console.error);
    }

    // Add invention markers
    addInventionMarkers(viewer, temporosYear);

    // Click handler — CesiumJS entities use .properties for custom data
    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((click: { position: { x: number; y: number } }) => {
      const picked = viewer.scene.pick(click.position);
      if (defined(picked) && defined(picked.id) && picked.id.properties) {
        const inventionId = picked.id.properties.inventionId?.getValue();
        if (inventionId) {
          const inv = inventions.find((i) => i.id === inventionId);
          if (inv) onInventionSelect(inv);
        }
      }
    }, ScreenSpaceEventType.LEFT_CLICK);

    // Hover handler — show tooltip on marker hover per PRD 7.3
    handler.setInputAction((movement: { endPosition: { x: number; y: number } }) => {
      const picked = viewer.scene.pick(movement.endPosition);
      // Hide all labels first
      viewer.entities.values.forEach((e: any) => {
        if (e.label) e.label.show = false;
      });
      // Show label for hovered entity
      if (defined(picked) && defined(picked.id) && picked.id.label) {
        picked.id.label.show = true;
      }
    }, ScreenSpaceEventType.MOUSE_MOVE);

    // Default view
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(0, 20, 20000000),
      duration: 0,
    });

    return () => {
      handler.destroy();
      viewer.destroy();
      viewerRef.current = null;
    };
  }, []);

  // Update markers when Temporos year changes
  useEffect(() => {
    if (!viewerRef.current) return;
    const viewer = viewerRef.current;
    viewer.entities.removeAll();
    addInventionMarkers(viewer, temporosYear);
  }, [temporosYear]);

  // Fly to selected invention
  useEffect(() => {
    if (!viewerRef.current || !selectedInventionId) return;
    const inv = inventions.find((i) => i.id === selectedInventionId);
    if (!inv) return;
    viewerRef.current.camera.flyTo({
      destination: Cartesian3.fromDegrees(inv.location.lng, inv.location.lat, 800000),
      duration: 2.0,
    });
  }, [selectedInventionId]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }}
    />
  );
}

function addInventionMarkers(viewer: Viewer, temporosYear: number) {
  for (const inv of inventions) {
    // Only show if invention date <= current Temporos year
    if (inv.inventionDate > temporosYear) continue;

    const cat = categories.find((c) => c.id === inv.category);
    const color = cat ? Color.fromCssColorString(cat.color) : Color.fromCssColorString("#2563EB");

    viewer.entities.add({
      position: Cartesian3.fromDegrees(inv.location.lng, inv.location.lat),
      billboard: {
        image: createMarkerCanvas(color.toCssColorString()),
        verticalOrigin: VerticalOrigin.BOTTOM,
        horizontalOrigin: HorizontalOrigin.CENTER,
        scale: 0.5,
      },
      label: {
        text: `${inv.title} (${inv.inventionDate})`,
        font: "14px Inter, sans-serif",
        fillColor: Color.WHITE,
        outlineColor: Color.BLACK,
        outlineWidth: 2,
        verticalOrigin: VerticalOrigin.TOP,
        pixelOffset: { x: 0, y: 8 } as any,
        show: false, // shown on hover via MOUSE_MOVE handler
      },
      properties: { inventionId: inv.id } as any,
    } as any);

    // Ripple animation per PRD — radiates outward when Temporos crosses
    // the commercialisation date. Shows an expanding translucent ellipse.
    if (
      inv.commercialisationDate <= temporosYear &&
      inv.commercialisationDate > temporosYear - 10
    ) {
      const rippleRadius = (temporosYear - inv.commercialisationDate) * 50000 + 50000;
      viewer.entities.add({
        position: Cartesian3.fromDegrees(inv.location.lng, inv.location.lat),
        ellipse: {
          semiMinorAxis: rippleRadius,
          semiMajorAxis: rippleRadius,
          material: color.withAlpha(0.15) as any,
          outline: true,
          outlineColor: color.withAlpha(0.4),
          outlineWidth: 2,
          height: 0,
        },
      } as any);
    }
  }
}

function createMarkerCanvas(colorHex: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d")!;

  // Glow
  ctx.shadowColor = colorHex;
  ctx.shadowBlur = 12;

  // Dot
  ctx.beginPath();
  ctx.arc(16, 16, 8, 0, Math.PI * 2);
  ctx.fillStyle = colorHex;
  ctx.fill();

  // Inner highlight
  ctx.beginPath();
  ctx.arc(16, 16, 4, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.globalAlpha = 0.6;
  ctx.fill();

  return canvas;
}
```

- [ ] **Step 2: Create dynamic import wrapper**

Create `src/components/globe/CesiumGlobe.tsx`:

```tsx
"use client";

import dynamic from "next/dynamic";
import { GlobeLoader } from "@/components/ui/GlobeLoader";
import { Invention } from "@/types";

const CesiumGlobeClient = dynamic(() => import("./CesiumGlobeClient"), {
  ssr: false,
  loading: () => <GlobeLoader />,
});

interface CesiumGlobeProps {
  onInventionSelect: (invention: Invention) => void;
  selectedInventionId?: string;
  temporosYear: number;
}

export default function CesiumGlobe(props: CesiumGlobeProps) {
  return <CesiumGlobeClient {...props} />;
}
```

- [ ] **Step 3: Verify CesiumJS globe renders**

Run: `npm run dev` and confirm the globe loads.

- [ ] **Step 4: Commit**

```bash
git add src/components/globe/CesiumGlobe.tsx src/components/globe/CesiumGlobeClient.tsx
git commit -m "feat: add CesiumJS globe with Google 3D Tiles and invention markers"
```

---

### Task 4: Temporos Timeline Engine

**Files:**
- Create: `src/components/globe/TemporosSlider.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create Temporos slider component**

Create `src/components/globe/TemporosSlider.tsx`:

```tsx
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { inventions } from "@/data/inventions";

interface TemporosSliderProps {
  year: number;
  onYearChange: (year: number) => void;
}

const MIN_YEAR = 1600;
const MAX_YEAR = 2025;
const DECADES = Array.from(
  { length: Math.floor((MAX_YEAR - MIN_YEAR) / 50) + 1 },
  (_, i) => MIN_YEAR + i * 50
);

export default function TemporosSlider({ year, onYearChange }: TemporosSliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Inventions visible at current year
  const visibleCount = inventions.filter((inv) => inv.inventionDate <= year).length;

  // Commercialisation ripple markers
  const rippleInventions = inventions.filter(
    (inv) => Math.abs(inv.commercialisationDate - year) < 5
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      setIsDragging(true);
      updateYear(e);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      updateYear(e);
    },
    [isDragging]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const updateYear = (e: React.PointerEvent) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newYear = Math.round(MIN_YEAR + pct * (MAX_YEAR - MIN_YEAR));
    onYearChange(newYear);
  };

  // Keyboard support
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const step = e.shiftKey ? 50 : 10;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        onYearChange(Math.min(MAX_YEAR, year + step));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        onYearChange(Math.max(MIN_YEAR, year - step));
      }
    },
    [year, onYearChange]
  );

  const pct = ((year - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-[80%] max-w-3xl">
      <div className="bg-black/70 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/10">
        {/* Year display */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-white/50 font-mono">TEMPOROS</span>
          <span className="text-2xl font-bold text-white font-mono tabular-nums">
            {year}
          </span>
          <span className="text-xs text-white/50">
            {visibleCount} invention{visibleCount !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Slider track */}
        <div
          ref={sliderRef}
          className="relative h-8 cursor-pointer select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="slider"
          aria-label="Temporos timeline"
          aria-valuemin={MIN_YEAR}
          aria-valuemax={MAX_YEAR}
          aria-valuenow={year}
        >
          {/* Track background */}
          <div className="absolute top-1/2 -translate-y-1/2 w-full h-1 bg-white/10 rounded-full" />

          {/* Active track */}
          <div
            className="absolute top-1/2 -translate-y-1/2 h-1 bg-[#2563EB] rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />

          {/* Invention date markers */}
          {inventions.map((inv) => {
            const invPct =
              ((inv.inventionDate - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100;
            const isVisible = inv.inventionDate <= year;
            return (
              <div
                key={inv.id}
                className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full transition-all duration-300"
                style={{
                  left: `${invPct}%`,
                  backgroundColor: isVisible ? "#2563EB" : "#ffffff20",
                  transform: "translate(-50%, -50%)",
                  boxShadow: isVisible ? "0 0 8px #2563EB" : "none",
                }}
                title={`${inv.title} (${inv.inventionDate})`}
              />
            );
          })}

          {/* Thumb */}
          <div
            className="absolute top-1/2 w-5 h-5 bg-[#2563EB] rounded-full border-2 border-white shadow-lg shadow-blue-500/50 transition-shadow"
            style={{
              left: `${pct}%`,
              transform: "translate(-50%, -50%)",
            }}
          />
        </div>

        {/* Decade labels */}
        <div className="relative mt-1 h-4">
          {DECADES.map((d) => {
            const dPct = ((d - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100;
            return (
              <span
                key={d}
                className="absolute text-[10px] text-white/30 font-mono"
                style={{ left: `${dPct}%`, transform: "translateX(-50%)" }}
              >
                {d}
              </span>
            );
          })}
        </div>

        {/* Ripple indicators */}
        {rippleInventions.length > 0 && (
          <div className="mt-2 flex gap-2">
            {rippleInventions.map((inv) => (
              <span
                key={inv.id}
                className="text-xs text-[#2563EB] animate-pulse"
              >
                {inv.title} commercialised
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify slider renders and controls year**

Run: `npm run dev` and confirm the Temporos slider appears at the bottom of the globe view.

- [ ] **Step 3: Commit**

```bash
git add src/components/globe/TemporosSlider.tsx
git commit -m "feat: add Temporos timeline slider with decade markers and ripple indicators"
```

---

### Task 5: Wire CesiumJS Globe + Temporos into Main Page

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/hooks/useInventions.ts`

- [ ] **Step 1: Add temporosYear state to page and swap globe**

Update `src/app/page.tsx` to:
- Import `CesiumGlobe` instead of old `Globe`
- Add `temporosYear` state (default 2025)
- Pass `temporosYear` to CesiumGlobe and TemporosSlider
- Wire `onInventionSelect` from CesiumGlobe to side panel

- [ ] **Step 2: Update useInventions hook for new category types**

Update `src/hooks/useInventions.ts` to use the new `CategoryId` type and work with the 4-invention dataset.

- [ ] **Step 3: Test full globe + Temporos flow**

Run: `npm run dev`, scrub the slider from 1600 to 2025, verify markers appear/disappear.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx src/hooks/useInventions.ts
git commit -m "feat: wire CesiumJS globe and Temporos slider into main page"
```

---

### Task 6: Exa.ai Semantic Search Integration

**Files:**
- Create: `src/lib/exa-search.ts`
- Create: `src/app/api/exa-search/route.ts`
- Modify: `src/components/discovery/SidePanel.tsx`

- [ ] **Step 1: Create Exa search server utility**

Create `src/lib/exa-search.ts`:

```typescript
import Exa from "exa-js";

const exa = new Exa(process.env.EXA_API_KEY!);

export async function searchInventions(query: string) {
  const results = await exa.search(query, {
    type: "neural",
    numResults: 5,
    includeDomains: [
      "patents.google.com",
      "lens.org",
      "espacenet.com",
      "en.wikipedia.org",
    ],
    useAutoprompt: true,
  });
  return results.results;
}
```

- [ ] **Step 2: Create Exa search API route**

Create `src/app/api/exa-search/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { searchInventions } from "@/lib/exa-search";
import { chatCompletion } from "@/lib/openrouter";
import { inventions } from "@/data/inventions";

export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    if (!process.env.EXA_API_KEY) {
      // Fallback: simple text matching against local inventions
      const matched = inventions.find((inv) =>
        `${inv.title} ${inv.description} ${inv.country}`
          .toLowerCase()
          .includes(query.toLowerCase())
      );
      return NextResponse.json({
        inventionId: matched?.id || null,
        lat: matched?.location.lat || 0,
        lng: matched?.location.lng || 0,
        regionName: matched?.location.label || "",
      });
    }

    const exaResults = await searchInventions(query);

    // Use OpenRouter to extract structured data from Exa results
    const prompt = `Query: "${query}"
Results: ${JSON.stringify(exaResults.map((r) => r.title + ": " + r.url))}

Our known inventions: telephone (1876, Boston), iphone (2007, Cupertino), steam-engine (1769, Birmingham), telescope (1609, Padua)

Return ONLY JSON: { "inventionId": "telephone|iphone|steam-engine|telescope|null", "lat": number, "lng": number, "regionName": string }`;

    const response = await chatCompletion([
      { role: "user", content: prompt },
    ]);

    const parsed = JSON.parse(response);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Exa search error:", error);
    return NextResponse.json(
      { inventionId: null, lat: 0, lng: 0, regionName: "" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Wire search into SidePanel**

Update `src/components/discovery/SidePanel.tsx` to call `/api/exa-search` on query submit and emit an event to fly the globe to the result.

- [ ] **Step 4: Test search with PRD demo queries**

Test: "optical instruments Renaissance Italy" → should match telescope.
Test: "voice transmission electricity 1870s" → should match telephone.

- [ ] **Step 5: Commit**

```bash
git add src/lib/exa-search.ts src/app/api/exa-search/route.ts src/components/discovery/SidePanel.tsx
git commit -m "feat: add Exa.ai semantic search with OpenRouter extraction and globe flyTo"
```

---

## Phase 2: Holographic Viewer + MediaPipe Gestures (Day 2 of PRD)

### Task 7: Webcam Holographic Viewer — Base Layer

**Files:**
- Create: `src/components/viewer/HolographicViewer.tsx`
- Create: `src/components/viewer/HolographicViewerClient.tsx`
- Create: `src/components/viewer/WebcamLayer.tsx`
- Create: `src/hooks/useWebcam.ts`

- [ ] **Step 1: Create useWebcam hook**

Create `src/hooks/useWebcam.ts`:

```typescript
"use client";

import { useEffect, useRef, useState } from "react";

export function useWebcam() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function startWebcam() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => setIsReady(true);
        }
      } catch (err) {
        setError("Webcam access denied or unavailable.");
        console.error("Webcam error:", err);
      }
    }

    startWebcam();

    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return { videoRef, isReady, error };
}
```

- [ ] **Step 2: Create WebcamLayer component**

Create `src/components/viewer/WebcamLayer.tsx`:

```tsx
"use client";

import { RefObject } from "react";

interface WebcamLayerProps {
  videoRef: RefObject<HTMLVideoElement>;
}

export default function WebcamLayer({ videoRef }: WebcamLayerProps) {
  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        objectFit: "cover",
        transform: "scaleX(-1)", // mirror
      }}
    />
  );
}
```

- [ ] **Step 3: Create HolographicViewerClient with Three.js transparent overlay**

Create `src/components/viewer/HolographicViewerClient.tsx`:

```tsx
"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import WebcamLayer from "./WebcamLayer";
import { useWebcam } from "@/hooks/useWebcam";
import { Invention, InventionComponent } from "@/types";
import { getComponentsByInventionId } from "@/data/invention-components";

interface HolographicViewerClientProps {
  invention: Invention;
  onBack: () => void;
  onComponentSelect: (component: InventionComponent | null) => void;
}

export default function HolographicViewerClient({
  invention,
  onBack,
  onComponentSelect,
}: HolographicViewerClientProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { videoRef, isReady: webcamReady, error: webcamError } = useWebcam();
  const [isExploded, setIsExploded] = useState(false);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    model: THREE.Group | null;
    componentOffsets: Record<string, THREE.Vector3>;
    originalPositions: Record<string, THREE.Vector3>;
  } | null>(null);

  const components = getComponentsByInventionId(invention.id);

  // Initialize Three.js scene with transparent background
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(1280, 720);
    renderer.setPixelRatio(window.devicePixelRatio);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1280 / 720, 0.1, 100);
    camera.position.set(0, 1, 3);
    camera.lookAt(0, 0, 0);

    // Lighting per PRD
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);

    // Glow ring per PRD
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.4, 0.5, 64),
      new THREE.MeshBasicMaterial({
        color: 0x2563eb,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.8;
    scene.add(ring);

    sceneRef.current = {
      scene,
      camera,
      renderer,
      model: null,
      componentOffsets: {},
      originalPositions: {},
    };

    // Resize handler — keep renderer matched to container
    const handleResize = () => {
      if (!canvasRef.current) return;
      const container = canvasRef.current.parentElement!;
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", handleResize);
    handleResize(); // initial size

    // Load model — try GLB first, fallback to procedural geometry
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);
    sceneRef.current.model = modelGroup;

    const loader = new GLTFLoader();
    const heroPath = `/models/${invention.id}/hero.glb`;

    // Attempt to load hero GLB model
    loader.load(
      heroPath,
      (gltf) => {
        // GLB loaded successfully — use real model
        const model = gltf.scene;
        modelGroup.add(model);

        // Map mesh names to component data for exploded view
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const comp = components.find(
              (c) => c.file.replace(".glb", "") === child.name || c.name === child.name
            );
            if (comp) {
              child.name = comp.id;
              child.userData.originalPos = child.position.clone();
              child.userData.targetPos = child.position.clone();
              child.userData.componentData = comp;
              sceneRef.current!.componentOffsets[comp.id] = new THREE.Vector3(...comp.offset);
              sceneRef.current!.originalPositions[comp.id] = child.position.clone();
            }
          }
        });
      },
      undefined,
      () => {
        // GLB not found — fallback to procedural geometry
        console.warn(`No GLB found at ${heroPath}, using procedural components`);
        createProceduralComponents(modelGroup, components, sceneRef.current!);
      }
    );

    function createProceduralComponents(
      group: THREE.Group,
      comps: typeof components,
      refs: NonNullable<typeof sceneRef.current>
    ) {
      comps.forEach((comp) => {
        const geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(comp.color),
          metalness: 0.3,
          roughness: 0.7,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = comp.id;
        mesh.position.set(...comp.assembledPosition);
        mesh.userData.originalPos = mesh.position.clone();
        mesh.userData.targetPos = mesh.position.clone();
        mesh.userData.componentData = comp;
        group.add(mesh);

        refs.componentOffsets[comp.id] = new THREE.Vector3(...comp.offset);
        refs.originalPositions[comp.id] = mesh.position.clone();
      });
    }

    // Animation loop
    function animate() {
      requestAnimationFrame(animate);
      if (sceneRef.current?.model) {
        sceneRef.current.model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh && child.userData.targetPos) {
            child.position.lerp(child.userData.targetPos, 0.08);
          }
        });
      }
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      sceneRef.current = null;
    };
  }, [invention.id]);

  // Explode/assemble
  const triggerExplode = useCallback(() => {
    if (!sceneRef.current?.model) return;
    sceneRef.current.model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && sceneRef.current!.componentOffsets[child.name]) {
        child.userData.targetPos = sceneRef.current!.originalPositions[child.name]
          .clone()
          .add(sceneRef.current!.componentOffsets[child.name]);
      }
    });
    setIsExploded(true);
  }, []);

  const triggerAssemble = useCallback(() => {
    if (!sceneRef.current?.model) return;
    sceneRef.current.model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && sceneRef.current!.originalPositions[child.name]) {
        child.userData.targetPos = sceneRef.current!.originalPositions[child.name].clone();
      }
    });
    setIsExploded(false);
  }, []);

  // Keyboard fallbacks per PRD
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      switch (e.key.toLowerCase()) {
        case "e":
          triggerExplode();
          break;
        case "a":
          triggerAssemble();
          break;
        case "+":
        case "=":
          if (sceneRef.current?.model) {
            sceneRef.current.model.scale.multiplyScalar(1.1);
            sceneRef.current.model.scale.clampScalar(0.3, 3.0);
          }
          break;
        case "-":
          if (sceneRef.current?.model) {
            sceneRef.current.model.scale.multiplyScalar(0.9);
            sceneRef.current.model.scale.clampScalar(0.3, 3.0);
          }
          break;
        case "arrowleft":
          if (sceneRef.current?.model)
            sceneRef.current.model.rotation.y -= 0.1;
          break;
        case "arrowright":
          if (sceneRef.current?.model)
            sceneRef.current.model.rotation.y += 0.1;
          break;
        case "escape":
          onBack();
          break;
        // Number keys 1-4 to switch inventions per PRD
        case "1":
        case "2":
        case "3":
        case "4": {
          const inventionIds = ["telephone", "iphone", "steam-engine", "telescope"];
          const idx = parseInt(e.key) - 1;
          if (inventionIds[idx] && inventionIds[idx] !== invention.id) {
            // Emit event for parent to switch invention
            window.dispatchEvent(
              new CustomEvent("switchInvention", { detail: inventionIds[idx] })
            );
          }
          break;
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [triggerExplode, triggerAssemble, onBack, invention.id]);

  return (
    <div
      id="ar-container"
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        backgroundColor: "#000",
      }}
    >
      {/* Layer 1: Webcam */}
      <WebcamLayer videoRef={videoRef} />

      {/* Layer 2: Three.js transparent canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
      />

      {/* Keyboard HUD */}
      <div className="absolute bottom-4 left-4 z-30 bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 text-xs text-white/60 font-mono space-y-1">
        <div>E = Explode | A = Assemble</div>
        <div>+/- = Scale | Arrows = Rotate</div>
        <div>1-4 = Switch Invention | ESC = Back to Globe</div>
      </div>

      {/* Back button */}
      <button
        onClick={onBack}
        className="absolute top-4 left-4 z-30 bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 text-white text-sm hover:bg-black/80 transition"
      >
        ← Back to Globe
      </button>

      {/* Invention info */}
      <div className="absolute top-4 right-4 z-30 bg-black/60 backdrop-blur-sm rounded-lg px-4 py-3 text-white max-w-xs">
        <h2 className="text-lg font-bold">{invention.title}</h2>
        <p className="text-sm text-white/60">
          {invention.year} — {invention.inventors.join(", ")}
        </p>
      </div>

      {/* Webcam error */}
      {webcamError && (
        <div className="absolute inset-0 flex items-center justify-center z-40 bg-black/80">
          <div className="text-center text-white">
            <p className="text-lg mb-2">Webcam Unavailable</p>
            <p className="text-sm text-white/60">{webcamError}</p>
            <p className="text-sm text-white/60 mt-2">
              3D viewer works without webcam — holographic overlay disabled.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create dynamic import wrapper**

Create `src/components/viewer/HolographicViewer.tsx`:

```tsx
"use client";

import dynamic from "next/dynamic";
import { ViewerLoader } from "@/components/ui/ViewerLoader";
import { Invention, InventionComponent } from "@/types";

const HolographicViewerClient = dynamic(
  () => import("./HolographicViewerClient"),
  { ssr: false, loading: () => <ViewerLoader /> }
);

interface HolographicViewerProps {
  invention: Invention;
  onBack: () => void;
  onComponentSelect: (component: InventionComponent | null) => void;
}

export default function HolographicViewer(props: HolographicViewerProps) {
  return <HolographicViewerClient {...props} />;
}
```

- [ ] **Step 5: Test webcam + Three.js overlay renders**

Run: `npm run dev`, navigate to holographic viewer, verify webcam feed shows with 3D model overlay and glow ring.

- [ ] **Step 6: Commit**

```bash
git add src/components/viewer/HolographicViewer.tsx src/components/viewer/HolographicViewerClient.tsx src/components/viewer/WebcamLayer.tsx src/hooks/useWebcam.ts
git commit -m "feat: add holographic viewer with webcam overlay, Three.js transparent canvas, and glow ring"
```

---

### Task 8: MediaPipe Hand Gesture Detection

**Files:**
- Create: `src/hooks/useHandGestures.ts`
- Modify: `src/components/viewer/HolographicViewerClient.tsx`

- [ ] **Step 1: Create useHandGestures hook**

Create `src/hooks/useHandGestures.ts`:

```typescript
"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export type GestureType =
  | "palm_open"
  | "fist"
  | "point"
  | "pinch_open"
  | "pinch_close"
  | "none";

interface HandGestureState {
  gesture: GestureType;
  confidence: number;
  wristDeltaX: number;
  pinchDistance: number;
}

export function useHandGestures(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  enabled: boolean = true
) {
  const [gestureState, setGestureState] = useState<HandGestureState>({
    gesture: "none",
    confidence: 0,
    wristDeltaX: 0,
    pinchDistance: 0,
  });
  const prevPinchDistRef = useRef<number | null>(null);
  const prevWristXRef = useRef<number | null>(null);
  const debounceFramesRef = useRef(0);
  const lastGestureRef = useRef<GestureType>("none");

  useEffect(() => {
    if (!enabled || !videoRef.current) return;

    let hands: any = null;
    let camera: any = null;

    async function init() {
      const { Hands } = await import("@mediapipe/hands");
      const { Camera } = await import("@mediapipe/camera_utils");

      hands = new Hands({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5,
      });

      hands.onResults((results: any) => {
        if (!results.multiHandLandmarks?.length) {
          setGestureState({
            gesture: "none",
            confidence: 0,
            wristDeltaX: 0,
            pinchDistance: 0,
          });
          return;
        }

        const landmarks = results.multiHandLandmarks[0];
        const wrist = landmarks[0];
        const indexTip = landmarks[8];
        const thumbTip = landmarks[4];

        // Wrist rotation delta
        const wristDeltaX = prevWristXRef.current !== null
          ? wrist.x - prevWristXRef.current
          : 0;
        prevWristXRef.current = wrist.x;

        // Pinch distance
        const pinchDist = Math.hypot(
          indexTip.x - thumbTip.x,
          indexTip.y - thumbTip.y
        );
        const pinchDelta = prevPinchDistRef.current !== null
          ? pinchDist - prevPinchDistRef.current
          : 0;
        prevPinchDistRef.current = pinchDist;

        // Gesture classification
        let gesture: GestureType = "none";
        let confidence = 0;

        if (isPalmOpen(landmarks)) {
          gesture = "palm_open";
          confidence = 0.9;
        } else if (isFist(landmarks)) {
          gesture = "fist";
          confidence = 0.85;
        } else if (isPointingIndex(landmarks)) {
          gesture = "point";
          confidence = 0.8;
        }

        // 3-frame debounce per PRD
        if (gesture !== lastGestureRef.current) {
          debounceFramesRef.current++;
          if (debounceFramesRef.current < 3) {
            gesture = lastGestureRef.current;
          } else {
            debounceFramesRef.current = 0;
            lastGestureRef.current = gesture;
          }
        } else {
          debounceFramesRef.current = 0;
        }

        setGestureState({
          gesture,
          confidence,
          wristDeltaX,
          pinchDistance: pinchDelta,
        });
      });

      if (videoRef.current) {
        camera = new Camera(videoRef.current, {
          onFrame: async () => {
            if (hands && videoRef.current) {
              await hands.send({ image: videoRef.current });
            }
          },
          width: 1280,
          height: 720,
        });
        camera.start();
      }
    }

    init();

    return () => {
      camera?.stop();
      hands?.close();
    };
  }, [enabled, videoRef]);

  return gestureState;
}

function isPalmOpen(landmarks: any[]): boolean {
  const tips = [8, 12, 16, 20];
  const bases = [6, 10, 14, 18];
  return tips.every((tip, i) => landmarks[tip].y < landmarks[bases[i]].y);
}

function isFist(landmarks: any[]): boolean {
  const tips = [8, 12, 16, 20];
  const bases = [6, 10, 14, 18];
  return tips.every((tip, i) => landmarks[tip].y > landmarks[bases[i]].y);
}

function isPointingIndex(landmarks: any[]): boolean {
  // Only index finger extended
  const indexExtended = landmarks[8].y < landmarks[6].y;
  const middleClosed = landmarks[12].y > landmarks[10].y;
  const ringClosed = landmarks[16].y > landmarks[14].y;
  const pinkyClosed = landmarks[20].y > landmarks[18].y;
  return indexExtended && middleClosed && ringClosed && pinkyClosed;
}
```

- [ ] **Step 2: Wire gestures into HolographicViewerClient**

Add to `HolographicViewerClient.tsx`:
- Import and use `useHandGestures(videoRef)`
- On `palm_open` → `triggerExplode()`
- On `fist` → `triggerAssemble()`
- On `wristDeltaX` → rotate model
- On `pinchDistance` → scale model
- Display gesture confidence HUD in top-left corner

- [ ] **Step 3: Add gesture confidence HUD**

Add to HolographicViewerClient render:

```tsx
{/* Gesture HUD per PRD */}
<div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs font-mono text-white/60">
  Gesture: {gestureState.gesture} ({Math.round(gestureState.confidence * 100)}%)
</div>
```

- [ ] **Step 4: Test gesture detection with webcam**

Run: `npm run dev`, open holographic viewer, verify open palm triggers explode and fist triggers assemble.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useHandGestures.ts src/components/viewer/HolographicViewerClient.tsx
git commit -m "feat: add MediaPipe hand gesture detection with 3-frame debounce and confidence HUD"
```

---

### Task 9: Component Labels & Selection via Gesture

**Files:**
- Create: `src/components/viewer/ComponentLabels.tsx`
- Modify: `src/components/viewer/HolographicViewerClient.tsx`

- [ ] **Step 1: Create floating HTML component labels**

Create `src/components/viewer/ComponentLabels.tsx`:

```tsx
"use client";

import { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { InventionComponent } from "@/types";

interface ComponentLabelsProps {
  components: InventionComponent[];
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  renderer: THREE.WebGLRenderer | null;
  isExploded: boolean;
  selectedComponentId: string | null;
  onSelect: (component: InventionComponent) => void;
}

interface LabelPosition {
  x: number;
  y: number;
  visible: boolean;
  component: InventionComponent;
}

export default function ComponentLabels({
  components,
  scene,
  camera,
  renderer,
  isExploded,
  selectedComponentId,
  onSelect,
}: ComponentLabelsProps) {
  const [labels, setLabels] = useState<LabelPosition[]>([]);

  useEffect(() => {
    if (!scene || !camera || !renderer || !isExploded) {
      setLabels([]);
      return;
    }

    function updateLabels() {
      const newLabels: LabelPosition[] = [];
      const size = renderer!.getSize(new THREE.Vector2());

      scene!.traverse((child) => {
        if (!(child as THREE.Mesh).isMesh) return;
        const comp = components.find((c) => c.id === child.name);
        if (!comp) return;

        const pos = new THREE.Vector3();
        child.getWorldPosition(pos);
        pos.project(camera!);

        newLabels.push({
          x: ((pos.x + 1) / 2) * size.x,
          y: ((-pos.y + 1) / 2) * size.y,
          visible: pos.z < 1,
          component: comp,
        });
      });

      setLabels(newLabels);
    }

    const interval = setInterval(updateLabels, 100);
    return () => clearInterval(interval);
  }, [scene, camera, renderer, isExploded, components]);

  if (!isExploded) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {labels
        .filter((l) => l.visible)
        .map((label) => (
          <div
            key={label.component.id}
            className={`absolute pointer-events-auto cursor-pointer transition-all ${
              selectedComponentId === label.component.id
                ? "bg-[#2563EB]/80 scale-110"
                : "bg-black/60 hover:bg-black/80"
            } backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs text-white whitespace-nowrap`}
            style={{
              left: label.x,
              top: label.y,
              transform: "translate(-50%, -120%)",
            }}
            onClick={() => onSelect(label.component)}
          >
            <div className="font-medium">{label.component.name}</div>
          </div>
        ))}
    </div>
  );
}
```

- [ ] **Step 2: Integrate labels into HolographicViewerClient**

Add `ComponentLabels` to the viewer, passing scene/camera/renderer refs.

- [ ] **Step 3: Commit**

```bash
git add src/components/viewer/ComponentLabels.tsx src/components/viewer/HolographicViewerClient.tsx
git commit -m "feat: add floating component labels with selection in holographic viewer"
```

---

## Phase 3: AI Avatar + Voice + Integration (Day 3 of PRD)

### Task 10: ElevenLabs TTS Integration

**Files:**
- Create: `src/lib/elevenlabs.ts`
- Create: `src/app/api/tts/route.ts`

- [ ] **Step 1: Create ElevenLabs TTS utility**

Create `src/lib/elevenlabs.ts`:

```typescript
// Voice IDs — replace with actual ElevenLabs voice IDs after setup
export const PERSONA_VOICES: Record<string, string> = {
  "Dr. Alexander Bell": "your_bell_voice_id",
  Jony: "your_jony_voice_id",
  "Mr. James Watt": "your_watt_voice_id",
  "Professor Galileo": "your_galileo_voice_id",
};

export async function textToSpeech(
  text: string,
  personaVoiceId: string
): Promise<ArrayBuffer> {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${personaVoiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`ElevenLabs TTS failed: ${response.statusText}`);
  }

  return response.arrayBuffer();
}
```

- [ ] **Step 2: Create TTS API route**

Create `src/app/api/tts/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { textToSpeech, PERSONA_VOICES } from "@/lib/elevenlabs";

export async function POST(request: Request) {
  try {
    const { text, persona } = await request.json();

    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { error: "ElevenLabs API key not configured" },
        { status: 503 }
      );
    }

    const voiceId = PERSONA_VOICES[persona] || Object.values(PERSONA_VOICES)[0];
    const audioBuffer = await textToSpeech(text, voiceId);

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("TTS error:", error);
    return NextResponse.json({ error: "TTS failed" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/elevenlabs.ts src/app/api/tts/route.ts
git commit -m "feat: add ElevenLabs TTS integration with persona-specific voices"
```

---

### Task 11: Avatar Panel with Expert Chat + Voice

**Files:**
- Create: `src/components/viewer/AvatarPanel.tsx`
- Modify: `src/hooks/useExpert.ts`
- Modify: `src/lib/invention-context.ts`

- [ ] **Step 1: Update invention-context.ts with PRD 3-layer prompt**

Update `src/lib/invention-context.ts` to build the 3-layer system prompt per PRD:
- Layer 1: Base persona (persona name, plain language, enthusiastic)
- Layer 2: Invention context (year, origin, summary, how-it-works, impact)
- Layer 3: Current component (name, description, patent ref)

- [ ] **Step 2: Update useExpert hook with TTS playback**

Add to `src/hooks/useExpert.ts`:
- After receiving OpenRouter text response, POST to `/api/tts` with text and persona
- Play returned audio via `new Audio(URL.createObjectURL(blob))`.play()
- Track `isSpeaking` state for avatar pulse animation

- [ ] **Step 3: Create AvatarPanel component**

Create `src/components/viewer/AvatarPanel.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Invention, InventionComponent } from "@/types";
import { useExpert } from "@/hooks/useExpert";

interface AvatarPanelProps {
  invention: Invention;
  selectedComponent: InventionComponent | null;
}

export default function AvatarPanel({
  invention,
  selectedComponent,
}: AvatarPanelProps) {
  const { messages, sendMessage, isLoading, isSpeaking, suggestedQuestions } =
    useExpert(invention.id, selectedComponent?.id);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput("");
  };

  return (
    <div className="absolute right-4 top-20 bottom-20 w-80 z-30 flex flex-col bg-black/70 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
      {/* Avatar header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <div
          className={`w-10 h-10 rounded-full bg-[#2563EB]/20 border-2 border-[#2563EB] flex items-center justify-center ${
            isSpeaking ? "animate-pulse" : ""
          }`}
        >
          <span className="text-lg">🎓</span>
        </div>
        <div>
          <div className="text-white font-medium text-sm">
            {invention.avatarPersona}
          </div>
          <div className="text-white/40 text-xs">
            {isSpeaking ? "Speaking..." : "Listening"}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`text-sm ${
              msg.role === "user"
                ? "text-white/80 text-right"
                : "text-white/90"
            }`}
          >
            <div
              className={`inline-block rounded-lg px-3 py-2 max-w-[90%] ${
                msg.role === "user"
                  ? "bg-[#2563EB]/30"
                  : "bg-white/5"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="text-white/40 text-sm animate-pulse">
            {invention.avatarPersona} is thinking...
          </div>
        )}
      </div>

      {/* Suggested questions */}
      {messages.length === 0 && (
        <div className="px-4 py-2 space-y-1">
          {suggestedQuestions.slice(0, 3).map((q, i) => (
            <button
              key={i}
              onClick={() => sendMessage(q)}
              className="w-full text-left text-xs text-[#2563EB] hover:text-white bg-[#2563EB]/10 hover:bg-[#2563EB]/20 rounded-lg px-3 py-2 transition"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-white/10">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={`Ask ${invention.avatarPersona}...`}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#2563EB]"
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="bg-[#2563EB] hover:bg-[#2563EB]/80 text-white rounded-lg px-3 py-2 text-sm disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire AvatarPanel into HolographicViewerClient**

Add `AvatarPanel` to the viewer layout, passing invention and selectedComponent.

- [ ] **Step 5: Add auto-announcement on component select**

Per PRD: When a component is selected via gesture, avatar automatically says "You've selected the [component name]. [one-line description]."

Wire this in HolographicViewerClient — when `onComponentSelect` fires, auto-send that message through useExpert.

- [ ] **Step 6: Add pre-recorded avatar introduction audio**

Per PRD Section 10.5: On entering the holographic viewer, the avatar auto-plays a 30-45 second intro. These are pre-generated ElevenLabs audio files served as static assets (no live API call on entry).

Create directory `public/audio/intros/` with placeholder files:
```bash
mkdir -p public/audio/intros
```

Expected files (generated pre-hackathon via ElevenLabs):
- `telephone-intro.mp3`
- `iphone-intro.mp3`
- `steam-engine-intro.mp3`
- `telescope-intro.mp3`

Add auto-play logic to HolographicViewerClient:
```typescript
// On mount, play intro audio if available
useEffect(() => {
  const introPath = `/audio/intros/${invention.id}-intro.mp3`;
  const audio = new Audio(introPath);
  audio.play().catch(() => {
    console.warn("Intro audio not available or autoplay blocked");
  });
  return () => { audio.pause(); audio.src = ""; };
}, [invention.id]);
```

- [ ] **Step 6: Commit**

```bash
git add src/components/viewer/AvatarPanel.tsx src/hooks/useExpert.ts src/lib/invention-context.ts src/components/viewer/HolographicViewerClient.tsx
git commit -m "feat: add AI avatar panel with ElevenLabs TTS, 3-layer prompt, and auto-announcements"
```

---

### Task 12: Globe ↔ Viewer Navigation & Transitions

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/transitions/ViewTransition.tsx`

- [ ] **Step 1: Create cinematic fade transition component**

Create `src/components/transitions/ViewTransition.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

interface ViewTransitionProps {
  isTransitioning: boolean;
  onTransitionEnd: () => void;
}

export default function ViewTransition({
  isTransitioning,
  onTransitionEnd,
}: ViewTransitionProps) {
  const [phase, setPhase] = useState<"idle" | "fade-out" | "black" | "fade-in">(
    "idle"
  );

  useEffect(() => {
    if (!isTransitioning) {
      setPhase("idle");
      return;
    }

    setPhase("fade-out");
    const t1 = setTimeout(() => setPhase("black"), 500);
    const t2 = setTimeout(() => {
      setPhase("fade-in");
      onTransitionEnd();
    }, 800);
    const t3 = setTimeout(() => setPhase("idle"), 1300);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isTransitioning, onTransitionEnd]);

  if (phase === "idle") return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black pointer-events-none transition-opacity duration-500"
      style={{
        opacity: phase === "fade-out" ? 1 : phase === "black" ? 1 : 0,
      }}
    />
  );
}
```

- [ ] **Step 2: Wire transitions into main page**

Update `src/app/page.tsx`:
- Add `viewMode` state: `"globe" | "viewer"`
- Add `selectedInventionForViewer` state
- When "Enter Holographic Viewer" is clicked in side panel:
  - Trigger ViewTransition fade-to-black
  - On transition end, switch to HolographicViewer
- When back button is clicked in viewer:
  - Trigger reverse transition back to globe

- [ ] **Step 3: Update SidePanel InventionDetail CTA button**

Change the "Explore in 3D" button text to "Enter Holographic Viewer" with the `#2563EB` accent.

- [ ] **Step 4: Test full flow: globe → click marker → side panel → holographic viewer → back**

Run: `npm run dev`, test the complete navigation loop.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/components/transitions/ViewTransition.tsx src/components/discovery/InventionDetail.tsx
git commit -m "feat: add cinematic globe↔viewer transition with fade-to-black effect"
```

---

### Task 13: Update Side Panel & Discovery Components

**⚠️ Execute this task immediately after Task 5 (Phase 1), not in Phase 3.** The discovery components will look broken with the new data shape until this task is completed. Move this into your execution order accordingly.

**Depends on:** Task 1 (new data types), Task 5 (CesiumJS globe wired in)

**Files:**
- Modify: `src/components/discovery/SidePanel.tsx`
- Modify: `src/components/discovery/CategoryFilter.tsx`
- Modify: `src/components/discovery/InventionCard.tsx`
- Modify: `src/components/discovery/InventionDetail.tsx`

- [ ] **Step 1: Update SidePanel for new categories and Exa search**

- Replace category filter options with new 4 categories
- Wire search input to `/api/exa-search` endpoint
- Show Exa search results with globe flyTo action
- Update invention count display

- [ ] **Step 2: Update CategoryFilter for 4 PRD categories**

Use the new category IDs and colors from `categories.ts`.

- [ ] **Step 3: Update InventionCard for new invention data shape**

Show `location.label` instead of just country. Display avatar persona name.

- [ ] **Step 4: Update InventionDetail with PRD side panel contents**

Per PRD: invention title, year, inventor name, origin location, category tag, brief description, primary patent number with source link, "Enter Holographic Viewer" CTA.

- [ ] **Step 5: Commit**

```bash
git add src/components/discovery/
git commit -m "feat: update discovery panel with PRD categories, Exa search, and holographic viewer CTA"
```

---

### Task 14: Agora Conversational AI Integration (Optional/Fallback)

**Files:**
- Create: `src/lib/agora.ts`
- Create: `src/components/viewer/AgoraAvatar.tsx`

- [ ] **Step 1: Create Agora client utility**

Create `src/lib/agora.ts`:

```typescript
import AgoraRTC, { IAgoraRTCClient } from "agora-rtc-sdk-ng";

let client: IAgoraRTCClient | null = null;

export async function initAgora(channelName: string): Promise<IAgoraRTCClient | null> {
  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
  if (!appId) {
    console.warn("Agora App ID not configured — using ElevenLabs-only fallback");
    return null;
  }

  client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
  await client.join(appId, channelName, null);
  return client;
}

export async function leaveAgora() {
  if (client) {
    await client.leave();
    client = null;
  }
}
```

- [ ] **Step 2: Create AgoraAvatar component (optional enhancement)**

Create `src/components/viewer/AgoraAvatar.tsx` — floating avatar video panel that shows alongside the 3D viewer when Agora is available. Falls back to static avatar icon when not.

- [ ] **Step 3: Commit**

```bash
git add src/lib/agora.ts src/components/viewer/AgoraAvatar.tsx
git commit -m "feat: add Agora streaming integration with ElevenLabs-only fallback"
```

---

## Phase 4: Polish & Integration

### Task 15: Global Styling Alignment with PRD

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Update accent color system to #2563EB**

Replace all cyan accent references (`#06b6d4`) with PRD's electric blue `#2563EB` across globals.css and components.

- [ ] **Step 2: Ensure dark mode throughout**

Verify all components use dark backgrounds, glass-morphism panels, and the consistent `#2563EB` accent.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx
git commit -m "style: align color system to PRD electric blue (#2563EB) accent throughout"
```

---

### Task 16: Remove Old Globe & Unused Components

**Files:**
- Remove: `src/components/globe/GlobeClient.tsx`
- Remove: `src/components/globe/Globe.tsx`
- Remove: `src/components/globe/GlobeMarkers.ts`
- Remove: `src/components/viewer/ModelViewer.tsx`
- Remove: `src/components/viewer/ModelViewerClient.tsx`
- Remove: `src/components/viewer/InventionModel.tsx`
- Remove: `src/components/viewer/ComponentMesh.tsx`
- Remove: `src/components/viewer/ExplodedView.tsx`
- Remove: `src/components/viewer/ViewerControls.tsx`
- Remove: `src/components/viewer/ComponentInfo.tsx`
- Modify: `package.json` (remove `react-globe.gl` and `react-spring` deps)

- [ ] **Step 1: Remove old globe components**

Delete the old react-globe.gl files and the old R3F-based viewer components.

- [ ] **Step 2: Remove unused dependencies**

Run: `npm uninstall react-globe.gl three-globe react-spring @react-spring/three @react-three/fiber @react-three/drei d3-scale d3-scale-chromatic`

Note: The new holographic viewer uses raw Three.js, so R3F and drei are no longer needed.

- [ ] **Step 3: Verify build succeeds with no orphan imports**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove old react-globe.gl and R3F viewer components, clean up unused dependencies"
```

---

### Task 17: Update Invention Detail Page Route

**Files:**
- Modify: `src/app/invention/[id]/page.tsx`

- [ ] **Step 1: Redirect invention detail route to holographic viewer**

Update the `/invention/[id]` page to use the new HolographicViewer instead of the old ModelViewerClient. Or redirect to the main page with the viewer open.

- [ ] **Step 2: Commit**

```bash
git add src/app/invention/
git commit -m "feat: update invention detail route to use holographic viewer"
```

---

### Task 18: End-to-End Testing & Verification

**Files:**
- Modify: `src/lib/__tests__/invention-context.test.ts`
- Create: `src/lib/__tests__/exa-search.test.ts`

- [ ] **Step 1: Update existing tests for new data shape**

Fix `invention-context.test.ts` to use the new 4-invention dataset and 3-layer prompt structure.

- [ ] **Step 2: Add basic test for Exa search fallback**

Create `src/lib/__tests__/exa-search.test.ts` testing the local fallback matching when no API key is present.

- [ ] **Step 3: Run full test suite**

Run: `npm run test`
Expected: All tests pass.

- [ ] **Step 4: Manual end-to-end verification**

Verify the full demo flow per PRD Section 14:
1. Globe loads with 4 markers
2. Type "voice transmission electricity 1870s" → globe flies to Boston
3. Scrub Temporos 1600→2007 → markers appear chronologically
4. Click telephone marker → side panel → "Enter Holographic Viewer"
5. Cinematic fade → webcam + 3D model overlay
6. Press E → explode | Press A → assemble
7. Hand gestures work (if webcam available)
8. Avatar panel shows, suggested questions work
9. ESC → back to globe

- [ ] **Step 5: Commit**

```bash
git add src/lib/__tests__/
git commit -m "test: update tests for PRD data model and add Exa search fallback test"
```

---

## Summary

| Phase | Tasks | What it Delivers |
|-------|-------|-----------------|
| 0 | 1, 2, 2.5 | New data layer (4 inventions), dependencies, env config, GLB directory structure |
| 1 | 3, 4, 5, 6, **13** | CesiumJS globe with ripple, Temporos slider, Exa search, discovery UI updates |
| 2 | 7, 8, 9 | Webcam holographic viewer with GLB loading, MediaPipe gestures, component labels |
| 3 | 10, 11, 12, 14 | ElevenLabs TTS with intro audio, avatar panel, transitions, Agora |
| 4 | 15, 16, 17, 18 | Styling polish, cleanup old code, tests, end-to-end verification |

**Total: 19 tasks (including 2.5), ~100 steps**

**Execution order note:** Task 13 must be executed in Phase 1 (after Task 5), not Phase 3, to avoid a broken UI during development.

Each phase produces a working, testable state. Phase 0–1 gives a working globe. Phase 2 adds the "wow" holographic viewer. Phase 3 brings the AI avatar to life. Phase 4 polishes and ships.
