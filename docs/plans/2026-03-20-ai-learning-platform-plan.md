# AI-Powered 3D Learning Platform — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished, pre-scripted 3D learning studio where an AI teacher explains complex concepts via synchronized voice + Three.js animations, with quizzes — all within 36 hours at LotusHacks 2026.

**Architecture:** Next.js frontend with React Three Fiber for 3D rendering. Pre-authored lesson JSON files drive the entire experience (explanation text, animation commands, quiz data, pre-generated TTS audio). A lightweight Node.js/Express backend serves lesson data and handles websocket coordination. Agora voice integration as a stretch goal.

**Tech Stack:** Next.js 14 (App Router), React Three Fiber + drei, TailwindCSS, Node.js/Express, ElevenLabs TTS (pre-generated), Agora SDK (stretch), OpenAI GPT-4 (stretch)

**Track:** EdTech (by Etest)

**Key Judges to Impress:**

- **Alex Nguyen** (Feynman AI, 360K users) — EdTech, consumer AI, user-centric design
- **Gabriel Chua** (OpenAI) — Elegant API usage, practical applications
- **Nghi Bui** (Google) — Technical depth, clean engineering
- **Daniel Nguyen** (BoltAI) — Working product, demo-able UX
- **Trung Huynh** (Blaze AI) — Speech/voice component

---

## File Structure

```
project-root/
├── package.json
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── .env.local                         # API keys (ElevenLabs, OpenAI, Agora)
│
├── public/
│   ├── models/                        # 3D model files (.glb)
│   │   ├── telescope.glb
│   │   └── transformer.glb            # Neural network / attention visualization
│   ├── audio/                         # Pre-generated ElevenLabs TTS
│   │   ├── telescope-lesson.mp3
│   │   └── transformer-lesson.mp3
│   └── images/                        # Landing page assets
│       └── hero-bg.jpg
│
├── data/
│   └── lessons/                       # Pre-authored lesson JSON
│       ├── index.ts                   # Exports lesson catalog
│       ├── telescope.json
│       └── transformer.json           # CS/AI research paper lesson
│
├── src/
│   └── app/
│       ├── layout.tsx                 # Root layout (fonts, metadata)
│       ├── page.tsx                   # Landing page (search + hero)
│       ├── globals.css                # Tailwind + custom styles
│       │
│       ├── studio/
│       │   └── [topic]/
│       │       └── page.tsx           # Learning Studio page (main experience)
│       │
│       ├── components/
│       │   ├── landing/
│       │   │   ├── SearchBar.tsx      # Animated search with suggestions
│       │   │   ├── HeroSection.tsx    # Hero with mock 3D Earth / visual
│       │   │   └── TopicGrid.tsx      # Trending topics below search
│       │   │
│       │   ├── studio/
│       │   │   ├── Canvas3D.tsx       # Three.js canvas (React Three Fiber)
│       │   │   ├── ModelViewer.tsx     # Loads .glb model, handles interactions
│       │   │   ├── AnimationController.tsx  # Executes timed animation commands
│       │   │   ├── ChatPanel.tsx       # Right-side chat/transcript panel
│       │   │   ├── AudioPlayer.tsx     # Plays TTS audio, emits time events
│       │   │   ├── QuizPanel.tsx       # Multiple choice quiz overlay
│       │   │   ├── LessonControls.tsx  # Play/pause/restart buttons
│       │   │   └── StudioLayout.tsx    # Split layout: canvas | chat
│       │   │
│       │   └── ui/
│       │       ├── Button.tsx
│       │       ├── Card.tsx
│       │       └── ProgressBar.tsx
│       │
│       ├── hooks/
│       │   ├── useLesson.ts           # Fetches + manages lesson state
│       │   ├── useAnimationQueue.ts   # Processes timed animation commands
│       │   ├── useAudioSync.ts        # Syncs audio playback with animation
│       │   └── useQuiz.ts             # Quiz state management
│       │
│       ├── lib/
│       │   ├── lessonLoader.ts        # Loads lesson JSON from /data
│       │   ├── animationCommands.ts   # Command type definitions + executor
│       │   └── constants.ts           # App-wide constants
│       │
│       └── types/
│           ├── lesson.ts              # Lesson, Command, Quiz types
│           └── animation.ts           # Animation command types
│
├── scripts/
│   └── generate-tts.ts               # Script to pre-generate TTS via ElevenLabs
│
└── stretch/                           # Stretch goal code (only if time permits)
    ├── agora/
    │   └── voiceClient.ts             # Agora real-time voice integration
    └── ai-lessons/
        └── generateLesson.ts          # GPT-4 dynamic lesson generation
```

---

## 36-Hour Timeline Overview

```
PHASE 1: Foundation (Hours 0–8)        → Scaffold, 3D viewer, lesson data
PHASE 2: Core Experience (Hours 8–20)  → Audio sync, animations, chat panel
PHASE 3: Polish (Hours 20–28)          → Landing page, quiz, transitions, UI polish
PHASE 4: Demo Prep (Hours 28–33)       → End-to-end testing, bug fixes, demo script
PHASE 5: Stretch (Hours 33–36)         → Agora voice / AI generation (only if stable)
```

---

## Pre-Hackathon Preparation (Do BEFORE the clock starts)

### Task 0: Asset & Content Preparation

> Complete these BEFORE arriving at VNG Campus. These are not code tasks — they're content creation.

- **Step 0.1: Source 3D models**
  Download free .glb models from Sketchfab (CC license) or similar:
  - Telescope: search "telescope" on sketchfab.com, filter by "Downloadable", download .glb
  - Transformer/neural network: search "neural network" or "brain network" — or create a programmatic 3D visualization of attention layers using Three.js geometry (cubes for encoder/decoder blocks, lines for attention connections). Alternatively, use a "brain" or "circuit" model as a visual metaphor.
  Save to `public/models/telescope.glb`, `public/models/transformer.glb`
  **Important:** Open each model in [https://gltf-viewer.donmccurdy.com/](https://gltf-viewer.donmccurdy.com/) to verify:
  - Model loads correctly
  - Note the names of sub-meshes/parts (you'll reference these in animation commands)
  - Note the scale (some models are huge/tiny, you'll need to adjust)
  **Alternative for Transformer lesson:** If no suitable .glb model exists, consider building the 3D visualization entirely in code using React Three Fiber primitives (boxes, spheres, lines) to represent encoder blocks, attention heads, and data flow. This could be even more impressive to judges as it shows technical depth.
- **Step 0.2: Write lesson content for 2 topics**
  For each topic, write:
  - 60-90 second explanation script (natural, conversational tone)
  - List the 3D parts to highlight and when
  - 3-5 multiple choice quiz questions
  Topics:
  1. **Telescope** — physical optics, visual and intuitive
  2. **Transformer (Attention Is All You Need)** — CS/AI research paper; explain self-attention, encoder-decoder architecture, and why it revolutionized NLP. Great for impressing the OpenAI and AI-focused judges.
  Save as JSON files (see Task 3 for exact format).
- **Step 0.3: Generate TTS audio via ElevenLabs**
  Run `scripts/generate-tts.ts` (see Task 2) or use ElevenLabs web UI:
  - Select a warm, teacher-like voice (e.g., "Rachel" or "Adam")
  - Generate MP3 for each lesson explanation (2 total)
  - Note exact audio duration in seconds
  - Save to `public/audio/telescope-lesson.mp3`, `public/audio/transformer-lesson.mp3`
- **Step 0.4: Claim hackathon credits**
  Ensure team has claimed:
  - ElevenLabs credits (CRITICAL)
  - OpenAI credits (for stretch goals)
  - Agora credits (for stretch goals)
  - Exa.ai credits (for stretch goals)
- **Step 0.5: Pick a name**
  Spend 30 minutes brainstorming. Judges remember good names (ref: past-hack-analysis.md).  
  Ideas: "Illuminate", "MindForge", "Eureka", "NeuroVerse", "Prism", "LumenAI"

---

## PHASE 1: Foundation (Hours 0–8)

### Task 1: Project Scaffold

**Files:**

- Create: `package.json`, `next.config.js`, `tailwind.config.ts`, `tsconfig.json`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`
- **Step 1.1: Initialize Next.js project**

```bash
npx create-next-app@latest learn-studio --typescript --tailwind --eslint --app --src-dir
cd learn-studio
```

- **Step 1.2: Install 3D dependencies**

```bash
npm install three @react-three/fiber @react-three/drei
npm install -D @types/three
```

- **Step 1.3: Install UI & utility dependencies**

```bash
npm install framer-motion lucide-react gsap
npm install -D @tailwindcss/typography
```

- **Step 1.4: Create root layout with fonts**

File: `src/app/layout.tsx`

```tsx
import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
});

export const metadata: Metadata = {
  title: "Prism — Learn Anything in 3D",
  description: "AI-powered 3D learning studio",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} font-sans bg-zinc-950 text-white antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
```

- **Step 1.5: Set up globals.css**

File: `src/app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --accent: #6366f1;
  --accent-light: #818cf8;
}

