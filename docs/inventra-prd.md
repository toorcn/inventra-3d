INVENTRA
Interactive Invention Explorer
Product Requirements Document — Hackathon Edition
Version: 2.0 | Status: Active Development | Classification: Confidential


































FieldDetailProductInventra — Interactive Invention ExplorerVersion2.0 — Hackathon PrototypeStatusActive DevelopmentFocus InventionsTelephone · iPhone · Steam Engine · TelescopePlatformDesktop browser only (wide screen required for holographic viewer)APIs in usefal.ai · OpenRouter · Agora · ElevenLabs · Exa.ai · Google 3D Tiles

Table of Contents

Executive Summary
Judging Criteria Alignment
Problem & Vision
Scope Decisions
Target Users & Use Cases
Product Modules Overview
Module 1 — Discovery Globe (Temporos)
Module 2 — Holographic Viewer (Webcam + MediaPipe)
3D Asset Generation Pipeline
AI Expert Avatar (ElevenLabs + Agora)
Exa.ai Semantic Search Integration
Data Sources & Content
Full Technical Stack
Hackathon Build Plan
Risks & Mitigations
Post-Hackathon Roadmap


1. Executive Summary
Inventra is a browser-based educational platform that makes the history of human invention explorable, tangible, and alive. It delivers two interconnected experiences:

A 3D globe with Temporos — maps inventions geographically and lets users scrub through history, watching innovation ripple outward from its origins
An immersive holographic viewer — composites 3D models of inventions over a live webcam feed, letting a presenter disassemble them in mid-air using hand gestures, while an AI avatar explains each component in plain language

Built for a hackathon, the prototype focuses on four iconic inventions spanning 500 years of innovation:



































InventionYearInventorOriginTelephone1876Alexander Graham BellEdinburgh / BostoniPhone2007Steve Jobs / Apple Inc.Cupertino, CaliforniaSteam Engine1769James WattBirmingham, EnglandGalilean Telescope1609Galileo GalileiVenice / Padua, Italy
The one-sentence pitch for judges:

"We turned 200-year-old patent diagrams into gesture-controlled holograms you can disassemble with your hands — no app, no headset, just a browser."


2. Judging Criteria Alignment
This section maps every judging criterion to specific Inventra features and prescribes what to emphasise in the demo to maximise each score.

🏆 Technical Implementation & Complexity
What judges want: Complex algorithms, multi-system integration, advanced engineering concepts — well implemented and functional.
How Inventra scores: Inventra integrates 8 distinct technical systems simultaneously in a single browser session:


















































SystemTechnologyComplexity Signal3D GlobeCesiumJS + Google Photorealistic 3D TilesStreaming volumetric tile renderingTemporal NavigationCustom Temporos engine with Cesium entity filteringDate-range marker system + ripple animationGesture DetectionMediaPipe Hands (21 landmarks, 30fps)Real-time computer vision in browserHolographic OverlayThree.js transparent canvas over webcamMulti-layer GPU compositing3D Asset PipelineNano Banana → fal SAM-3D → Hyper3D Rodin → trimeshAI-driven 2D→3D transformation chainSemantic SearchExa.ai neural search → globe filter mappingNeural retrieval with geographic extractionAI Avatar VoiceElevenLabs TTS + Agora streamingReal-time voice synthesis + lip-sync deliveryLLM ReasoningOpenRouter with dynamic context injectionPer-component grounded Q&A
What to do in the demo: Show a one-slide pipeline diagram before the live demo — Nano Banana → SAM-3D → Rodin → trimesh → GLB → Three.js. Make the complexity legible. Judges need to see that the 3D model was built by the pipeline, not downloaded from a stock library.

💡 Innovation
What judges want: Truly groundbreaking concepts, visionary thinking, an entirely new way of solving the problem — distinctly original among submissions.
How Inventra scores: Three features that don't exist anywhere in combination:

Webcam holographic overlay with gesture control for patent exploration — the interaction paradigm is entirely new. No existing patent or educational tool lets you physically gesture to disassemble an invention in mid-air
Temporos ripple system — the visual metaphor of innovation spreading geographically over time, triggered by scrubbing a timeline, is an original educational UX concept
Exa.ai neural search → live globe filtering — typing "optical instruments 1600s Italy" and watching Galileo's telescope light up on the globe is a live, real-time moment of discovery that keyword-based patent databases cannot replicate

What to say to judges: "Patents are the world's largest repository of technical knowledge — over 100 million documents — and almost nobody can access them meaningfully. We didn't just build a better search interface. We built a way to feel invention."

