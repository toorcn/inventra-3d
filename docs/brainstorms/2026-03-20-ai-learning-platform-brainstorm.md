---
date: 2026-03-20
topic: ai-learning-platform
hackathon: LotusHacks x HackHarvard x GenAI Fund
duration: 36 hours
---

# AI-Powered 3D Learning Platform

## What We're Building

An interactive learning platform that transforms complex concepts (telescopes, research papers like "Attention is All You Need") into engaging visual experiences taught by an AI assistant. Users interact with 3D visualizations synchronized with voice/text explanations, ending with comprehension quizzes.

### Core User Flow
1. User searches for a concept (e.g., "how a telescope works")
2. Enters "Learning Studio" with 3D canvas (center) + chat panel (right)
3. AI teacher generates/loads 3D model and begins explanation
4. As teacher explains, 3D objects animate (parts highlight, rotate, explode view)
5. User can interrupt via voice or text with questions
6. Session ends with adaptive quiz to verify understanding

### Landing Page (Simplified for Hackathon)
- Hero section with search bar (Google-style)
- Mockup/static 3D Earth showing concept origins (described, not fully interactive)
- List of trending topics/papers below search

## Why This Approach

**Approach Selected: Full-Stack Custom Build**

We chose full technical control over speed-focused AI generation tools because:

1. **3D + Voice Synchronization** requires precise orchestration that's harder to achieve with generated code
2. **Technical depth showcase** - judges value sophisticated architecture in 36 hours
3. **Team skills alignment** - full-stack team comfortable building from scratch
4. **Demo reliability** - custom code = less dependency on external platform quirks during judging

**Approaches Considered:**
- ❌ AI-Native (Lovable/Replit): Faster frontend but less control over 3D animations
- ❌ n8n Orchestration: Visual debugging benefits but perception of "less code = less impressive"
- ✅ Full-Stack Custom: Maximum control, strongest technical story

## Key Decisions

### 1. Tech Stack
**Frontend:**
- React + Next.js
- Three.js for 3D rendering
- Agora SDK for voice integration

**Backend:**
- Node.js (Express/Fastify)
- Websockets for real-time coordination (voice ↔ frontend)
- RESTful endpoints for lesson data

**AI & Data:**
- **CORE (Pre-scripted):** JSON lesson files with explanations + animation commands
- **STRETCH (AI-generated):** OpenAI GPT-4 for dynamic lesson generation
- **STRETCH (RAG):** Exa.ai for arbitrary topic queries

**Voice:**
- Agora Conversational AI Engine for real-time voice
- ElevenLabs TTS as backup/enhancement
- Whisper (OpenAI) for STT if needed

**3D Assets:**
- 5-10 curated high-quality models (Sketchfab, free 3D libraries)
- Manual Three.js animation scripts per model
- Pre-scripted animation timelines (JSON format)

### 2. **REVISED: Pre-Scripted Demo-First Strategy** ⭐

**Core Implementation (Must-Have for Demo):**

All lessons are **pre-authored JSON files** with:
```json
{
  "topic": "telescope",
  "title": "How a Telescope Works",
  "explanation": "A telescope works by gathering light through a large lens or mirror called the objective. The light then travels through the tube to the eyepiece, where you observe. The larger the objective, the more light it collects, allowing you to see fainter, more distant objects.",
  "audio_url": "/audio/telescope-lesson.mp3",
  "audio_duration": 18.5,
  "model": "telescope.glb",
  "commands": [
    {"timestamp": 0, "action": "load_model", "params": {...}},
    {"timestamp": 2.5, "action": "highlight", "params": {"part": "objective_lens", "color": "#00ff00"}},
    {"timestamp": 9.5, "action": "trace_light_path", "params": {...}},
    ...
  ],
  "quiz": [
    {
      "question": "What is the primary function of the objective lens?",
      "options": ["To magnify the image", "To gather light", "To focus on nearby objects", "To reduce glare"],
      "correct": 1
    }
  ]
}
```

**Benefits:**
- ✅ **Zero AI risk** - lessons work perfectly every time
- ✅ **Polished content** - can refine explanations and timing
- ✅ **Fast iteration** - edit JSON, see results immediately
- ✅ **Reliable demo** - no API failures during judging
- ✅ **Pre-generate TTS** - ElevenLabs audio files ready before demo

**Curated Topics (5-10 lessons):**
1. **Telescope** - optical physics, lenses
2. **DNA Structure** - biology, double helix
3. **Attention Mechanism** - ML/AI, transformer architecture
4. **Steam Engine** - mechanical engineering, thermodynamics
5. **Solar System** - astronomy, planetary motion
6. *Stretch:* Quantum Entanglement, Combustion Engine, Photosynthesis, etc.