body {
  overflow-x: hidden;
}

.studio-grid {
  display: grid;
  grid-template-columns: 1fr 380px;
  height: 100vh;
}
```

- **Step 1.6: Create placeholder landing page**

File: `src/app/page.tsx`

```tsx
export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <h1 className="text-4xl font-bold font-[family-name:var(--font-space)]">
        Prism
      </h1>
    </main>
  );
}
```

- **Step 1.7: Verify dev server runs**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — should see "Prism" centered on dark background.

- **Step 1.8: Git init and first commit**

```bash
git init
git add .
git commit -m "feat: scaffold Next.js project with Three.js and Tailwind"
```

---

### Task 2: TTS Generation Script

**Files:**

- Create: `scripts/generate-tts.ts`, `.env.local`
- **Step 2.1: Create .env.local**

File: `.env.local`

```
ELEVENLABS_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
```

- **Step 2.2: Write TTS generation script**

File: `scripts/generate-tts.ts`

```typescript
import fs from "fs";
import path from "path";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // "Rachel" — swap for preferred voice

interface LessonData {
  topic: string;
  explanation: string;
}

async function generateTTS(lesson: LessonData): Promise<void> {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: lesson.explanation,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.6,
          similarity_boost: 0.75,
          style: 0.3,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`ElevenLabs API error: ${response.status}`);
  }

  const audioBuffer = await response.arrayBuffer();
  const outputPath = path.join(
    process.cwd(),
    "public",
    "audio",
    `${lesson.topic}-lesson.mp3`
  );

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, Buffer.from(audioBuffer));
  console.log(`Generated: ${outputPath}`);
}

async function main() {
  const lessonsDir = path.join(process.cwd(), "data", "lessons");
  const files = fs
    .readdirSync(lessonsDir)
    .filter((f) => f.endsWith(".json"));

  for (const file of files) {
    const lesson = JSON.parse(
      fs.readFileSync(path.join(lessonsDir, file), "utf-8")
    );
    console.log(`Generating TTS for: ${lesson.topic}`);
    await generateTTS(lesson);
  }
}

main().catch(console.error);
```

- **Step 2.3: Run script after lesson JSONs exist (Task 3)**

```bash
npx tsx scripts/generate-tts.ts
```

- **Step 2.4: Commit**

```bash
git add scripts/ .env.local
git commit -m "feat: add ElevenLabs TTS generation script"
```

---

### Task 3: Lesson Data Schema & Content

**Files:**

- Create: `src/types/lesson.ts`, `src/types/animation.ts`, `data/lessons/telescope.json`, `data/lessons/transformer.json`, `data/lessons/index.ts`
- **Step 3.1: Define TypeScript types**

File: `src/types/lesson.ts`

```typescript
export interface Lesson {
  topic: string;
  title: string;
  description: string;
  explanation: string;
  audioUrl: string;
  audioDuration: number;
  modelUrl: string;
  modelScale: number;
  modelPosition: [number, number, number];
  commands: AnimationCommand[];
  quiz: QuizQuestion[];
}

export interface AnimationCommand {
  timestamp: number;
  action:
    | "highlight"
    | "unhighlight"
    | "rotate"
    | "zoom_to"
    | "reset_camera"
    | "label"
    | "hide_label"
    | "opacity"
    | "explode"
    | "reset";
  params: Record<string, unknown>;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}
```

File: `src/types/animation.ts`

```typescript
export interface HighlightParams {
  part: string;
  color: string;
  intensity?: number;
}

export interface RotateParams {
  axis: "x" | "y" | "z";
  degrees: number;
  duration: number;
  part?: string;
}

export interface ZoomParams {
  part: string;
  distance: number;
  duration: number;
}

export interface LabelParams {
  part: string;
  text: string;
  position?: [number, number, number];
}