⚙️ Functionality & Reliability
What judges want: Highly reliable, well-tested, smooth and bug-free execution, robust implementation, consistent results, strong attention to detail.
How Inventra scores: This is the highest-risk criterion given the multi-system architecture. Non-negotiable reliability measures:

All GLBs pre-generated and served as static files — no live AI generation during demo
Keyboard fallbacks for every gesture (E = explode, A = assemble, 1–4 = switch invention)
Avatar introductions pre-recorded as audio fallback if Agora streaming fails
Demo rehearsed 10+ times on the exact demo laptop at the exact screen resolution
Small on-screen HUD showing gesture confidence score — turns a potential failure into a visible engineering detail

What to say if something breaks: "The keyboard fallback is intentional — in a production deployment you'd want non-gesture users to have full access too." Reframe reliability features as design decisions.

🎨 Design & UX
What judges want: Exceptional design and UX, visually cohesive, highly intuitive and enjoyable to use, design thinking and strong attention to user experience.
Key design details that score here:

Dark mode throughout — the webcam overlay reads dramatically better on a dark UI; it also signals intentional design rather than defaults
Consistent accent system — electric blue (#2563EB) as the single accent colour throughout globe, UI, glow ring, avatar panel border, and component labels
Cinematic globe→viewer transition — zoom-out to black then fade into webcam, not a page reload
Named avatar personas — "Dr. Bell" for telephone, "Galileo" for telescope, "Mr. Watt" for engine, "Jony" for iPhone. Small portrait icon beside the avatar panel
Glow ring — the Three.js ring beneath the 3D model grounds it visually in the webcam space and is the single detail that makes it feel like a real hologram
Pause after the explode moment — silence lets the room react. Don't rush past the wow


🎤 Presentation
What judges want: Exceptional communication, confident, inspiring, and polished delivery that perfectly complements the project.
Key presentation principles:

Open with the problem before touching the demo — one sentence: "Understanding a patent today means reading 40 pages of legal text. We think it should feel like this." Then open the globe
Narrate action and meaning simultaneously — judges watching a screen need the presenter to bridge what they see and why it matters
Let the telephone explode moment breathe — raise the palm, watch the components drift apart, then pause 2–3 seconds before speaking again
Close with scale — "Four inventions today. One hundred million patents in the database. Same pipeline."

The full 90-second demo script is in Section 14.

🌍 Impact & Relevance
What judges want: Outstanding impact, addressing an important challenge with strong societal or user relevance, demonstrating potential for lasting influence or scalability.
How Inventra scores:

Problem scale: 100 million+ patents worldwide, almost entirely inaccessible to non-experts. The knowledge embedded in them is locked behind legal language
Education equity: A student in rural Malaysia and a PhD researcher at MIT both get the same experience. No library access, no specialist training required
Geographic intelligence: Innovation geography matters for policy, economic development, and education — currently invisible in any educational tool
Scalability path: The pipeline (patent → 3D model → avatar context) is automatable. Four inventions for the prototype, the full USPTO database as the ceiling
Concrete use cases: Museum installations, school curriculum supplements, university research onboarding


3. Problem & Vision
3.1 Problem Statement
Patent and invention knowledge is largely inaccessible to students and curious non-experts:

Discovery is fragmented across jurisdictions, databases, and keyword syntax — designed for lawyers, not learners
Content is static (PDFs, diagrams) and requires significant domain knowledge to interpret
There is no intuitive geographic or temporal view of where and when innovation happened
Understanding how an invention works from schematic diagrams is slow and cognitively heavy

3.2 Vision
Create an interactive platform that:

Maps global inventions geographically on a navigable 3D globe with a temporal slider (Temporos)
Transforms patent diagrams into immersive 3D experiences where users can explore, explode, and interrogate components
Provides a natural language AI avatar — voiced and context-aware — to explain any component in plain language
Delivers the entire experience in a browser, controllable by hand gesture, requiring no app installation


4. Scope Decisions
These decisions are finalised for the hackathon prototype and should not be revisited during build time.








































DecisionChoiceRationaleNumber of inventions4 (Telephone, iPhone, Steam Engine, Telescope)Four done beautifully beats ten done poorly. Sufficient to demonstrate geographic, temporal, and category diversityMobile supportNone — desktop onlyThe holographic viewer requires a wide screen. Globe navigation also benefits from a large displayAR approachWebcam overlay (Three.js + MediaPipe)No app install, runs on demo laptop, judges see it on the projector — more reliable and more visually impressive for a room audienceVoice stackElevenLabs (generation) + Agora (streaming/lipsync)ElevenLabs provides character-specific high-quality voice; Agora handles real-time delivery and the floating avatar panelGlobe tilesGoogle Photorealistic 3D Tiles from day one200/monthfreecreditmakesiteffectivelyfree( 200/month free credit makes it effectively free (~200/monthfreecreditmakesiteffectivelyfree( 0.40 total hackathon cost). Dramatically better visual quality than OSM-onlySearchExa.ai neural searchBetter semantic understanding than OpenRouter NLP parsing; adds a live discovery moment to the demo; you already have API access
Google 3D Tiles Cost Estimate






























UsageEstimated requestsEstimated costDevelopment + testing~5,000 tile requests~$0.25Demo day (10 run-throughs)~2,000 tile requests~$0.10Judges trying the product~1,000 tile requests~$0.05Total~8,000 requests~$0.40
Free tier covers 200/month.Seta200/month. Set a 200/month.Seta5 billing cap as insurance.

5. Target Users & Use Cases
5.1 Primary Personas






























PersonaDescriptionKey NeedCurious StudentsAges 14–22, limited technical background, desktop browserUnderstand how famous inventions work visuallyEducators / TeachersWant teaching tools that explain technologies visually with geographic contextShareable, structured lessons tied to curriculumInventors / MakersWant quick intuition for prior art and mechanism understandingDeep component-level explorationHackathon JudgesNeed to be wowed in 90 seconds on a projectorClear narrative, visual drama, technical credibility
5.2 Core Use Cases (Prototype)

Geographic Discovery — zoom into Scotland on the globe, see the telephone patent marker, read context about Alexander Graham Bell
Temporal Discovery (Temporos) — slide the timeline from 1600 to 2007 and watch invention markers appear as humanity crossed each threshold
Semantic Search (Exa) — type "optical instruments Renaissance Italy" and watch Galileo's telescope light up on the globe
Invention Deep-Dive — select an invention, switch to 3D viewer, see the assembled model in holographic overlay on webcam feed
Gesture-Controlled Exploration — open palm to explode components, point to select, pinch to scale
Avatar Q&A — ask "how does the diaphragm work?" and receive a plain-language answer voiced by ElevenLabs


6. Product Modules Overview


















































ModuleTechnologyPurposeDiscovery GlobeCesiumJS + Google 3D Tiles + OSMGeographic and temporal invention explorationTemporos EngineCustom Cesium date-range filter + ripple animationTimeline scrubbing with geographic spread visualisationExa SearchExa.ai neural search APISemantic invention discovery → live globe filteringHolographic ViewerThree.js + MediaPipe Hands + WebcamImmersive 3D component exploration via gestureAI AvatarElevenLabs TTS + Agora streamingCharacter-voiced, context-aware expert explanationLLM ReasoningOpenRouter (claude-3-5-sonnet)Avatar Q&A, component descriptions, patent summarisation3D Asset PipelineNano Banana + fal SAM-3D + Hyper3D Rodin + trimeshGenerate component GLBs from patent diagramsData BackendSupabase (Postgres)Invention metadata, component configs, geographic data

7. Module 1 — Discovery Globe (Temporos)
7.1 Globe Rendering
Technology

CesiumJS — primary globe engine, handles 3D Tiles streaming, camera controls, entity management, and vector overlays
Google Photorealistic 3D Tiles — city-level 3D geometry when zoomed in past ~500m altitude
OpenStreetMap vector tiles — country and state/district boundaries at all zoom levels

Required Interactions

Rotate, zoom (scroll), pan, and tilt — standard Cesium mouse controls
Click on a region to focus the camera and dim surrounding areas
Click on an invention marker to open the side panel
Reset/home button returns to default global view with smooth flyTo animation

Acceptance Criteria

Globe loads and is interactive within 4 seconds on a mid-range laptop
Country and district borders render cleanly at all zoom levels
Camera flyTo animations are smooth (60fps target)
All 4 invention markers are visible and clickable on load


7.2 Temporos — Temporal Navigation
Core Concept
A timeline slider at the bottom of the globe view lets the user scrub through history from 1600 to 2025. Invention markers appear and disappear based on the selected year. The visual effect should feel like watching history unfold.
Three Date Fields Per Invention

























Date TypeDescriptionVisual UseInvention DateWhen the idea was first demonstrated or documentedMarker appears on globe at origin pointPatent Filing DateWhen the patent was formally registeredMarker colour shifts to indicate legal recognitionCommercialisation DateWhen the technology reached mass adoptionRipple animation radiates from origin outward
Ripple Mode
When the Temporos slider crosses an invention's commercialisation date, a ripple animation radiates outward from the origin point across the globe — visually representing how the technology spread geographically over time.
Acceptance Criteria

Slider covers 1600–2025 with decade markers
Markers appear/disappear as slider crosses each invention date
Ripple animation triggers correctly on commercialisation date crossing
Slider operable by keyboard (arrow keys)


7.3 Invention Markers & Side Panel
Marker Design

Custom billboard entities in Cesium — glowing #2563EB dot with invention icon
Cluster at zoom levels above ~1,000km altitude
On hover: tooltip with invention name and year
On click: flyTo camera to invention origin, open side panel

Side Panel Contents

Invention title, year, inventor name, origin location
Category tag (Communications / Optics / Mechanical Engineering / Consumer Electronics)
Brief plain-language description (2–3 sentences)
Primary patent number with source link
"Enter Holographic Viewer" CTA button


8. Module 2 — Holographic Viewer (Webcam + MediaPipe)
8.1 Architecture



































LayerTechnologyRoleBackgroundgetUserMedia() video elementLive webcam feed, full canvas size3D RendererThree.js WebGL canvas (alpha: true)Transparent canvas composited over webcamGesture DetectionMediaPipe Hands (21 landmarks/hand)Real-time hand tracking at ~30fpsModel FormatGLTF/GLBPre-generated component meshesAvatar OverlayAgora streaming video, floating panelExpert avatar positioned beside the 3D model

Critical: Three.js renderer must use alpha: true and setClearColor(0x000000, 0) — fully transparent. This makes the webcam show through beneath the 3D model, creating the holographic effect.

const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });renderer.setClearColor(0x000000, 0);
navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }})  .then(stream => { video.srcObject = stream; });
<div id="ar-container" style="position:relative; width:1280px; height:720px">  <video id="webcam" autoplay playsinline    style="position:absolute; width:100%; height:100%; object-fit:cover"/>  <canvas id="three-canvas"    style="position:absolute; top:0; left:0; width:100%; height:100%"/></div>

