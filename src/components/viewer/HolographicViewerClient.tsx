"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { useWebcam } from "@/hooks/useWebcam";
import { useHandGestures } from "@/hooks/useHandGestures";
import { useExpert } from "@/hooks/useExpert";
import { WebcamLayer } from "./WebcamLayer";
import ComponentLabels from "./ComponentLabels";
import AvatarPanel from "./AvatarPanel";
import { getComponentsByInventionId } from "@/data/invention-components";
import type { Invention, InventionComponent } from "@/types";

interface HolographicViewerClientProps {
  invention: Invention;
  onBack: () => void;
  onComponentSelect: (component: InventionComponent | null) => void;
}

interface MeshUserData {
  originalPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  componentData: InventionComponent | null;
}

const LERP_FACTOR = 0.08;
const SCALE_MIN = 0.3;
const SCALE_MAX = 3.0;

export default function HolographicViewerClient({
  invention,
  onBack,
  onComponentSelect,
}: HolographicViewerClientProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { videoRef, isReady: webcamReady, error: webcamError } = useWebcam();
  const gestureState = useHandGestures(videoRef, webcamReady);

  // Selected component state
  const [selectedComponent, setSelectedComponent] = useState<InventionComponent | null>(null);
  const [isExploded, setIsExploded] = useState(false);

  // Expert chat hook — used for auto-announcements
  const { sendMessage: sendExpertMessage } = useExpert({
    inventionId: invention.id,
    componentId: selectedComponent?.id ?? null,
  });

  // Intro audio auto-play on mount
  useEffect(() => {
    const introPath = `/audio/intros/${invention.id}-intro.mp3`;
    const audio = new Audio(introPath);
    audio.play().catch(() => console.warn("Intro audio not available"));
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [invention.id]);

  // Auto-announce when a component is selected
  const prevComponentRef = useRef<InventionComponent | null>(null);
  useEffect(() => {
    if (
      selectedComponent &&
      selectedComponent.id !== prevComponentRef.current?.id
    ) {
      prevComponentRef.current = selectedComponent;
      sendExpertMessage(
        `You've selected the ${selectedComponent.name}. ${selectedComponent.description}`
      );
    }
    if (!selectedComponent) {
      prevComponentRef.current = null;
    }
  }, [selectedComponent, sendExpertMessage]);

  // Three.js refs
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const meshesRef = useRef<THREE.Mesh[]>([]);
  const animFrameRef = useRef<number>(0);
  const isExplodedRef = useRef(false);

  // Expose Three.js objects as state for ComponentLabels
  const [threeScene, setThreeScene] = useState<THREE.Scene | null>(null);
  const [threeCamera, setThreeCamera] = useState<THREE.PerspectiveCamera | null>(null);
  const [threeRenderer, setThreeRenderer] = useState<THREE.WebGLRenderer | null>(null);

  const components = getComponentsByInventionId(invention.id);

  // Explode / assemble helpers
  const triggerExplode = useCallback(() => {
    isExplodedRef.current = true;
    setIsExploded(true);
    meshesRef.current.forEach((mesh) => {
      const ud = mesh.userData as MeshUserData;
      ud.targetPos.copy(ud.originalPos).add(
        new THREE.Vector3(
          ud.originalPos.x * 2,
          ud.originalPos.y * 2,
          ud.originalPos.z * 2
        )
      );
    });
  }, []);

  const triggerAssemble = useCallback(() => {
    isExplodedRef.current = false;
    setIsExploded(false);
    meshesRef.current.forEach((mesh) => {
      const ud = mesh.userData as MeshUserData;
      ud.targetPos.copy(ud.originalPos);
    });
  }, []);

  // Build the Three.js scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ── Renderer ─────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });
    renderer.setClearColor(0x000000, 0);
    const { clientWidth: w, clientHeight: h } = container;
    renderer.setSize(w || 1280, h || 720);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.top = "0";
    renderer.domElement.style.left = "0";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    setThreeRenderer(renderer);

    // ── Scene & Camera ────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    setThreeScene(scene);

    const camera = new THREE.PerspectiveCamera(50, (w || 1280) / (h || 720), 0.1, 100);
    camera.position.set(0, 1, 3);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;
    setThreeCamera(camera);

    // ── Lights ────────────────────────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);

    // ── Glow Ring ─────────────────────────────────────────────────────────────
    const ringGeo = new THREE.RingGeometry(0.4, 0.5, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x2563eb,
      opacity: 0.4,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.8;
    scene.add(ring);

    // ── Model Group ───────────────────────────────────────────────────────────
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);
    modelGroupRef.current = modelGroup;

    // Build name→component map for GLB mesh matching
    const componentByName: Record<string, InventionComponent> = {};
    components.forEach((c) => {
      componentByName[c.id] = c;
      componentByName[c.name] = c;
    });

    const meshes: THREE.Mesh[] = [];

    function buildProceduralMeshes() {
      components.forEach((comp) => {
        const geo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        const color = new THREE.Color(comp.color);
        const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.3 });
        const mesh = new THREE.Mesh(geo, mat);

        const orig = new THREE.Vector3(...comp.assembledPosition);
        mesh.position.copy(orig);
        mesh.userData = {
          originalPos: orig.clone(),
          targetPos: orig.clone(),
          componentData: comp,
        } satisfies MeshUserData;

        modelGroup.add(mesh);
        meshes.push(mesh);
      });
      meshesRef.current = meshes;
    }

    // Try loading GLB; fall back to procedural on error
    const loader = new GLTFLoader();
    loader.load(
      `/models/${invention.id}/hero.glb`,
      (gltf) => {
        const loadedMeshes: THREE.Mesh[] = [];
        gltf.scene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            const compData =
              componentByName[mesh.name] ??
              componentByName[mesh.name.toLowerCase()] ??
              null;

            const orig = mesh.position.clone();
            mesh.userData = {
              originalPos: orig.clone(),
              targetPos: orig.clone(),
              componentData: compData,
            } satisfies MeshUserData;

            loadedMeshes.push(mesh);
          }
        });
        modelGroup.add(gltf.scene);
        meshesRef.current = loadedMeshes;
      },
      undefined,
      () => {
        // GLB not found — build procedural fallback
        buildProceduralMeshes();
      }
    );

    // ── Resize Handler ────────────────────────────────────────────────────────
    function handleResize() {
      if (!container) return;
      const rw = container.clientWidth;
      const rh = container.clientHeight;
      renderer.setSize(rw, rh);
      camera.aspect = rw / rh;
      camera.updateProjectionMatrix();
    }
    window.addEventListener("resize", handleResize);

    // ── Animation Loop ────────────────────────────────────────────────────────
    function animate() {
      animFrameRef.current = requestAnimationFrame(animate);

      // Lerp each mesh toward its target
      meshesRef.current.forEach((mesh) => {
        const ud = mesh.userData as MeshUserData;
        mesh.position.lerp(ud.targetPos, LERP_FACTOR);
      });

      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      setThreeScene(null);
      setThreeCamera(null);
      setThreeRenderer(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invention.id]);

  // ── Keyboard Controls ─────────────────────────────────────────────────────
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const group = modelGroupRef.current;
      if (!group) return;

      switch (e.key) {
        case "e":
        case "E":
          triggerExplode();
          break;
        case "a":
        case "A":
          triggerAssemble();
          break;
        case "+":
        case "=": {
          const next = Math.min(group.scale.x * 1.1, SCALE_MAX);
          group.scale.setScalar(next);
          break;
        }
        case "-": {
          const next = Math.max(group.scale.x * 0.9, SCALE_MIN);
          group.scale.setScalar(next);
          break;
        }
        case "ArrowLeft":
          group.rotation.y -= 0.1;
          break;
        case "ArrowRight":
          group.rotation.y += 0.1;
          break;
        case "1":
        case "2":
        case "3":
        case "4":
          window.dispatchEvent(
            new CustomEvent("switchInvention", { detail: { index: parseInt(e.key) - 1 } })
          );
          break;
        case "Escape":
          onBack();
          break;
        default:
          break;
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [triggerExplode, triggerAssemble, onBack]);

  // ── Gesture Controls ──────────────────────────────────────────────────────
  useEffect(() => {
    const model = modelGroupRef.current;
    if (!model) return;

    const { gesture, wristDeltaX, pinchDistance } = gestureState;

    // Explode / assemble on gesture
    if (gesture === "palm_open") {
      triggerExplode();
    } else if (gesture === "fist") {
      triggerAssemble();
    }

    // Rotate model based on wrist delta X
    if (wristDeltaX !== 0) {
      model.rotation.y += wristDeltaX * Math.PI * 2;
    }

    // Scale model based on pinch distance delta
    if (pinchDistance !== 0) {
      const newScale = model.scale.x * (1 + pinchDistance * 2);
      const clamped = Math.min(Math.max(newScale, SCALE_MIN), SCALE_MAX);
      model.scale.setScalar(clamped);
    }
  }, [gestureState, triggerExplode, triggerAssemble]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: "#000" }}>
      {/* Layer 1 — Webcam */}
      <WebcamLayer videoRef={videoRef} />

      {/* Layer 2 — Three.js canvas injected by useEffect */}

      {/* Layer 3 — Component Labels */}
      <ComponentLabels
        components={components}
        scene={threeScene}
        camera={threeCamera}
        renderer={threeRenderer}
        isExploded={isExploded}
        selectedComponentId={selectedComponent?.id ?? null}
        onSelect={(component) => {
          setSelectedComponent(component);
          onComponentSelect(component);
        }}
      />

      {/* Layer 4 — Avatar Panel */}
      <AvatarPanel invention={invention} selectedComponent={selectedComponent} />

      {/* Layer 5 — UI Overlays */}

      {/* Gesture confidence HUD — top-center */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs font-mono text-white/60">
        Gesture: {gestureState.gesture} ({Math.round(gestureState.confidence * 100)}%)
      </div>

      {/* Webcam error overlay */}
      {webcamError && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.75)",
            zIndex: 20,
          }}
        >
          <div style={{ textAlign: "center", color: "#fff", padding: "2rem" }}>
            <p style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>Webcam unavailable</p>
            <p style={{ fontSize: "0.875rem", color: "#94a3b8" }}>{webcamError}</p>
            <p style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.5rem" }}>
              3D model will still render — webcam feed is optional.
            </p>
          </div>
        </div>
      )}

      {/* Back button — top-left */}
      <button
        onClick={onBack}
        style={{
          position: "absolute",
          top: "1rem",
          left: "1rem",
          zIndex: 30,
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.5rem 1rem",
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: "0.5rem",
          color: "#fff",
          cursor: "pointer",
          fontSize: "0.875rem",
        }}
      >
        ← Back
      </button>

      {/* Invention info — top-right */}
      <div
        style={{
          position: "absolute",
          top: "1rem",
          right: "1rem",
          zIndex: 30,
          padding: "0.75rem 1rem",
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: "0.5rem",
          color: "#fff",
          maxWidth: "220px",
        }}
      >
        <p style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.25rem" }}>
          {invention.title}
        </p>
        <p style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{invention.year}</p>
        <p style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
          {invention.inventors.join(", ")}
        </p>
      </div>

      {/* Keyboard HUD — bottom-left */}
      <div
        style={{
          position: "absolute",
          bottom: "1rem",
          left: "1rem",
          zIndex: 30,
          padding: "0.75rem 1rem",
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: "0.5rem",
          color: "#94a3b8",
          fontFamily: "monospace",
          fontSize: "0.7rem",
          lineHeight: "1.8",
        }}
      >
        <p style={{ color: "#fff", fontWeight: 700, marginBottom: "0.25rem" }}>Controls</p>
        <p><span style={{ color: "#60a5fa" }}>E</span> — Explode</p>
        <p><span style={{ color: "#60a5fa" }}>A</span> — Assemble</p>
        <p><span style={{ color: "#60a5fa" }}>+/-</span> — Scale</p>
        <p><span style={{ color: "#60a5fa" }}>← →</span> — Rotate</p>
        <p><span style={{ color: "#60a5fa" }}>1-4</span> — Switch invention</p>
        <p><span style={{ color: "#60a5fa" }}>ESC</span> — Back</p>
      </div>
    </div>
  );
}
