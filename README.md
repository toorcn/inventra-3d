# InventorNet

InventorNet is a Next.js app for exploring breakthrough inventions around the world through an interactive 3D globe, rich invention briefs, an interactive 3D “exploded view” for select inventions, and an AI “expert” chat panel for contextual explanations.

## What you can do

- **Browse a 3D globe** and click countries to focus the dataset.
- **Filter by category** (energy, computing, biology, materials, etc.).
- **Search in plain language** (e.g. “renewable energy in Europe”, “after 1950 in the US”).
- **Open an invention detail page** with a story/brief.
- **Explore select inventions in 3D** with component picking and an exploded view.
- **Ask the AI Expert** questions about the invention or a selected component.
- **Enter a live voice room** where spoken turns are transcribed with Whisper, answered by the shared expert brain, and spoken back with ElevenLabs.

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

# Used for OpenRouter headers (optional).
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Agora RTC voice room transport.
# Copy these from the Agora RTC/App console.
AGORA_APP_ID=...
AGORA_APP_CERTIFICATE=...

# Whisper transcription for spoken turns.
OPENAI_API_KEY=...

# ElevenLabs TTS for assistant replies.
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=...

# Optional overrides for speech models.
OPENAI_WHISPER_MODEL=whisper-1
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
- **AI**: OpenRouter for typed chat, Whisper + ElevenLabs for voice

## Project structure

- `src/app/page.tsx`: globe + discovery side panel
- `src/app/invention/[id]/page.tsx`: invention detail + 3D viewer + AI chat
- `src/app/api/search/route.ts`: search endpoint (filters inventions)
- `src/app/api/chat/route.ts`: AI chat endpoint (returns plain text)
- `src/app/api/voice/*`: speech transcription and assistant audio endpoints
- `src/data/*`: invention dataset, categories, 3D component definitions

## Notes

- The globe loads its country geojson and textures from public GitHub URLs at runtime (`src/components/globe/GlobeClient.tsx`).
- The “3D models” in this repo are procedural primitives (no `.glb` assets in `public/` by default).

## Deploy

This is a standard Next.js app—deploy to Vercel (or any Node-compatible platform) the same way you would deploy any Next.js project.