8.2 Gesture Vocabulary















































GestureDetection MethodActionKeyboard FallbackOpen palmAll 4 fingertip Y-positions above finger base Y-positionsTrigger exploded viewEClosed fistAll fingertips below their base jointsReassemble modelAIndex finger pointOnly index fingertip extendedSelect / highlight componentClickPinch open (2 hands)Distance between index tips increasingScale model up+Pinch close (2 hands)Distance between index tips decreasingScale model down-Wrist rotation (1 hand)Wrist landmark X-position deltaRotate model on Y axisArrow keys

Keyboard fallbacks are required, not optional. Show them as a small on-screen HUD — it signals robust engineering, not failure.

hands.setOptions({ maxNumHands: 2, modelComplexity: 1,  minDetectionConfidence: 0.7, minTrackingConfidence: 0.5 });
function onHandResults(results) {  if (!results.multiHandLandmarks || !model) return;  for (const landmarks of results.multiHandLandmarks) {    const wrist = landmarks[0], indexTip = landmarks[8], thumbTip = landmarks[4];
    model.rotation.y = (wrist.x - 0.5) * Math.PI * 2;
    const pinchDist = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);    if (prevPinchDist !== null) {      model.scale.multiplyScalar(1 + (pinchDist - prevPinchDist) * 2);      model.scale.clampScalar(0.3, 3.0);    }    prevPinchDist = pinchDist;
    if (isPalmOpen(landmarks) && !isExploded) { triggerExplode(); isExploded = true; }    else if (!isPalmOpen(landmarks) && isExploded) { triggerAssemble(); isExploded = false; }  }}