export interface OpacityParams {
  part: string;
  opacity: number;
  duration: number;
}
```

- **Step 3.2: Create telescope lesson JSON**

File: `data/lessons/telescope.json`

> **Note:** The `params.part` values MUST match the mesh names in your .glb model. Open the model in the glTF viewer and note the node/mesh names. Adjust accordingly.

```json
{
  "topic": "telescope",
  "title": "How a Telescope Works",
  "description": "Discover how telescopes bend light to reveal the cosmos",
  "explanation": "A telescope is a remarkable instrument that lets us see objects far beyond the reach of our eyes. At its core, it works by collecting and focusing light. Let me walk you through the key components. First, the objective lens — this large lens at the front is the light gatherer. The bigger it is, the more light it captures, letting you see fainter and more distant objects. Light enters through the objective and begins its journey down the tube. The tube itself isn't just structural — it keeps out stray light and maintains the alignment between the lenses. Now, look at the eyepiece at the other end. This smaller lens magnifies the focused image so your eye can see it clearly. The real magic is in how these two lenses work together — the objective creates a small, focused image, and the eyepiece blows it up for you to observe. That's the fundamental principle: gather light, focus it, magnify it.",
  "audioUrl": "/audio/telescope-lesson.mp3",
  "audioDuration": 52,
  "modelUrl": "/models/telescope.glb",
  "modelScale": 1.5,
  "modelPosition": [0, -0.5, 0],
  "commands": [
    { "timestamp": 0, "action": "reset", "params": {} },
    { "timestamp": 4, "action": "rotate", "params": { "axis": "y", "degrees": 360, "duration": 6 } },
    { "timestamp": 11, "action": "highlight", "params": { "part": "objective_lens", "color": "#4ade80", "intensity": 2 } },
    { "timestamp": 11, "action": "label", "params": { "part": "objective_lens", "text": "Objective Lens" } },
    { "timestamp": 14, "action": "zoom_to", "params": { "part": "objective_lens", "distance": 2.5, "duration": 1.5 } },
    { "timestamp": 22, "action": "unhighlight", "params": { "part": "objective_lens" } },
    { "timestamp": 22, "action": "hide_label", "params": { "part": "objective_lens" } },
    { "timestamp": 23, "action": "highlight", "params": { "part": "tube", "color": "#60a5fa", "intensity": 1.5 } },
    { "timestamp": 23, "action": "label", "params": { "part": "tube", "text": "Tube Body" } },
    { "timestamp": 23, "action": "reset_camera", "params": { "duration": 1.5 } },
    { "timestamp": 30, "action": "unhighlight", "params": { "part": "tube" } },
    { "timestamp": 30, "action": "hide_label", "params": { "part": "tube" } },
    { "timestamp": 31, "action": "highlight", "params": { "part": "eyepiece", "color": "#f472b6", "intensity": 2 } },
    { "timestamp": 31, "action": "label", "params": { "part": "eyepiece", "text": "Eyepiece" } },
    { "timestamp": 31, "action": "zoom_to", "params": { "part": "eyepiece", "distance": 2, "duration": 1.5 } },
    { "timestamp": 40, "action": "unhighlight", "params": { "part": "eyepiece" } },
    { "timestamp": 40, "action": "hide_label", "params": { "part": "eyepiece" } },
    { "timestamp": 41, "action": "reset_camera", "params": { "duration": 1 } },
    { "timestamp": 42, "action": "opacity", "params": { "part": "tube", "opacity": 0.3, "duration": 1 } },
    { "timestamp": 42, "action": "highlight", "params": { "part": "objective_lens", "color": "#4ade80", "intensity": 1.5 } },
    { "timestamp": 42, "action": "highlight", "params": { "part": "eyepiece", "color": "#f472b6", "intensity": 1.5 } },
    { "timestamp": 49, "action": "rotate", "params": { "axis": "y", "degrees": 360, "duration": 4 } }
  ],
  "quiz": [
    {
      "question": "What is the primary function of the objective lens?",
      "options": ["To magnify the final image", "To gather and focus light", "To filter out UV radiation", "To reduce glare"],
      "correct": 1,
      "explanation": "The objective lens is the main light-gathering component. Its large surface area collects light from distant objects."
    },
    {
      "question": "Why does a larger objective lens let you see fainter objects?",
      "options": ["It magnifies more", "It collects more light", "It filters better", "It reduces distortion"],
      "correct": 1,
      "explanation": "A larger objective captures more photons from dim sources, making faint objects visible."
    },
    {
      "question": "What role does the tube play in a telescope?",
      "options": ["It magnifies the image", "It blocks stray light and maintains lens alignment", "It generates light", "It powers the eyepiece"],
      "correct": 1,
      "explanation": "The tube keeps external light from interfering and ensures the optical path between lenses stays aligned."
    },
    {
      "question": "Which lens do you look through to see the magnified image?",
      "options": ["The objective lens", "The eyepiece", "The focusing lens", "The mirror"],
      "correct": 1,
      "explanation": "The eyepiece is the small lens closest to your eye. It magnifies the focused image created by the objective."
    }
  ]
}
```

- **Step 3.3: Create Transformer / AI research paper lesson JSON**

File: `data/lessons/transformer.json`

> **Note:** This lesson teaches the core ideas from the "Attention Is All You Need" paper (Vaswani et al., 2017). The 3D model should visualize encoder/decoder blocks and attention heads. If using a programmatic model, `params.part` values map to your custom mesh names. If using a downloaded .glb, inspect mesh names in the glTF viewer.

```json
{
  "topic": "transformer",
  "title": "The Transformer — Attention Is All You Need",
  "description": "Explore the architecture that powers ChatGPT, BERT, and modern AI",
  "explanation": "The Transformer is the architecture behind almost every modern AI system — from ChatGPT to Google Translate. Published in 2017 by a team at Google, the paper 'Attention Is All You Need' introduced a revolutionary idea. Before Transformers, language models processed words one at a time, like reading a sentence left to right. This was slow and made it hard to understand long-range connections. The Transformer's key innovation is self-attention. Imagine you're reading the sentence 'The cat sat on the mat because it was tired.' Self-attention lets the model look at every word simultaneously and figure out that 'it' refers to 'the cat', not 'the mat'. Let me show you how this works inside the architecture. The input first passes through an encoder stack — these layers transform your input into a rich representation. Each encoder layer has two parts: a multi-head attention mechanism that lets the model focus on different parts of the input, and a feed-forward network that processes the results. The decoder stack works similarly but also attends to the encoder's output, which is how translation models know what to generate next. The real power comes from multi-head attention — instead of computing attention once, the model does it multiple times in parallel, each head learning to focus on different types of relationships. That's what makes Transformers so powerful at understanding language.",
  "audioUrl": "/audio/transformer-lesson.mp3",
  "audioDuration": 75,
  "modelUrl": "/models/transformer.glb",
  "modelScale": 1.2,
  "modelPosition": [0, -0.5, 0],
  "commands": [
    { "timestamp": 0, "action": "reset", "params": {} },
    { "timestamp": 3, "action": "rotate", "params": { "axis": "y", "degrees": 360, "duration": 8 } },
    { "timestamp": 18, "action": "highlight", "params": { "part": "encoder_stack", "color": "#4ade80", "intensity": 1.5 } },
    { "timestamp": 18, "action": "label", "params": { "part": "encoder_stack", "text": "Self-Attention" } },
    { "timestamp": 28, "action": "unhighlight", "params": { "part": "encoder_stack" } },
    { "timestamp": 28, "action": "hide_label", "params": { "part": "encoder_stack" } },
    { "timestamp": 35, "action": "highlight", "params": { "part": "encoder_block", "color": "#60a5fa", "intensity": 2 } },
    { "timestamp": 35, "action": "label", "params": { "part": "encoder_block", "text": "Encoder Stack" } },
    { "timestamp": 35, "action": "zoom_to", "params": { "part": "encoder_block", "distance": 2.5, "duration": 1.5 } },
    { "timestamp": 45, "action": "highlight", "params": { "part": "attention_heads", "color": "#facc15", "intensity": 2 } },
    { "timestamp": 45, "action": "label", "params": { "part": "attention_heads", "text": "Multi-Head Attention" } },
    { "timestamp": 48, "action": "highlight", "params": { "part": "feed_forward", "color": "#f472b6", "intensity": 1.5 } },
    { "timestamp": 48, "action": "label", "params": { "part": "feed_forward", "text": "Feed-Forward Network" } },
    { "timestamp": 52, "action": "unhighlight", "params": { "part": "encoder_block" } },
    { "timestamp": 52, "action": "hide_label", "params": { "part": "encoder_block" } },
    { "timestamp": 52, "action": "reset_camera", "params": { "duration": 1 } },
    { "timestamp": 53, "action": "highlight", "params": { "part": "decoder_stack", "color": "#a78bfa", "intensity": 2 } },
    { "timestamp": 53, "action": "label", "params": { "part": "decoder_stack", "text": "Decoder Stack" } },
    { "timestamp": 53, "action": "zoom_to", "params": { "part": "decoder_stack", "distance": 2.5, "duration": 1.5 } },
    { "timestamp": 60, "action": "unhighlight", "params": { "part": "decoder_stack" } },
    { "timestamp": 60, "action": "hide_label", "params": { "part": "decoder_stack" } },
    { "timestamp": 61, "action": "reset_camera", "params": { "duration": 1 } },
    { "timestamp": 62, "action": "highlight", "params": { "part": "attention_heads", "color": "#facc15", "intensity": 2.5 } },
    { "timestamp": 62, "action": "label", "params": { "part": "attention_heads", "text": "Multi-Head Attention" } },
    { "timestamp": 62, "action": "zoom_to", "params": { "part": "attention_heads", "distance": 2, "duration": 1.5 } },
    { "timestamp": 72, "action": "reset_camera", "params": { "duration": 1 } },
    { "timestamp": 73, "action": "rotate", "params": { "axis": "y", "degrees": 360, "duration": 4 } }
  ],
  "quiz": [
    {
      "question": "What problem did the Transformer solve compared to previous models?",
      "options": ["It used less memory", "It processed words simultaneously instead of sequentially", "It required less training data", "It eliminated the need for GPUs"],
      "correct": 1,
      "explanation": "Previous models like RNNs processed words one at a time. The Transformer's self-attention mechanism processes all words in parallel, enabling much faster training and better long-range understanding."
    },
    {
      "question": "What does self-attention allow the model to do?",
      "options": ["Generate random text", "Look at all words simultaneously to understand relationships", "Translate between any two languages", "Compress data more efficiently"],
      "correct": 1,
      "explanation": "Self-attention lets each word 'attend to' every other word in the sequence, computing relevance scores to understand contextual relationships like pronoun references."
    },
    {
      "question": "What is 'multi-head' attention?",
      "options": ["Attention computed once with a large matrix", "Attention computed in parallel multiple times, each focusing on different patterns", "A type of attention only used in decoders", "An attention mechanism for images only"],
      "correct": 1,
      "explanation": "Multi-head attention runs the attention mechanism in parallel multiple times (heads), each learning to focus on different types of relationships — syntax, semantics, position, etc."
    },
    {
      "question": "Which of these AI systems is built on the Transformer architecture?",
      "options": ["AlphaGo", "ChatGPT", "Deep Blue", "DALL-E 1"],
      "correct": 1,
      "explanation": "ChatGPT is built on GPT (Generative Pre-trained Transformer), which is directly based on the Transformer decoder architecture from this paper."
    }
  ]
}
```

- **Step 3.4: Create lesson index**

File: `data/lessons/index.ts`

```typescript
import telescopeLesson from "./telescope.json";
import transformerLesson from "./transformer.json";
import type { Lesson } from "@/types/lesson";

