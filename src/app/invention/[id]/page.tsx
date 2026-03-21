"use client";

import { ChatPanel } from "@/components/expert/ChatPanel";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ComponentInfo } from "@/components/viewer/ComponentInfo";
import ModelViewer from "@/components/viewer/ModelViewer";
import { ViewerControls } from "@/components/viewer/ViewerControls";
import { Badge } from "@/components/ui/Badge";
import { getComponentsByInventionId } from "@/data/invention-components";
import { getInventionById } from "@/data/inventions";
import { useExpert } from "@/hooks/useExpert";
import { useGestureControls } from "@/hooks/useGestureControls";
import { useVoiceSession } from "@/hooks/useVoiceSession";
import {
  DEFAULT_VIEWER_TRANSFORM,
  applySmoothedRotation,
} from "@/lib/gesture-controls";
import type { ExpertAction, TranscriptDelivery, ViewerTransform } from "@/types";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

type HighlightMap = Record<string, { color?: string; mode?: "glow" | "pulse" }>;
type BeamEffect = {
  id: string;
  fromComponentId: string;
  toComponentId: string;
  color?: string;
  thickness?: number;
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/* Map invention IDs to image file names in /public/inventions/ */
const INVENTION_IMAGES: Record<string, string> = {
  "light-bulb": "/inventions/light-bulb.png",
  "telephone": "/inventions/telephone.png",
  "printing-press": "/inventions/printing-press.png",
  "steam-engine": "/inventions/steam-engine.png",
  "compass": "/inventions/compass.png",
  "wright-flyer": "/inventions/wright-flyer.png",
  "tesla-coil": "/inventions/tesla-coil.png",
  "gunpowder": "/inventions/gunpowder.png",
  "iphone": "/inventions/iphone.png",
  "penicillin": "/inventions/penicillin.png",
  "dna-structure": "/inventions/dna-structure.png",
  "solar-cell": "/inventions/solar-cell.png",
  "crispr": "/inventions/crispr.png",
  "transistor": "/inventions/transistor.png",
  "world-wide-web": "/inventions/world-wide-web.png",
  "jet-engine": "/inventions/jet-engine.png",
  "dynamite": "/inventions/dynamite.png",
  "mrna-vaccine": "/inventions/mrna-vaccine.svg",
  "lithium-ion-battery": "/inventions/lithium-ion-battery.svg",
  "bullet-train": "/inventions/bullet-train.svg",
  "carbon-fiber": "/inventions/carbon-fiber.svg",
  "radio": "/inventions/radio.svg",
  "integrated-circuit": "/inventions/integrated-circuit.svg",
  "automobile": "/inventions/automobile.svg",
  "kevlar": "/inventions/kevlar.svg",
};

import Image from "next/image";

export default function InventionDetailPage() {
  const params = useParams<{ id: string }>();
  const inventionId = params.id;
  const invention = getInventionById(inventionId);

  if (!invention) {
    notFound();
  }

  const imageSrc = INVENTION_IMAGES[invention.id];
  const [isExploded, setIsExploded] = useState(false);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [componentSelectionNonce, setComponentSelectionNonce] = useState(0);
  const [highlightMap, setHighlightMap] = useState<HighlightMap>({});
  const [beamEffect, setBeamEffect] = useState<BeamEffect | null>(null);
  const [gestureEnabled, setGestureEnabled] = useState(false);
  const [viewerTransform, setViewerTransform] = useState<ViewerTransform>(
    DEFAULT_VIEWER_TRANSFORM,
  );
  const timeoutsRef = useRef<number[]>([]);
  const componentSelectionNonceRef = useRef(0);

  const componentIdSet = useMemo(
    () => new Set(getComponentsByInventionId(invention.id).map((comp) => comp.id)),
    [invention.id],
  );
  const [voiceSessionId, setVoiceSessionId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeoutsRef.current = [];
    };
  }, []);

  const handleComponentSelect = useCallback((componentId: string | null) => {
    if (!componentId) {
      setSelectedComponentId(null);
      return null;
    }

    const nextNonce = componentSelectionNonceRef.current + 1;
    componentSelectionNonceRef.current = nextNonce;
    setSelectedComponentId(componentId);
    setComponentSelectionNonce(nextNonce);
    return nextNonce;
  }, []);

  const handleViewerReset = useCallback(() => {
    setIsExploded(false);
    handleComponentSelect(null);
    setHighlightMap({});
    setBeamEffect(null);
    setViewerTransform(DEFAULT_VIEWER_TRANSFORM);
  }, [handleComponentSelect]);

  const handleExpertActions = useCallback(
    (actions: ExpertAction[]) => {
      if (!invention.hasModel) return;

      actions.forEach((action) => {
        if (action.type === "highlight") {
          const ids = action.componentIds.filter((id) => componentIdSet.has(id));
          if (ids.length === 0) return;
          setHighlightMap((prev) => {
            const next = { ...prev };
            ids.forEach((id) => {
              next[id] = { color: action.color, mode: action.mode };
            });
            return next;
          });
          const duration = action.durationMs ?? 3500;
          if (duration > 0) {
            const timeoutId = window.setTimeout(() => {
              setHighlightMap((prev) => {
                const next = { ...prev };
                ids.forEach((id) => delete next[id]);
                return next;
              });
            }, duration);
            timeoutsRef.current.push(timeoutId);
          }
          return;
        }

        if (action.type === "select") {
          if (!componentIdSet.has(action.componentId)) return;
          const selectionNonce = handleComponentSelect(action.componentId);
          if (action.durationMs && action.durationMs > 0) {
            const timeoutId = window.setTimeout(() => {
              if (selectionNonce === componentSelectionNonceRef.current) {
                setSelectedComponentId((current) =>
                  current === action.componentId ? null : current,
                );
              }
            }, action.durationMs);
            timeoutsRef.current.push(timeoutId);
          }
          return;
        }

        if (action.type === "explode") {
          setIsExploded(true);
          return;
        }

        if (action.type === "assemble") {
          setIsExploded(false);
          return;
        }

        if (action.type === "reset") {
          handleViewerReset();
          return;
        }

        if (action.type === "beam") {
          if (!componentIdSet.has(action.fromComponentId) || !componentIdSet.has(action.toComponentId)) {
            return;
          }
          const beamId = uid();
          setBeamEffect({
            id: beamId,
            fromComponentId: action.fromComponentId,
            toComponentId: action.toComponentId,
            color: action.color,
            thickness: action.thickness,
          });
          const duration = action.durationMs ?? 2000;
          if (duration > 0) {
            const timeoutId = window.setTimeout(() => {
              setBeamEffect((current) => (current?.id === beamId ? null : current));
            }, duration);
            timeoutsRef.current.push(timeoutId);
          }
        }
      });
    },
    [componentIdSet, handleComponentSelect, handleViewerReset, invention.hasModel],
  );

  const {
    appendServerMessages,
    messages,
    isLoading,
    isSpeaking,
    sendMessage,
    suggestedQuestions,
  } = useExpert({
    inventionId: invention.id,
    componentId: selectedComponentId,
    viewerState: { isExploded, highlightedComponentIds: Object.keys(highlightMap) },
    activeVoiceSessionId: voiceSessionId,
    onActions: handleExpertActions,
  });

  const voice = useVoiceSession({
    inventionId: invention.id,
    componentId: selectedComponentId,
    onMessages: appendServerMessages,
    onActions: handleExpertActions,
  });

  useEffect(() => {
    setVoiceSessionId(voice.sessionId);
  }, [voice.sessionId]);

  const gestureControls = useGestureControls({
    enabled: invention.hasModel && gestureEnabled,
    onAssemble: () => setIsExploded(false),
    onExplode: () => setIsExploded(true),
    onRotate: (delta) => {
      setViewerTransform((current) => applySmoothedRotation(current, delta));
    },
  });

  const handleConversationTurn = useCallback(
    async (content: string, options?: { delivery?: TranscriptDelivery }) =>
      sendMessage(content, options),
    [sendMessage],
  );

  return (
    <main className="flex h-screen flex-col bg-[#05060b]">
      <header className="flex items-center justify-between border-b border-white/5 bg-black/40 px-6 py-4 backdrop-blur-xl">
        <Link
          href="/"
          className="group inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--accent-gold-light)] opacity-70 transition-all hover:opacity-100"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
          Return to Universe
        </Link>
        <div className="text-center">
          <h1 className="text-lg font-bold tracking-tight text-white" style={{ fontFamily: "var(--font-playfair), serif" }}>
            {invention.title} <span className="opacity-40 font-serif italic text-sm">c. {invention.year}</span>
          </h1>
        </div>
        <Badge category={invention.category} />
      </header>

      <section className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="relative flex-1 overflow-hidden bg-[radial-gradient(circle_at_center,_#111428_0%,_#05060b_100%)] lg:flex-[2]">
          {invention.hasModel ? (
            <>
              <ErrorBoundary>
                <ModelViewer
                  inventionId={invention.id}
                  isExploded={isExploded}
                  viewerTransform={viewerTransform}
                  gestureTrackingActive={gestureControls.status === "tracking"}
                  selectedComponentId={selectedComponentId}
                  highlightMap={highlightMap}
                  beamEffect={beamEffect}
                  onComponentSelect={handleComponentSelect}
                />
              </ErrorBoundary>

              {/* Overlay Info Panel for Model View */}
              <div className="pointer-events-none absolute bottom-8 left-8 z-10 max-w-sm">
                <div className="pointer-events-auto rounded-3xl border border-white/10 bg-black/40 p-6 shadow-2xl backdrop-blur-2xl transition-all hover:bg-black/50 ring-1 ring-white/5">
                  <div className="mb-3 flex items-center gap-3">
                    <Badge category={invention.category} />
                    <span className="text-[10px] font-bold text-[var(--accent-gold)] uppercase tracking-[0.2em]">{invention.year} AD</span>
                  </div>
                  <h2 className="mb-3 text-3xl font-bold tracking-tight text-white" style={{ fontFamily: "var(--font-playfair), serif" }}>{invention.title}</h2>
                  <div className="line-clamp-3 text-sm leading-relaxed text-gray-300 transition-all hover:line-clamp-none">
                    <ReactMarkdown components={{ p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p> }}>
                      {invention.description}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>

              <ViewerControls
                gestureDebugFrame={gestureControls.debugFrame}
                gestureEnabled={gestureEnabled}
                gestureError={gestureControls.error}
                gestureStatus={gestureControls.status}
                gestureVideoRef={gestureControls.videoRef}
                isExploded={isExploded}
                onToggleGestures={() => setGestureEnabled((current) => !current)}
                onToggleExplode={() => setIsExploded((prev) => !prev)}
                onReset={handleViewerReset}
              />
              {selectedComponentId && (
                <ComponentInfo
                  key={`${selectedComponentId}-${componentSelectionNonce}`}
                  componentId={selectedComponentId}
                  onClose={() => handleComponentSelect(null)}
                />
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center p-8 overflow-y-auto scrollbar-hide">
              <div className="max-w-3xl rounded-[2.5rem] border border-[var(--border-gold)]/20 bg-[#0a0b14]/90 p-12 shadow-2xl backdrop-blur-3xl ring-1 ring-white/5 animate-in fade-in zoom-in-95 duration-700">
                {/* Visual Archive in Detail View */}
                {imageSrc && (
                  <div className="relative mb-10 aspect-[21/9] w-full overflow-hidden rounded-3xl border border-[var(--border-gold)]/30 bg-black/40 shadow-2xl">
                    <Image
                      src={imageSrc}
                      alt={invention.title}
                      fill
                      className="object-cover opacity-80 brightness-75 transition-all duration-700 hover:scale-105 hover:opacity-100 hover:brightness-100"
                      priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute bottom-5 left-6 flex items-center gap-2">
                       <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--accent-gold)] drop-shadow-lg">Visual Archive</span>
                    </div>
                  </div>
                )}

                <div className="mb-10 flex flex-col items-center text-center">
                  <Badge category={invention.category} className="mb-5 px-4" />
                  <h2 className="mb-4 text-5xl font-bold tracking-tight text-white sm:text-6xl" style={{ fontFamily: "var(--font-playfair), serif" }}>
                    {invention.title}
                  </h2>
                  <div className="h-[2px] w-24 bg-gradient-to-r from-transparent via-[var(--accent-gold)] to-transparent opacity-60" />
                </div>
                
                <div className="prose prose-invert max-w-none">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => (
                        <p className="text-lg leading-relaxed text-gray-200 antialiased first-letter:float-left first-letter:mr-3 first-letter:text-6xl first-letter:font-bold first-letter:text-[var(--accent-gold)] first-letter:font-serif first-letter:leading-[1] mb-8 last:mb-0">
                          {children}
                        </p>
                      )
                    }}
                  >
                    {invention.description}
                  </ReactMarkdown>
                </div>

                <div className="mt-12 grid grid-cols-2 gap-8 border-t border-white/10 pt-10">
                  <div className="group transition-all">
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-gold-light)] opacity-60 group-hover:opacity-100 transition-opacity">Invention Date</h4>
                    <p className="text-2xl font-bold text-white tracking-widest">{invention.year} AD</p>
                  </div>
                  <div className="group transition-all">
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-gold-light)] opacity-60 group-hover:opacity-100 transition-opacity">Primary Archivist</h4>
                    <p className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-playfair), serif" }}>{invention.inventors[0]}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <aside className="h-[40vh] border-t border-white/5 bg-black/40 shadow-2xl backdrop-blur-md lg:h-full lg:w-[420px] lg:border-l lg:border-t-0">

          <ChatPanel
            messages={messages}
            isLoading={isLoading}
            isSpeaking={isSpeaking}
            suggestedQuestions={suggestedQuestions}
            voiceStatus={voice.status}
            voiceError={voice.error}
            voiceMuted={voice.isMuted}
            voicePartialTranscript={voice.partialTranscript}
            onSendMessage={handleConversationTurn}
            onToggleVoiceConnection={voice.toggleConnection}
            onToggleVoiceMute={voice.toggleMute}
          />
        </aside>
      </section>
    </main>
  );
}