function isPalmOpen(landmarks) {  const tips = [8, 12, 16, 20], bases = [6, 10, 14, 18];  return tips.every((tip, i) => landmarks[tip].y < landmarks[bases[i]].y);}

8.3 Exploded View
Telephone Component Offsets









































ComponentOffset XOffset YOffset ZDiaphragm0+0.80Wooden Housing0−0.60Receiver Horn+0.800Electromagnet Coil−0.800Battery Terminal00+0.8
function triggerExplode() {  model.traverse((child) => {    if (child.isMesh && componentOffsets[child.name]) {      child.userData.targetPos = child.userData.originalPos        .clone().add(componentOffsets[child.name]);    }  });}
function animate() {  requestAnimationFrame(animate);  model?.traverse((child) => {    if (child.isMesh && child.userData.targetPos)      child.position.lerp(child.userData.targetPos, 0.08);  });  renderer.render(scene, camera);}

8.4 Visual Polish
// Glow ring — grounds model in webcam spaceconst ring = new THREE.Mesh(  new THREE.RingGeometry(0.4, 0.5, 64),  new THREE.MeshBasicMaterial({ color: 0x2563EB, transparent: true, opacity: 0.4, side: THREE.DoubleSide }));ring.rotation.x = -Math.PI / 2;ring.position.y = -0.8;scene.add(ring);