export const lessons: Record<string, Lesson> = {
  telescope: telescopeLesson as Lesson,
  transformer: transformerLesson as Lesson,
};

export const lessonCatalog = Object.values(lessons).map((l) => ({
  topic: l.topic,
  title: l.title,
  description: l.description,
}));
```

- **Step 3.5: Commit**

```bash
git add src/types/ data/
git commit -m "feat: add lesson data schema, types, and 2 pre-scripted lessons"
```

---

### Task 4: 3D Model Viewer (Core Component)

**Files:**

- Create: `src/app/components/studio/Canvas3D.tsx`, `src/app/components/studio/ModelViewer.tsx`
- **Step 4.1: Create Canvas3D wrapper**

File: `src/app/components/studio/Canvas3D.tsx`

```tsx
"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import { Suspense } from "react";

interface Canvas3DProps {
  children: React.ReactNode;
}

export default function Canvas3D({ children }: Canvas3DProps) {
  return (
    <div className="w-full h-full bg-zinc-900 rounded-xl overflow-hidden">
      <Canvas
        camera={{ position: [0, 1, 5], fov: 50 }}
        shadows
        gl={{ antialias: true }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
        <Environment preset="studio" />
        <ContactShadows
          position={[0, -1.5, 0]}
          opacity={0.4}
          blur={2}
          far={4}
        />
        <Suspense fallback={null}>
          {children}
        </Suspense>
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={1}
          maxDistance={15}
        />
      </Canvas>
    </div>
  );
}
```

- **Step 4.2: Create ModelViewer component**

File: `src/app/components/studio/ModelViewer.tsx`

```tsx
"use client";

import { useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";

interface ModelViewerProps {
  modelUrl: string;
  scale?: number;
  position?: [number, number, number];
}

export interface ModelViewerHandle {
  highlightPart: (partName: string, color: string, intensity?: number) => void;
  unhighlightPart: (partName: string) => void;
  setPartOpacity: (partName: string, opacity: number, duration?: number) => void;
  getPartPosition: (partName: string) => THREE.Vector3 | null;
  resetAll: () => void;
}

const ModelViewer = forwardRef<ModelViewerHandle, ModelViewerProps>(
  function ModelViewer({ modelUrl, scale = 1, position = [0, 0, 0] }, ref) {
    const { scene } = useGLTF(modelUrl);
    const groupRef = useRef<THREE.Group>(null);
    const originalMaterials = useRef<Map<string, THREE.Material>>(new Map());

    useEffect(() => {
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const mat = child.material as THREE.MeshStandardMaterial;
          originalMaterials.current.set(child.name, mat.clone());
        }
      });
    }, [scene]);

    useImperativeHandle(ref, () => ({
      highlightPart(partName: string, color: string, intensity = 1.5) {
        scene.traverse((child) => {
          if (child instanceof THREE.Mesh && child.name === partName) {
            const mat = child.material as THREE.MeshStandardMaterial;
            gsap.to(mat, {
              emissiveIntensity: intensity,
              duration: 0.5,
            });
            mat.emissive = new THREE.Color(color);
          }
        });
      },

      unhighlightPart(partName: string) {
        scene.traverse((child) => {
          if (child instanceof THREE.Mesh && child.name === partName) {
            const mat = child.material as THREE.MeshStandardMaterial;
            gsap.to(mat, { emissiveIntensity: 0, duration: 0.5 });
          }
        });
      },

      setPartOpacity(partName: string, opacity: number, duration = 0.5) {
        scene.traverse((child) => {
          if (child instanceof THREE.Mesh && child.name === partName) {
            const mat = child.material as THREE.MeshStandardMaterial;
            mat.transparent = true;
            gsap.to(mat, { opacity, duration });
          }
        });
      },

      getPartPosition(partName: string): THREE.Vector3 | null {
        let pos: THREE.Vector3 | null = null;
        scene.traverse((child) => {
          if (child.name === partName) {
            pos = new THREE.Vector3();
            child.getWorldPosition(pos);
          }
        });
        return pos;
      },

      resetAll() {
        scene.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            const mat = child.material as THREE.MeshStandardMaterial;
            mat.emissiveIntensity = 0;
            mat.opacity = 1;
            mat.transparent = false;
          }
        });
      },
    }));

    return (
      <group ref={groupRef} position={position} scale={scale}>
        <primitive object={scene} />
      </group>
    );
  }
);

export default ModelViewer;
```

- **Step 4.3: Test with a simple studio page**

File: `src/app/studio/[topic]/page.tsx` (temporary test version)

```tsx
"use client";

import Canvas3D from "@/app/components/studio/Canvas3D";
import ModelViewer from "@/app/components/studio/ModelViewer";

export default function StudioPage() {
  return (
    <div className="h-screen w-screen">
      <Canvas3D>
        <ModelViewer modelUrl="/models/telescope.glb" scale={1.5} />
      </Canvas3D>
    </div>
  );
}
```

- **Step 4.4: Verify 3D model loads**

```bash
npm run dev
```

Open [http://localhost:3000/studio/telescope](http://localhost:3000/studio/telescope) — 3D model should render and be rotatable/zoomable.

- **Step 4.5: Commit**

```bash
git add src/app/components/studio/ src/app/studio/
git commit -m "feat: add 3D canvas and model viewer with highlight/opacity controls"
```

---

## PHASE 2: Core Experience (Hours 8–20)

### Task 5: Audio Player with Time Events

**Files:**

- Create: `src/app/components/studio/AudioPlayer.tsx`, `src/hooks/useAudioSync.ts`
- **Step 5.1: Create useAudioSync hook**

File: `src/hooks/useAudioSync.ts`

```typescript
"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface UseAudioSyncReturn {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  play: () => void;
  pause: () => void;
  restart: () => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  progress: number;
  isFinished: boolean;
}