**STRETCH: AI-Generated Lessons (Low Priority)**

*Only implement if core demo is polished and time permits (final 6 hours):*

- User searches for topic not in pre-scripted library
- Backend calls Exa.ai → GPT-4 → generates lesson JSON
- Same format as pre-scripted, but created on-the-fly
- **Fallback:** "This topic isn't available yet. Try: Telescope, DNA, Attention Mechanism..."

**STRETCH: RAG Enhancement (Low Priority)**

*Only if AI-generated lessons are working:*
- Exa.ai web search for educational content
- GPT-4 uses retrieved content to generate accurate explanations
- Vector DB (Zilliz) only if excessive time remains

### 3. Voice Architecture with Agora

**Flow:**
```
User speaks → Agora SDK captures audio → 
Agora STT OR OpenAI Whisper → 
Backend receives text → RAG retrieval → 
GPT-4 generates teaching response + 3D commands → 
ElevenLabs TTS generates audio → 
Frontend plays audio + executes 3D animations synchronously
```

**Key integration points:**
- Agora handles voice transport layer (low-latency audio streaming)
- Backend orchestrates: text → AI → TTS → 3D commands
- Frontend receives: audio stream + JSON commands for 3D animations
- Websocket ensures 3D animations sync with speech timing

### 4. **REVISED: Pre-Scripted Lesson Architecture**

**Core Flow (Demo-Ready):**
1. User searches for "telescope"
2. Frontend loads `/lessons/telescope.json`
3. Three.js loads the 3D model
4. Audio player loads pre-generated TTS file
5. AnimationController syncs commands with audio timestamps
6. Quiz appears at end

**Lesson File Structure:**
```
/lessons/
  telescope.json         # Lesson metadata + commands
  dna.json
  attention-mechanism.json
  ...
  
/models/
  telescope.glb
  dna.glb
  ...
  
/audio/
  telescope-lesson.mp3   # Pre-generated ElevenLabs TTS
  dna-lesson.mp3
  ...
```

**Animation Command Format:**
```json
{
  "commands": [
    {"timestamp": 0, "action": "load_model", "model": "telescope"},
    {"timestamp": 2.5, "action": "highlight", "part": "objective_lens", "color": "#00ff00"},
    {"timestamp": 5.0, "action": "zoom_to", "part": "objective_lens", "distance": 2},
    {"timestamp": 9.5, "action": "trace_light_path", "from": "objective_lens", "to": "eyepiece"},
    {"timestamp": 12.0, "action": "rotate", "axis": "y", "degrees": 360, "duration": 3}
  ]
}
```

Frontend Three.js interprets commands and syncs with audio playback.

**STRETCH: AI-Generated Lessons (Low Priority)**
- Only implement if core pre-scripted demo works perfectly
- GPT-4 generates lesson JSON in same format
- Exa.ai retrieves educational content for accuracy

### 5. **REVISED: Scope Boundaries & Priorities**

**MUST HAVE (Core Demo - 80% of time):**
- ✅ 3-5 pre-scripted lessons with perfect timing
- ✅ Three.js 3D models with smooth animations
- ✅ Timestamp-synced animation commands
- ✅ Voice playback (pre-generated TTS audio)
- ✅ Multiple choice quiz at end of lesson
- ✅ Clean, polished UI for Learning Studio
- ✅ Basic landing page with search

**NICE TO HAVE (Stretch - 15% of time):**
- 🎯 Real-time voice interaction via Agora (vs. just playback)
- 🎯 AI-generated lessons for arbitrary topics (GPT-4 + Exa.ai)
- 🎯 User can interrupt and ask questions during lesson
- 🎯 More advanced animations (explode view, transparent materials)
- 🎯 5-10 lessons instead of 3-5