Component labels — floating HTML overlay (position: absolute over canvas) showing component name + description on point gesture
Lighting — AmbientLight at 0.8 + DirectionalLight at (5,5,5)
Globe→Viewer transition — fade to black then fade in webcam, not a page reload


9. 3D Asset Generation Pipeline
9.1 Tool Roles








































ToolInputOutputBest ForWeaknessNano BananaLow-res patent diagram PNGUpscaled, sharpened imageAll patent diagrams as first stepCannot fix fundamentally bad source artfal SAM-3DUpscaled component imagePer-component GLB meshSegmenting clean silhouettesStruggles with overlapping cross-section diagramsHyper3D Rodin (fal)Text prompt or clean imageFull textured 3D model GLBHero assembled models, simple objectsLess precise for internal mechanical componentstrimesh (Python)Raw GLB from pipelineCleaned, validated GLBMesh repair — holes, normals, duplicate facesNot a generator — cleanup only
Full pipeline:
Patent diagram (PNG)
    → Nano Banana (upscale + sharpen)
    → fal SAM-3D (segment + lift each component)
    → trimesh cleanup
    → component_name.glb ✓

Text prompt / clean reference photo
    → Hyper3D Rodin (fal)
    → trimesh cleanup
    → hero.glb ✓


9.2 Per-Invention Strategy
Telephone (1876 Bell) — 🟢 Low Risk

Hero: Rodin prompt — "1876 Alexander Graham Bell telephone, wooden box body, iron diaphragm, brass fittings, Victorian era, museum quality"
Components: Upscale Bell patent US174465A → SAM-3D. Expected: diaphragm, wooden housing, receiver horn, electromagnet coil, battery terminal

Telescope (1609 Galilean) — 🟢 Low Risk

Hero: Rodin prompt — "Galilean telescope 1609, long brass barrel, two lens elements, wooden mount, aged patina"
Components: Clean silhouette image → SAM-3D. Expected: objective lens, eyepiece lens, outer barrel, inner barrel, lens mount rings

iPhone (2007 first generation) — 🟡 Medium Risk

⚠️ Use iFixit teardown photographs, NOT iPhone patent diagrams. Creative Commons licensed, show real components, far better SAM-3D segmentation.


Hero: Rodin prompt — "original iPhone 2007, front face, black glass screen, silver aluminum unibody back, single home button"
Components: iFixit iPhone 1st gen teardown photos → SAM-3D. Target: logic board, battery, camera module, speaker assembly, display assembly

Steam Engine (Watt, 1769) — 🔴 High Risk

⚠️ Run SAM-3D on individual component drawings, NOT the full cross-section. Overlapping parts confuse segmentation.


Hero: Rodin prompt — "Watt steam engine 1769, large flywheel, piston cylinder, beam arm, coal furnace, Victorian industrial"
Components: Individual part diagrams → SAM-3D per part: piston, cylinder, flywheel, beam, valve, boiler
Fallback: CGTrader pre-made steam engine models — prepare before demo day


9.3 API Calls
// Hyper3D Rodin — text to 3D hero modelconst result = await fal.subscribe("fal-ai/hyper3d-rodin", {  input: {    text: "1876 Alexander Graham Bell telephone, wooden box, iron diaphragm, brass fittings, museum quality",    geometry_file_format: "glb",    quality: "high",    condition_mode: "concat",    tier: "Regular"  }});const glbUrl = result.data.model_mesh.url;
// fal SAM-3D — image to componentconst result = await fal.subscribe("fal-ai/sam2-3d", {  input: { image_url: "https://yourserver.com/upscaled_diagram.png" }});const componentGlb = result.data.mesh_url;

9.4 Post-Processing (trimesh)
import trimesh
mesh = trimesh.load('raw_component.glb')mesh.fill_holes()mesh.fix_normals()mesh.remove_duplicate_faces()mesh.export('component_clean.glb')

9.5 Component Config JSON
{  "id": "telephone",  "heroModel": "/models/telephone/hero.glb",  "inventionDate": 1876,  "patentDate": 1876,  "commercialisationDate": 1880,  "avatarPersona": "Dr. Bell",  "origin": { "lat": 42.3601, "lng": -71.0589, "label": "Boston, Massachusetts" },  "components": [    {      "file": "diaphragm.glb",      "name": "Diaphragm",      "description": "Thin iron disc that vibrates in response to sound waves, converting acoustic energy into electrical current variations.",      "patentRef": "Bell, US174465A, Claim 1",      "offset": [0, 0.8, 0]    },    {      "file": "housing.glb",      "name": "Wooden Housing",      "description": "Encloses the electromagnet coil. Wood chosen for its non-conductive properties.",      "patentRef": "Bell, US174465A, Claim 3",      "offset": [0, -0.6, 0]    },    {      "file": "coil.glb",      "name": "Electromagnet Coil",      "description": "Converts varying electrical current back into mechanical vibration at the receiver end.",      "patentRef": "Bell, US174465A, Claim 2",      "offset": [-0.8, 0, 0]    },    {      "file": "receiver.glb",      "name": "Receiver Horn",      "description": "Directs and amplifies sound waves toward the diaphragm during transmission.",      "patentRef": "Bell, US174465A, Fig. 1",      "offset": [0.8, 0, 0]    }  ]}