export function useAudioSync(audioUrl: string): UseAudioSyncReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.addEventListener("loadedmetadata", () => {
      setDuration(audio.duration);
    });

    audio.addEventListener("ended", () => {
      setIsPlaying(false);
      setIsFinished(true);
      cancelAnimationFrame(rafRef.current);
    });

    return () => {
      audio.pause();
      audio.src = "";
      cancelAnimationFrame(rafRef.current);
    };
  }, [audioUrl]);

  const tick = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const play = useCallback(() => {
    audioRef.current?.play();
    setIsPlaying(true);
    setIsFinished(false);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
    cancelAnimationFrame(rafRef.current);
  }, []);

  const restart = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      setIsFinished(false);
      play();
    }
  }, [play]);

  const progress = duration > 0 ? currentTime / duration : 0;

  return {
    currentTime,
    duration,
    isPlaying,
    play,
    pause,
    restart,
    audioRef,
    progress,
    isFinished,
  };
}
```

- **Step 5.2: Create AudioPlayer component**

File: `src/app/components/studio/AudioPlayer.tsx`

```tsx
"use client";

import { Play, Pause, RotateCcw } from "lucide-react";

interface AudioPlayerProps {
  isPlaying: boolean;
  progress: number;
  currentTime: number;
  duration: number;
  onPlay: () => void;
  onPause: () => void;
  onRestart: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function AudioPlayer({
  isPlaying,
  progress,
  currentTime,
  duration,
  onPlay,
  onPause,
  onRestart,
}: AudioPlayerProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-zinc-800/50 rounded-lg backdrop-blur">
      <button
        onClick={isPlaying ? onPause : onPlay}
        className="w-10 h-10 flex items-center justify-center rounded-full bg-indigo-500 hover:bg-indigo-400 transition"
      >
        {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
      </button>

      <div className="flex-1">
        <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-100"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      <span className="text-xs text-zinc-400 font-mono w-20 text-right">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>

      <button
        onClick={onRestart}
        className="p-2 text-zinc-400 hover:text-white transition"
      >
        <RotateCcw size={16} />
      </button>
    </div>
  );
}
```

- **Step 5.3: Commit**

```bash
git add src/hooks/useAudioSync.ts src/app/components/studio/AudioPlayer.tsx
git commit -m "feat: add audio player with real-time time sync"
```

---

### Task 6: Animation Command Executor

**Files:**

- Create: `src/hooks/useAnimationQueue.ts`, `src/lib/animationCommands.ts`
- **Step 6.1: Create animation command executor**

File: `src/lib/animationCommands.ts`

```typescript
import type { AnimationCommand } from "@/types/lesson";
import type { ModelViewerHandle } from "@/app/components/studio/ModelViewer";

export function executeCommand(
  command: AnimationCommand,
  modelRef: ModelViewerHandle | null,
  cameraControls?: {
    zoomTo: (part: string, distance: number, duration: number) => void;
    reset: (duration: number) => void;
  }
): void {
  if (!modelRef) return;

  const p = command.params as Record<string, unknown>;

  switch (command.action) {
    case "highlight":
      modelRef.highlightPart(
        p.part as string,
        p.color as string,
        (p.intensity as number) ?? 1.5
      );
      break;

    case "unhighlight":
      modelRef.unhighlightPart(p.part as string);
      break;

    case "opacity":
      modelRef.setPartOpacity(
        p.part as string,
        p.opacity as number,
        (p.duration as number) ?? 0.5
      );
      break;

    case "zoom_to":
      cameraControls?.zoomTo(
        p.part as string,
        (p.distance as number) ?? 2,
        (p.duration as number) ?? 1
      );
      break;

    case "reset_camera":
      cameraControls?.reset((p.duration as number) ?? 1);
      break;

    case "reset":
      modelRef.resetAll();
      break;

    case "label":
    case "hide_label":
    case "rotate":
      // These are handled by a dedicated label/rotation system — see Task 7
      break;
  }
}
```

- **Step 6.2: Create useAnimationQueue hook**

File: `src/hooks/useAnimationQueue.ts`

```typescript
"use client";

import { useRef, useCallback, useEffect } from "react";
import type { AnimationCommand } from "@/types/lesson";
import type { ModelViewerHandle } from "@/app/components/studio/ModelViewer";
import { executeCommand } from "@/lib/animationCommands";

interface UseAnimationQueueOptions {
  commands: AnimationCommand[];
  currentTime: number;
  isPlaying: boolean;
  modelRef: ModelViewerHandle | null;
}

export function useAnimationQueue({
  commands,
  currentTime,
  isPlaying,
  modelRef,
}: UseAnimationQueueOptions): { executedCount: number } {
  const executedSet = useRef<Set<number>>(new Set());
  const executedCount = useRef(0);

  useEffect(() => {
    if (!isPlaying || !modelRef) return;

    commands.forEach((cmd, index) => {
      if (
        currentTime >= cmd.timestamp &&
        !executedSet.current.has(index)
      ) {
        executedSet.current.add(index);
        executedCount.current++;
        executeCommand(cmd, modelRef);
      }
    });
  }, [currentTime, isPlaying, commands, modelRef]);

  const reset = useCallback(() => {
    executedSet.current.clear();
    executedCount.current = 0;
    modelRef?.resetAll();
  }, [modelRef]);

  useEffect(() => {
    if (currentTime === 0) {
      reset();
    }
  }, [currentTime, reset]);

  return { executedCount: executedCount.current };
}
```

- **Step 6.3: Commit**

```bash
git add src/lib/animationCommands.ts src/hooks/useAnimationQueue.ts
git commit -m "feat: add animation command queue synced to audio playback"
```

---

### Task 7: Chat Panel (Transcript Display)

**Files:**

- Create: `src/app/components/studio/ChatPanel.tsx`
- **Step 7.1: Create ChatPanel**

File: `src/app/components/studio/ChatPanel.tsx`

```tsx
"use client";

import { useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ChatMessage {
  role: "teacher" | "user" | "system";
  content: string;
  timestamp?: number;
}

interface ChatPanelProps {
  explanation: string;
  currentTime: number;
  audioDuration: number;
  isPlaying: boolean;
}

function splitIntoSegments(text: string, totalDuration: number): ChatMessage[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const segmentDuration = totalDuration / sentences.length;

  return sentences.map((sentence, i) => ({
    role: "teacher" as const,
    content: sentence.trim(),
    timestamp: i * segmentDuration,
  }));
}

export default function ChatPanel({
  explanation,
  currentTime,
  audioDuration,
  isPlaying,
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const segments = useMemo(
    () => splitIntoSegments(explanation, audioDuration),
    [explanation, audioDuration]
  );

  const visibleSegments = segments.filter(
    (seg) => seg.timestamp !== undefined && currentTime >= seg.timestamp
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleSegments.length]);

  return (
    <div className="flex flex-col h-full bg-zinc-900/80 backdrop-blur">
      <div className="px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm font-medium text-zinc-300">
            AI Teacher
          </span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence>
          {visibleSegments.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex gap-3"
            >
              <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs">🎓</span>
              </div>
              <div className="bg-zinc-800 rounded-lg rounded-tl-none px-3 py-2 max-w-[90%]">
                <p className="text-sm text-zinc-200 leading-relaxed">
                  {msg.content}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isPlaying && visibleSegments.length < segments.length && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3 items-center"
          >
            <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs">🎓</span>
            </div>
            <div className="flex gap-1 px-3 py-2">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
```

- **Step 7.2: Commit**

```bash
git add src/app/components/studio/ChatPanel.tsx
git commit -m "feat: add chat panel with sentence-by-sentence transcript reveal"
```

---

### Task 8: Quiz Panel

**Files:**

- Create: `src/app/components/studio/QuizPanel.tsx`, `src/hooks/useQuiz.ts`
- **Step 8.1: Create useQuiz hook**

File: `src/hooks/useQuiz.ts`

```typescript
"use client";

import { useState, useCallback } from "react";
import type { QuizQuestion } from "@/types/lesson";

interface UseQuizReturn {
  currentQuestion: number;
  selectedAnswer: number | null;
  isCorrect: boolean | null;
  showExplanation: boolean;
  score: number;
  totalQuestions: number;
  isComplete: boolean;
  selectAnswer: (index: number) => void;
  nextQuestion: () => void;
  resetQuiz: () => void;
}

export function useQuiz(questions: QuizQuestion[]): UseQuizReturn {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const selectAnswer = useCallback(
    (index: number) => {
      if (selectedAnswer !== null) return;
      setSelectedAnswer(index);
      const correct = index === questions[currentQuestion].correct;
      setIsCorrect(correct);
      if (correct) setScore((s) => s + 1);
      setTimeout(() => setShowExplanation(true), 600);
    },
    [selectedAnswer, currentQuestion, questions]
  );

  const nextQuestion = useCallback(() => {
    if (currentQuestion + 1 >= questions.length) {
      setIsComplete(true);
    } else {
      setCurrentQuestion((q) => q + 1);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setShowExplanation(false);
    }
  }, [currentQuestion, questions.length]);

  const resetQuiz = useCallback(() => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setShowExplanation(false);
    setScore(0);
    setIsComplete(false);
  }, []);

  return {
    currentQuestion,
    selectedAnswer,
    isCorrect,
    showExplanation,
    score,
    totalQuestions: questions.length,
    isComplete,
    selectAnswer,
    nextQuestion,
    resetQuiz,
  };
}
```

- **Step 8.2: Create QuizPanel component**

File: `src/app/components/studio/QuizPanel.tsx`

```tsx
"use client";

import { motion } from "framer-motion";
import type { QuizQuestion } from "@/types/lesson";
import { Check, X, ArrowRight, Trophy } from "lucide-react";

interface QuizPanelProps {
  questions: QuizQuestion[];
  currentQuestion: number;
  selectedAnswer: number | null;
  isCorrect: boolean | null;
  showExplanation: boolean;
  score: number;
  isComplete: boolean;
  onSelectAnswer: (index: number) => void;
  onNext: () => void;
  onRestart: () => void;
}

export default function QuizPanel({
  questions,
  currentQuestion,
  selectedAnswer,
  isCorrect,
  showExplanation,
  score,
  isComplete,
  onSelectAnswer,
  onNext,
  onRestart,
}: QuizPanelProps) {
  if (isComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm z-20"
      >
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 max-w-md text-center">
          <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Quiz Complete!</h2>
          <p className="text-zinc-400 mb-6">
            You scored {score}/{questions.length}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={onRestart}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition text-sm"
            >
              Retry Quiz
            </button>
            <a
              href="/"
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 rounded-lg transition text-sm"
            >
              Explore More
            </a>
          </div>
        </div>
      </motion.div>
    );
  }

  const q = questions[currentQuestion];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm z-20"
    >
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-lg w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <span className="text-xs text-zinc-500 uppercase tracking-wide">
            Question {currentQuestion + 1} of {questions.length}
          </span>
          <span className="text-xs text-indigo-400">
            Score: {score}/{questions.length}
          </span>
        </div>

        <h3 className="text-lg font-semibold mb-4">{q.question}</h3>

        <div className="space-y-2 mb-4">
          {q.options.map((option, i) => {
            let style = "border-zinc-700 hover:border-zinc-500";
            if (selectedAnswer !== null) {
              if (i === q.correct) style = "border-green-500 bg-green-500/10";
              else if (i === selectedAnswer && !isCorrect)
                style = "border-red-500 bg-red-500/10";
            }

            return (
              <button
                key={i}
                onClick={() => onSelectAnswer(i)}
                disabled={selectedAnswer !== null}
                className={`w-full text-left px-4 py-3 rounded-lg border transition flex items-center gap-3 ${style}`}
              >
                <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs flex-shrink-0">
                  {selectedAnswer !== null && i === q.correct ? (
                    <Check size={14} />
                  ) : selectedAnswer === i && !isCorrect ? (
                    <X size={14} />
                  ) : (
                    String.fromCharCode(65 + i)
                  )}
                </span>
                <span className="text-sm">{option}</span>
              </button>
            );
          })}
        </div>

        {showExplanation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mb-4"
          >
            <p className="text-sm text-zinc-400 bg-zinc-800/50 rounded-lg p-3">
              {q.explanation}
            </p>
          </motion.div>
        )}

        {selectedAnswer !== null && (
          <button
            onClick={onNext}
            className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-400 rounded-lg transition text-sm font-medium flex items-center justify-center gap-2"
          >
            {currentQuestion + 1 >= questions.length ? "See Results" : "Next Question"}
            <ArrowRight size={16} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
```

- **Step 8.3: Commit**

```bash
git add src/hooks/useQuiz.ts src/app/components/studio/QuizPanel.tsx
git commit -m "feat: add interactive quiz panel with scoring and explanations"
```

---

### Task 9: Studio Page (Assemble Everything)

**Files:**

- Create: `src/app/components/studio/StudioLayout.tsx`
- Modify: `src/app/studio/[topic]/page.tsx`
- Create: `src/hooks/useLesson.ts`
- **Step 9.1: Create useLesson hook**

File: `src/hooks/useLesson.ts`

```typescript
"use client";

import { useState, useEffect } from "react";
import type { Lesson } from "@/types/lesson";
import { lessons } from "../../../data/lessons";

type LessonPhase = "loading" | "ready" | "playing" | "quiz" | "complete";

interface UseLessonReturn {
  lesson: Lesson | null;
  phase: LessonPhase;
  setPhase: (phase: LessonPhase) => void;
  error: string | null;
}

export function useLesson(topic: string): UseLessonReturn {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [phase, setPhase] = useState<LessonPhase>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const found = lessons[topic];
    if (found) {
      setLesson(found);
      setPhase("ready");
    } else {
      setError(`Lesson "${topic}" not found. Try: telescope or transformer.`);
    }
  }, [topic]);

  return { lesson, phase, setPhase, error };
}
```

- **Step 9.2: Create StudioLayout**

File: `src/app/components/studio/StudioLayout.tsx`

```tsx
"use client";

import { useRef, useCallback } from "react";
import Canvas3D from "./Canvas3D";
import ModelViewer, { type ModelViewerHandle } from "./ModelViewer";
import ChatPanel from "./ChatPanel";
import AudioPlayer from "./AudioPlayer";
import QuizPanel from "./QuizPanel";
import { useAudioSync } from "@/hooks/useAudioSync";
import { useAnimationQueue } from "@/hooks/useAnimationQueue";
import { useQuiz } from "@/hooks/useQuiz";
import type { Lesson } from "@/types/lesson";
import { ArrowLeft, Play } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

type Phase = "ready" | "playing" | "quiz" | "complete";

interface StudioLayoutProps {
  lesson: Lesson;
}

export default function StudioLayout({ lesson }: StudioLayoutProps) {
  const modelRef = useRef<ModelViewerHandle>(null);
  const phaseRef = useRef<Phase>("ready");

  const audio = useAudioSync(lesson.audioUrl);
  const quiz = useQuiz(lesson.quiz);

  useAnimationQueue({
    commands: lesson.commands,
    currentTime: audio.currentTime,
    isPlaying: audio.isPlaying,
    modelRef: modelRef.current,
  });

  const handleStart = useCallback(() => {
    phaseRef.current = "playing";
    audio.play();
  }, [audio]);

  const showQuiz = audio.isFinished && !quiz.isComplete;

  return (
    <div className="h-screen w-screen bg-zinc-950 flex flex-col">
      {/* Top bar */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-zinc-800/50 flex-shrink-0">
        <Link
          href="/"
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition text-sm"
        >
          <ArrowLeft size={16} />
          Back
        </Link>
        <h1 className="text-sm font-semibold font-[family-name:var(--font-space)]">
          {lesson.title}
        </h1>
        <div className="w-20" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* 3D Canvas */}
        <div className="flex-1 relative p-3">
          <Canvas3D>
            <ModelViewer
              ref={modelRef}
              modelUrl={lesson.modelUrl}
              scale={lesson.modelScale}
              position={lesson.modelPosition}
            />
          </Canvas3D>

          {/* Play overlay (before lesson starts) */}
          {!audio.isPlaying && audio.currentTime === 0 && !audio.isFinished && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-3 flex items-center justify-center bg-zinc-950/40 backdrop-blur-sm rounded-xl z-10"
            >
              <button
                onClick={handleStart}
                className="flex items-center gap-3 px-6 py-3 bg-indigo-500 hover:bg-indigo-400 rounded-full transition text-base font-medium shadow-lg shadow-indigo-500/25"
              >
                <Play size={20} />
                Start Lesson
              </button>
            </motion.div>
          )}

          {/* Quiz overlay */}
          {showQuiz && (
            <QuizPanel
              questions={lesson.quiz}
              currentQuestion={quiz.currentQuestion}
              selectedAnswer={quiz.selectedAnswer}
              isCorrect={quiz.isCorrect}
              showExplanation={quiz.showExplanation}
              score={quiz.score}
              isComplete={quiz.isComplete}
              onSelectAnswer={quiz.selectAnswer}
              onNext={quiz.nextQuestion}
              onRestart={quiz.resetQuiz}
            />
          )}

          {/* Audio controls (bottom) */}
          {(audio.isPlaying || audio.currentTime > 0) && !showQuiz && (
            <div className="absolute bottom-6 left-6 right-6 z-10">
              <AudioPlayer
                isPlaying={audio.isPlaying}
                progress={audio.progress}
                currentTime={audio.currentTime}
                duration={audio.duration}
                onPlay={audio.play}
                onPause={audio.pause}
                onRestart={audio.restart}
              />
            </div>
          )}
        </div>

        {/* Chat panel */}
        <div className="w-[380px] border-l border-zinc-800/50 flex-shrink-0">
          <ChatPanel
            explanation={lesson.explanation}
            currentTime={audio.currentTime}
            audioDuration={lesson.audioDuration}
            isPlaying={audio.isPlaying}
          />
        </div>
      </div>
    </div>
  );
}
```

- **Step 9.3: Update Studio page**

File: `src/app/studio/[topic]/page.tsx`

```tsx
"use client";

import { use } from "react";
import { useLesson } from "@/hooks/useLesson";
import StudioLayout from "@/app/components/studio/StudioLayout";
import Link from "next/link";

export default function StudioPage({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic } = use(params);
  const { lesson, error } = useLesson(topic);

  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-red-400">{error}</p>
        <Link href="/" className="text-indigo-400 hover:underline text-sm">
          Back to Home
        </Link>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <StudioLayout lesson={lesson} />;
}
```

- **Step 9.4: Test end-to-end flow**

```bash
npm run dev
```

1. Open [http://localhost:3000/studio/telescope](http://localhost:3000/studio/telescope)
2. 3D model should load
3. Click "Start Lesson"
4. Audio plays, chat bubbles appear, 3D model highlights parts
5. After audio ends, quiz appears

- **Step 9.5: Commit**

```bash
git add src/hooks/useLesson.ts src/app/components/studio/StudioLayout.tsx src/app/studio/
git commit -m "feat: assemble learning studio with synced audio, animations, chat, and quiz"
```

---

## PHASE 3: Polish (Hours 20–28)

### Task 10: Landing Page

**Files:**

- Create: `src/app/components/landing/SearchBar.tsx`, `src/app/components/landing/HeroSection.tsx`, `src/app/components/landing/TopicGrid.tsx`
- Modify: `src/app/page.tsx`
- **Step 10.1: Create SearchBar**

File: `src/app/components/landing/SearchBar.tsx`

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { motion } from "framer-motion";
import { lessonCatalog } from "../../../../data/lessons";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const router = useRouter();

  const suggestions = lessonCatalog.filter(
    (l) =>
      l.title.toLowerCase().includes(query.toLowerCase()) ||
      l.topic.toLowerCase().includes(query.toLowerCase())
  );

  function handleSubmit(topic?: string) {
    const target = topic || suggestions[0]?.topic;
    if (target) {
      router.push(`/studio/${target}`);
    }
  }

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="relative">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
          size={20}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
          placeholder="What do you want to learn? e.g. 'How does a telescope work?'"
          className="w-full pl-12 pr-4 py-4 bg-zinc-900 border border-zinc-700 rounded-2xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition text-lg"
        />
      </div>

      {showSuggestions && query.length > 0 && suggestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full mt-2 w-full bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden z-10"
        >
          {suggestions.map((s) => (
            <button
              key={s.topic}
              onClick={() => handleSubmit(s.topic)}
              className="w-full text-left px-4 py-3 hover:bg-zinc-800 transition flex items-center gap-3"
            >
              <Search size={14} className="text-zinc-500" />
              <div>
                <p className="text-sm font-medium">{s.title}</p>
                <p className="text-xs text-zinc-500">{s.description}</p>
              </div>
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}
```

- **Step 10.2: Create HeroSection**

File: `src/app/components/landing/HeroSection.tsx`

```tsx
"use client";

import { motion } from "framer-motion";
import SearchBar from "./SearchBar";

export default function HeroSection() {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/20 via-zinc-950 to-zinc-950" />

      <div className="relative z-10 text-center max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-6xl md:text-7xl font-bold font-[family-name:var(--font-space)] mb-4 bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
            Prism
          </h1>
          <p className="text-xl text-zinc-400 mb-12 max-w-lg mx-auto">
            Learn anything in 3D. Complex concepts made visual, interactive, and unforgettable.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <SearchBar />
        </motion.div>
      </div>
    </section>
  );
}
```

- **Step 10.3: Create TopicGrid**

File: `src/app/components/landing/TopicGrid.tsx`

```tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { lessonCatalog } from "../../../../data/lessons";
import { Sparkles } from "lucide-react";

const icons: Record<string, string> = {
  telescope: "🔭",
  transformer: "🧠",
};

export default function TopicGrid() {
  return (
    <section className="px-6 pb-20 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles size={16} className="text-indigo-400" />
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
          Popular Topics
        </h2>
      </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {lessonCatalog.map((lesson, i) => (
          <motion.div
            key={lesson.topic}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.1 }}
          >
            <Link
              href={`/studio/${lesson.topic}`}
              className="block p-5 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-indigo-500/50 hover:bg-zinc-900 transition group"
            >
              <span className="text-2xl mb-3 block">
                {icons[lesson.topic] || "📚"}
              </span>
              <h3 className="font-semibold mb-1 group-hover:text-indigo-300 transition">
                {lesson.title}
              </h3>
              <p className="text-sm text-zinc-500">{lesson.description}</p>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
```

- **Step 10.4: Assemble landing page**

File: `src/app/page.tsx`

```tsx
import HeroSection from "./components/landing/HeroSection";
import TopicGrid from "./components/landing/TopicGrid";

export default function Home() {
  return (
    <main>
      <HeroSection />
      <TopicGrid />
    </main>
  );
}
```

- **Step 10.5: Test landing page**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — should see hero section with search bar and 2-column topic grid (telescope + transformer). Search for "telescope" and click to enter studio.

- **Step 10.6: Commit**

```bash
git add src/app/components/landing/ src/app/page.tsx
git commit -m "feat: add polished landing page with search and topic grid"
```

---

### Task 11: UI Polish & Transitions

**Files:**

- Modify: Various component files for animation refinements
- **Step 11.1: Add page transition animation**

Wrap the studio page entry in a framer-motion animation for a smooth transition from landing to studio.

- **Step 11.2: Add loading state for 3D models**

Add a loading spinner or progress indicator while Three.js loads the .glb model in `Canvas3D.tsx`.

- **Step 11.3: Refine dark theme colours and spacing**

Review all components for visual consistency. Ensure:

- Consistent border radius (`rounded-xl` or `rounded-2xl`)
- Consistent spacing scale
- Glass-morphism effects (`backdrop-blur`) feel cohesive
- Focus states are visible and accessible
- **Step 11.4: Test full flow end-to-end**

1. Landing page → search "telescope" → Studio loads
2. Click "Start Lesson" → Audio plays, animations sync, chat reveals
3. Audio ends → Quiz appears → Complete quiz → Score screen
4. "Explore More" → back to landing page
5. Try both topics (telescope + transformer)

- **Step 11.5: Commit**

```bash
git add .
git commit -m "polish: refine UI transitions, loading states, and visual consistency"
```

---

## PHASE 4: Demo Prep (Hours 28–33)

### Task 12: Demo Hardening

- **Step 12.1: Verify both lessons work perfectly**

Play through each lesson (telescope + transformer) end-to-end 3 times. Fix any timing issues in the JSON files (adjust `timestamp` values to match actual TTS audio).

- **Step 12.2: Pre-load assets**

Add `<link rel="preload">` for the first lesson's model and audio in the landing page to reduce load time during demo.

- **Step 12.3: Fix any animation timing drift**

If highlights appear too early/late compared to audio, adjust timestamps in the lesson JSON files. This is just editing numbers — fast iteration.

- **Step 12.4: Handle edge cases**
- What if user clicks "Start Lesson" twice?
- What if user navigates away mid-lesson?
- What if model fails to load? (show graceful error)
- What if audio fails to load? (show text-only fallback)
- **Step 12.5: Write demo script**

Create a 90-second demo script:

1. (0-10s) "This is Prism — learn anything in 3D"
2. (10-20s) Search for "telescope" on landing page
3. (20-50s) Watch the teaching experience: voice + 3D animations + chat transcript
4. (50-70s) Complete quiz (show 2 questions)
5. (70-80s) Show the Transformer lesson loading — "We can also teach AI concepts from research papers" — proves it's not hardcoded and directly appeals to the OpenAI/AI judges
6. (80-90s) "Under the hood: ElevenLabs voice, Three.js 3D, pre-authored content with architecture ready for GPT-4 dynamic generation"

- **Step 12.6: Final commit**

```bash
git add .
git commit -m "demo: harden edge cases and finalize demo-ready build"
```

---

## PHASE 5: Stretch Goals (Hours 33–36)

> **ONLY attempt these if core demo is stable and polished. If anything in Phase 4 is broken, fix that first.**

### Task 13 (STRETCH): Agora Real-Time Voice

**Files:**

- Create: `stretch/agora/voiceClient.ts`
- **Step 13.1: Install Agora SDK**

```bash
npm install agora-rtc-sdk-ng
```

- **Step 13.2: Implement voice client**

Add a "Ask a Question" button in the chat panel that:

1. Opens Agora voice channel
2. Captures user speech
3. Sends to OpenAI Whisper for transcription
4. Sends text to GPT-4 for a follow-up answer
5. Plays GPT-4 response via ElevenLabs TTS

- **Step 13.3: Test voice interaction**

Verify low-latency voice capture and AI response.

---

### Task 14 (STRETCH): GPT-4 Dynamic Lesson Generation

**Files:**

- Create: `stretch/ai-lessons/generateLesson.ts`
- **Step 14.1: Implement lesson generator**

When user searches for a topic not in the pre-scripted catalog:

1. Call Exa.ai to find educational content
2. Send content to GPT-4 with structured output schema matching `Lesson` type
3. GPT-4 generates explanation + animation commands + quiz
4. Frontend renders the generated lesson

- **Step 14.2: Add fallback UI**

If generation fails, show: "We're still learning about this topic. Try one of our featured lessons!"

---

## Risk Mitigation Summary


| Risk                                          | Mitigation                                                           | Fallback                                                         |
| --------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 3D model mesh names don't match JSON commands | Inspect models in glTF viewer BEFORE hackathon, update JSON          | Use generic animations (rotate, zoom) that don't need part names |
| ElevenLabs TTS audio sounds unnatural         | Test multiple voices during pre-hackathon prep                       | Record human voice as backup                                     |
| Audio-animation timing drift                  | Use `requestAnimationFrame` for precise sync, adjust JSON timestamps | Accept small drift — users won't notice ±0.5s                    |
| Three.js performance issues                   | Use compressed .glb, limit polygon count, disable shadows if needed  | Reduce model complexity                                          |
| Judge asks about a topic we don't have        | Show graceful error + suggest available topics                       | Implement stretch Task 14                                        |


---

## Team Parallelization

**If you have a 4-person team, split as follows:**


| Person                        | Tasks                                                          | Hours                  |
| ----------------------------- | -------------------------------------------------------------- | ---------------------- |
| **Frontend Dev**              | Task 1, 4, 9, 10, 11                                           | 0–28                   |
| **3D / Animation Dev**        | Task 4, 6, timing refinement                                   | 0–20, then help polish |
| **Content / AI Dev**          | Task 0 (assets), 3 (2 lesson JSONs), 2 (TTS), Task 13–14 stretch | 0–36                   |
| **Backend / Integration Dev** | Task 2, 5, 7, 8, 12                                            | 0–33                   |


**Critical path:** Task 0 (assets) → Task 3 (lesson data) → Task 4 (3D viewer) → Task 5+6 (audio+animation sync) → Task 9 (assembly)

All other tasks can be done in parallel once the types (Task 3.1) are defined.

> **Note:** With only 2 lessons to author, the Content/AI Dev has more bandwidth for stretch goals (Tasks 13–14) or helping polish the Transformer 3D visualization.