**OUT OF SCOPE (Don't even attempt - 0% of time):**
- ❌ AI-generated 3D models on-the-fly
- ❌ User accounts/authentication
- ❌ Interactive Earth globe (just mock it)
- ❌ Mobile responsive design
- ❌ Lesson history/progress tracking
- ❌ RAG with vector database (unless AI generation works early)
- ❌ Multi-language support
- ❌ Real-time collaboration
- ❌ Teacher personality customization

## Sponsor Integration Strategy

**Primary Sponsor Tracks to Target:**

1. **OpenAI - Best use of Codex** ⭐ PRIORITY
   - GPT-4 orchestrates teaching intelligence
   - Embeddings power RAG search
   - Whisper for STT (if not using Agora's)
   - Codex could generate Three.js animation code dynamically (stretch goal)

2. **Agora - Real-time voice integration**
   - Core voice infrastructure
   - Low-latency audio streaming
   - Conversational AI Engine

3. **ElevenLabs - Best use of ElevenLabs**
   - High-quality teacher voice TTS
   - Voice effects for engaging teaching style

4. **Exa.ai - Web search & content retrieval**
   - RAG content source for arbitrary topics
   - Demonstrates extensibility beyond pre-seeded topics

5. **Fal.ai - Best use of FAL** (Stretch)
   - If time permits: AI-generated 3D models for topics without pre-made assets
   - Backup plan: mention in architecture as "future enhancement"

**Credit Usage Priorities (REVISED):**
1. **ElevenLabs TTS** - CRITICAL (pre-generate audio files before demo)
2. **Agora voice credits** - HIGH (for real-time interaction stretch goal)
3. **OpenAI API (GPT-4)** - MEDIUM (only for stretch: AI-generated lessons)
4. **Exa.ai search** - LOW (only if AI generation works)
5. **Zilliz vector DB** - NOT NEEDED (pre-scripted lessons only)
6. **Fal.ai 3D generation** - NOT NEEDED (curated models only)

## Open Questions

### Technical Risks
- **Q: Can Agora SDK reliably integrate with our websocket-based 3D command system?**
  - Mitigation: Test Agora integration in first 6 hours, fallback to text-only if problematic
  
- **Q: Will GPT-4 consistently output valid JSON for animation commands?**
  - Mitigation: Use structured outputs / function calling, validate/sanitize JSON
  
- **Q: Can we synchronize TTS audio playback with Three.js animations smoothly?**
  - Mitigation: Timestamp-based command queue, test early with one model

### Content Preparation
- **Q: What 5-10 topics should we pre-seed for guaranteed demo quality?**
  - Recommendation: Mix of tangible objects (telescope, engine) + abstract concepts (attention mechanism, DNA replication)
  
- **Q: Should we write custom lesson scripts or let GPT-4 improvise entirely?**
  - Hybrid: Write "lesson outlines" (key points to cover), GPT-4 fills in explanations

### Team Coordination
- **Q: How do we parallelize work across team members?**
  - Proposed roles:
    - Frontend dev: Next.js + Three.js setup
    - Backend dev: Node.js + RAG pipeline
    - AI/Prompt engineer: GPT-4 teaching prompts + animation command schemas
    - 3D asset curator: Source models, test in Three.js
  
- **Q: What's our MVP definition for "demo-ready"?**
  - MVP: 1 topic (telescope) with voice + 3D animations working end-to-end
  - Stretch: 5 topics, quiz generation, Exa.ai fallback

## Success Criteria

**MVP Demo (Must Show):**
1. ✅ User searches for "telescope" → enters Learning Studio
2. ✅ AI teacher voice plays (ElevenLabs pre-generated TTS)
3. ✅ 3D telescope model animates perfectly in sync with voice
   - Highlight objective lens at 2.5s
   - Zoom to eyepiece at 5s
   - Trace light path at 9.5s
   - Full rotation at 12s
4. ✅ Quiz appears at end (3-5 multiple choice questions)
5. ✅ User can try 2-3 other pre-scripted topics (DNA, Attention Mechanism)

**STRETCH Demo Features:**
6. 🎯 Real-time voice interaction (Agora) - user asks "Can you explain that again?"
7. 🎯 Search for non-pre-scripted topic → GPT-4 + Exa.ai generates lesson on-the-fly
8. 🎯 User interrupts during lesson with questions

**Sponsor Appeal (REVISED):**
- **ElevenLabs:** "High-quality voice teaching brings dry concepts to life"
- **Agora (stretch):** "Real-time voice enables natural interruptions and questions"
- **OpenAI (stretch):** "GPT-4 generates multi-modal lessons on any topic"
- **Exa.ai (stretch):** "Web search ensures accurate, up-to-date educational content"
- **Multi-sponsor:** "Seamless integration of voice + 3D + AI teaching"

## Next Steps

→ **Proceed to `/plan` for detailed implementation breakdown**

Key planning focus areas:
1. Hour-by-hour task breakdown (36-hour timeline)
2. API integration sequence (test Agora/OpenAI first)
3. File structure and component architecture
4. Testing strategy (can't afford bugs during demo)
5. Fallback plans for each critical integration