10. AI Expert Avatar (ElevenLabs + Agora)
10.1 Voice Stack Decision

























ToolRoleWhyElevenLabsVoice generation — converts OpenRouter text into character-specific audioBest-in-class TTS quality; distinct voices per persona; you have accessAgoraReal-time streaming + avatar panel — audio delivery, lip sync, floating UILow latency; provides the visual floating head that makes the avatar feel presentOpenRouterReasoning — generates text response grounded in patent contextDynamic context injection per invention and per selected component
Fallback: If Agora is too time-consuming under hackathon pressure, ElevenLabs alone with an HTML <audio> element still delivers high-quality voiced responses — just without the lip-synced face. Voice quality matters more than the face.

10.2 Avatar Personas






























InventionPersonaVoice StyleTelephoneDr. Alexander BellWarm, Scottish-accented, Victorian academiciPhoneJony (design lead)Calm, precise, focused on elegance of formSteam EngineMr. James WattPractical, gruff, northern English, engineering-mindedGalilean TelescopeProfessor GalileoPassionate, Italian-accented, wonder-driven

10.3 System Prompt Structure
Three layers injected at runtime:
Layer 1 — Base persona
You are {persona.name}, explaining {invention.name} to a curious student.
Use plain language — no legal terms, no jargon.
Be enthusiastic but precise. Keep answers under 3 sentences unless asked for more.
Never say "patent claim" — translate everything to plain English.

Layer 2 — Invention context (from component config JSON)
You are explaining the {invention.name}, invented in {invention.year} in {invention.origin}.
Key insight: {invention.summary}
How it works: {invention.howItWorks}
Why it mattered: {invention.impact}

Layer 3 — Current component (injected on component selection)
The user is currently looking at the {component.name}.
What it does: {component.description}
Source: {component.patentRef}
Reference this component specifically in your next response.


10.4 ElevenLabs Integration
async function speakResponse(text, personaVoiceId) {  const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + personaVoiceId, {    method: 'POST',    headers: {      'xi-api-key': process.env.ELEVENLABS_API_KEY,      'Content-Type': 'application/json'    },    body: JSON.stringify({      text,      model_id: 'eleven_turbo_v2',  // lowest latency model      voice_settings: { stability: 0.5, similarity_boost: 0.75 }    })  });  const audioBlob = await response.blob();  new Audio(URL.createObjectURL(audioBlob)).play();}

10.5 Interaction Flow

On entering viewer: avatar auto-plays a 30–45 second intro (pre-generated ElevenLabs audio, served as static file — no live API call on entry)
After intro: avatar enters listening state, subtle pulsing glow on panel border
User speaks or types: OpenRouter generates response with 3-layer context → ElevenLabs voices it → Agora streams it
Component selected via gesture: avatar automatically says "You've selected the [component name]. [one-line description]."


11. Exa.ai Semantic Search Integration
11.1 Why Exa Replaces OpenRouter NLP Parsing




















ApproachHow it worksQualityOpenRouter NLP parsingLLM extracts region/category/era from query textGood for structured extraction, no retrievalExa.ai neural searchSemantic vector search across invention/patent sourcesBetter intent understanding, returns real matching documents
The demo moment this enables: Typing "optical instruments Renaissance Italy" → Exa returns Galileo's telescope → globe flies to Padua and the marker lights up. A live, real-time discovery moment judges will remember.

11.2 Integration Architecture
User types query
    → Exa.ai neural search (patent/invention domains)
    → Returns top 5 matching documents with metadata
    → OpenRouter extracts { inventionId, lat, lng } from Exa results
    → Cesium globe flyTo location + highlights marker
    → Side panel populates with matched invention


11.3 Implementation
import Exa from 'exa-js';const exa = new Exa(process.env.EXA_API_KEY);
async function searchInventions(query) {  const results = await exa.search(query, {    type: 'neural',    numResults: 5,    includeDomains: ['patents.google.com', 'lens.org', 'espacenet.com', 'en.wikipedia.org'],    useAutoprompt: true  });  return results.results;}
async function handleSearch(query) {  const exaResults = await searchInventions(query);  const structured = await extractStructuredData(exaResults, query);  // structured = { inventionId, lat, lng, regionName }
  viewer.camera.flyTo({    destination: Cesium.Cartesian3.fromDegrees(structured.lng, structured.lat, 800000),    duration: 2.0  });  highlightMarker(structured.inventionId);}
async function extractStructuredData(exaResults, originalQuery) {  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {    method: 'POST',    headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },    body: JSON.stringify({      model: 'anthropic/claude-3-5-sonnet',      messages: [{        role: 'user',        content: `Query: "${originalQuery}"Results: ${JSON.stringify(exaResults.map(r => r.title + ': ' + r.url))}
Return ONLY JSON: { "inventionId": "telephone|iphone|engine|telescope|null", "lat": number, "lng": number, "regionName": string }`      }],      response_format: { type: 'json_object' }    })  });  const data = await response.json();  return JSON.parse(data.choices[0].message.content);}

11.4 Demo Search Queries to Pre-Test

























QueryExpected Globe Action"optical instruments Renaissance Italy"Fly to Padua → highlight telescope"voice transmission electricity 1870s"Fly to Boston → highlight telephone"steam power industrial revolution England"Fly to Birmingham → highlight engine"touchscreen smartphone California"Fly to Cupertino → highlight iPhone
Test all 4 queries and confirm correct globe actions before hackathon day.

12. Data Sources & Content
12.1 Patent Data Sources








































SourceUseLicenseUSPTO Open Data PortalFull patent text, diagrams, filing metadataPublic domainGoogle Patents Public Data (BigQuery)Bulk metadata, classification, citation dataFree with Google accountLens.org APIOpen access papers, cross-jurisdiction searchFree tier availableiFixit Teardown LibraryComponent photos for iPhoneCreative Commons BY-NC-SAPoly Haven3D textures and HDRIs for model realismCC0 — fully freeCGTraderPre-made fallback models (steam engine)Per-asset licence
12.2 Curated Invention Dataset













































InventionYearInventorOriginPatent RefCategoryTelephone1876Alexander Graham BellEdinburgh / BostonUS174465ACommunicationsiPhone2007Steve Jobs / Apple Inc.Cupertino, CaliforniaUS7966578B2Consumer ElectronicsSteam Engine1769James WattBirmingham, EnglandGB913A/1769Mechanical EngineeringGalilean Telescope1609Galileo GalileiVenice / Padua, ItalyPre-patent eraOptics / Astronomy
12.3 Globe Marker Coordinates



































InventionLatitudeLongitudeLabelTelephone42.3601−71.0589Boston, MassachusettsiPhone37.3318−122.0312Cupertino, CaliforniaSteam Engine52.4862−1.8904Birmingham, EnglandGalilean Telescope45.406411.8768Padua, Italy

13. Full Technical Stack









































































































LayerTechnologyVersion / NotesGlobe RendererCesiumJSv1.114+, with Google 3D Tiles API keyGlobe TilesGoogle Photorealistic 3D Tiles~0.40totalcost,within0.40 total cost, within 0.40totalcost,within200 free tierGlobe BoundariesOpenStreetMap vector tilesCountry + district boundariesTemporal NavigationCustom Temporos engineCesium date-range entity filter + rippleSemantic SearchExa.aiNeural search, exa-js SDK3D Model RendererThree.jsr162+, GLTFLoader + OrbitControlsGesture DetectionMediaPipe Handsv0.4, 21-landmark model, complexity 1Webcam CaptureBrowser getUserMedia()1280×720, desktop onlyImage UpscalingNano BananaVia API3D Segmentationfal.ai SAM-3Dfal-ai/sam2-3d endpoint3D GenerationHyper3D Rodin (fal.ai)fal-ai/hyper3d-rodin, GLB outputMesh Cleanuptrimesh (Python)fill_holes, fix_normals, export GLBAvatar VoiceElevenLabseleven_turbo_v2, per-persona voice IDAvatar StreamingAgora Conversational AIReal-time delivery + lip syncLLM ReasoningOpenRouteranthropic/claude-3-5-sonnetDatabaseSupabase (Postgres)Invention metadata + component configsFrontendReact + ViteOr vanilla JS for hackathon speedStylingTailwind CSSDark mode default, #2563EB accentHostingVercel + SupabaseFree tier sufficient

14. Hackathon Build Plan

⚠️ Pre-generate ALL GLB models before the hackathon starts. Rodin takes 30–60 seconds per model. Never do live AI generation during a demo — network latency will kill the moment.

Pre-Hackathon: Asset & Search Preparation

 Run Nano Banana on all source patent diagrams and iFixit photos
 Generate hero.glb for each invention via Hyper3D Rodin (iterate prompts until quality is acceptable)
 Generate component GLBs for each invention via fal SAM-3D
 Run trimesh cleanup pipeline on all outputs
 Test all GLBs load correctly in Three.js
 Author component JSON config files for all 4 inventions
 Pre-generate ElevenLabs avatar introduction audio files (static, served at runtime)
 Test all 4 Exa search demo queries — confirm globe actions work correctly
 Prepare CGTrader fallback models for steam engine components
 Set Google 3D Tiles API billing cap at $5

Day 1 — Core 3D Viewer

 Set up Three.js scene with transparent background + webcam layer
 Load telephone/hero.glb, confirm holographic overlay renders correctly
 Implement OrbitControls as mouse fallback
 Implement exploded view with hardcoded offsets — telephone first
 Add glow ring (#2563EB, opacity 0.4)
 Add keyboard fallbacks: E explode, A assemble

Day 2 — MediaPipe + Globe + Exa

 Integrate MediaPipe Hands — confirm 21-landmark tracking in console
 Wire open palm → explode, closed fist → assemble, wrist → rotation
 Add pinch scale + full keyboard fallback suite
 Set up CesiumJS globe with 4 hardcoded invention markers
 Implement Temporos slider + ripple animation
 Integrate Exa.ai search → OpenRouter extraction → globe flyTo

Day 3 — Avatar + Integration + Polish

 Integrate ElevenLabs TTS for voiced avatar responses
 Integrate Agora for streaming avatar panel
 Wire OpenRouter 3-layer context prompt per invention + component
 Connect globe marker click → load correct invention in viewer
 Add component label HTML overlays
 Dark mode polish: consistent #2563EB accent, cinematic globe→viewer transition
 End-to-end rehearsal × 10: full 90-second demo flow on demo laptop

Demo Day — 90-Second Script























































TimePresenter ActionWhat Judges See0:00–0:05"Understanding a patent means reading 40 pages of legal text. We think it should feel like this."Problem framing0:05–0:20Type "voice transmission electricity 1870s" into search barExa returns result, globe flies to Boston, telephone marker lights up0:20–0:30Scrub Temporos slider 1600 → 2007Markers appear across history, ripple on commercialisation dates0:30–0:35Click telephone marker → side panel → "Enter Holographic Viewer"Cinematic fade transition to webcam view0:35–0:50Raise open palm → explosionThe wow moment — 3D telephone disassembles in mid-air with floating labels0:50–1:05Point at diaphragm → avatar (Dr. Bell) explainsElevenLabs voice: "The diaphragm converts sound waves into electrical current…"1:05–1:15Close fist → reassembleModel snaps back together1:15–1:25Return to globe, gesture at iPhone/Engine/Telescope markersFull product scope visible to judges1:25–1:30"Four inventions today. One hundred million patents in the database. Same pipeline."Scalability close

15. Risks & Mitigations





















































RiskLikelihoodImpactMitigationEngine component SAM-3D quality insufficientHighMediumCGTrader pre-made fallback models prepared in advanceMediaPipe palm detection misfires under demo room lightingMediumHigh3-frame debounce + on-screen gesture confidence HUD + full keyboard fallback suiteWebcam permission blocked by venue OS/browserLowHighTest on demo laptop 24hrs before. Pre-recorded background video as fallbackAgora avatar latency too high under venue WiFiMediumMediumPre-record intro audio as static file. ElevenLabs-only fallback ready. Use mobile hotspotExa search returns no match for demo queryLowMediumPre-test all 4 queries. Hardcode globe action as fallback if Exa failsGoogle 3D Tiles API quota exceededVery LowMedium$5 billing cap set. OSM-only globe as instant fallbackRodin GLB quality insufficient for hero modelMediumLowMultiple prompt iterations pre-hackathon. CGTrader fallback per invention

16. Post-Hackathon Roadmap






























PhaseFocusKey DeliverablesPhase 2Scale content50 curated inventions, automated patent→3D pipeline, Elasticsearch full-text indexPhase 3Educator toolsTeacher classroom mode, shareable lesson links, curriculum tagging, school licensingPhase 4Invention lineageTemporal graph: telescope → microscope → biology → CRISPR — show how inventions causally connectPhase 5CommunityUser-submitted inventions, community globe layer for makers and researchers
Monetisation: Educational freemium (free for students/teachers) + institutional licensing for schools and museums.
The ceiling: The USPTO database contains 10 million+ patents. Every one is a candidate for the pipeline. The prototype demonstrates the system works. The roadmap is a matter of compute and curation, not technical feasibility.

INVENTRA | Interactive Invention Explorer | Hackathon PRD v2.0 | Confidential