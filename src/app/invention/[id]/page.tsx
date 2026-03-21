"use client";

import { ChatPanel } from "@/components/expert/ChatPanel";
import { VoiceRoomControls } from "@/components/expert/VoiceRoomControls";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ComponentInfo } from "@/components/viewer/ComponentInfo";
import ModelViewer from "@/components/viewer/ModelViewer";
import { ViewerControls } from "@/components/viewer/ViewerControls";
import { Badge } from "@/components/ui/Badge";
import { getComponentsByInventionId } from "@/data/invention-components";
import { getInventionById } from "@/data/inventions";
import { useAgoraVoice } from "@/hooks/useAgoraVoice";
import { useExpert } from "@/hooks/useExpert";
import type { ExpertAction } from "@/types";
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

export default function InventionDetailPage() {
  const params = useParams<{ id: string }>();
  const inventionId = params.id;
  const invention = getInventionById(inventionId);

  if (!invention) {
    notFound();
  }

  const [isExploded, setIsExploded] = useState(false);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [highlightMap, setHighlightMap] = useState<HighlightMap>({});
  const [beamEffect, setBeamEffect] = useState<BeamEffect | null>(null);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(true);
  const timeoutsRef = useRef<number[]>([]);
  const lastVoiceStatusRef = useRef<"idle" | "connecting" | "live" | "error">("idle");

  const componentIdSet = useMemo(
    () => new Set(getComponentsByInventionId(invention.id).map((comp) => comp.id)),
    [invention.id],
  );

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeoutsRef.current = [];
    };
  }, []);

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
          setSelectedComponentId(action.componentId);
          if (action.durationMs && action.durationMs > 0) {
            const timeoutId = window.setTimeout(() => {
              setSelectedComponentId((current) =>
                current === action.componentId ? null : current,
              );
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
          setIsExploded(false);
          setSelectedComponentId(null);
          setHighlightMap({});
          setBeamEffect(null);
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
    [componentIdSet, invention.hasModel],
  );

  const {
    appendMessage,
    messages,
    isLoading,
    isSpeaking,
    sendMessage,
    suggestedQuestions,
  } = useExpert({
    inventionId: invention.id,
    componentId: selectedComponentId,
    onActions: handleExpertActions,
  });

  const voice = useAgoraVoice({
    inventionId: invention.id,
    componentId: selectedComponentId,
  });

  const isVoiceRoomActive = voice.status === "connecting" || voice.status === "live";
  const shouldShowTranscriptRail = !isVoiceRoomActive || isTranscriptOpen;

  useEffect(() => {
    const previousStatus = lastVoiceStatusRef.current;

    if (voice.status === "live" && previousStatus !== "live") {
      appendMessage({
        role: "system",
        content: "Live voice room started. Spoken exchanges will stay in this transcript.",
      });
      setIsTranscriptOpen(false);
    }

    if (voice.status === "idle" && previousStatus === "live") {
      appendMessage({
        role: "system",
        content: "Live voice room ended. The transcript remains available in this session.",
      });
      setIsTranscriptOpen(true);
    }

    if (voice.status === "error" && previousStatus !== "error") {
      appendMessage({
        role: "system",
        content: voice.error
          ? `Voice room error: ${voice.error}`
          : "Voice room failed to start.",
      });
      setIsTranscriptOpen(true);
    }

    lastVoiceStatusRef.current = voice.status;
  }, [appendMessage, voice.error, voice.status]);

  const handleStartVoice = useCallback(() => {
    setIsTranscriptOpen(false);
    void voice.startVoice();
  }, [voice.startVoice]);

  const handleStopVoice = useCallback(() => {
    setIsTranscriptOpen(true);
    void voice.stopVoice();
  }, [voice.stopVoice]);

  const handleToggleTranscript = useCallback(() => {
    setIsTranscriptOpen((current) => !current);
  }, []);

  return (
    <main className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-white"
        >
          <ArrowLeft className="size-4" />
          Back to Globe
        </Link>
        <div className="text-center">
          <h1 className="text-base font-semibold text-white">
            {invention.title} ({invention.year})
          </h1>
        </div>
        <Badge category={invention.category} />
      </header>

      <section className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="relative flex-1 overflow-hidden bg-[radial-gradient(circle_at_center,_#1a1f3c_0%,_#0a0a1a_100%)]">
          {invention.hasModel ? (
            <>
              <ErrorBoundary>
                <ModelViewer
                  inventionId={invention.id}
                  isExploded={isExploded}
                  selectedComponentId={selectedComponentId}
                  highlightMap={highlightMap}
                  beamEffect={beamEffect}
                  onComponentSelect={setSelectedComponentId}
                />
              </ErrorBoundary>

              {(isVoiceRoomActive || voice.error) && (
                <VoiceRoomControls
                  status={
                    voice.status === "error"
                      ? "error"
                      : voice.status === "connecting"
                        ? "connecting"
                        : "live"
                  }
                  isTranscriptOpen={isTranscriptOpen}
                  isMuted={voice.isMuted}
                  voiceError={voice.error}
                  onToggleTranscript={handleToggleTranscript}
                  onToggleMute={() => {
                    void voice.toggleMute();
                  }}
                  onStopVoice={handleStopVoice}
                />
              )}
              
              {/* Overlay Info Panel for Model View */}
              <div className="pointer-events-none absolute bottom-6 left-6 z-10 max-w-sm">
                <div className="pointer-events-auto rounded-2xl border border-white/10 bg-black/40 p-5 backdrop-blur-xl transition-all hover:bg-black/50">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge category={invention.category} />
                    <span className="text-xs font-semibold text-blue-400/80 uppercase tracking-widest">{invention.year}</span>
                  </div>
                  <h2 className="mb-2 text-2xl font-bold tracking-tight text-white">{invention.title}</h2>
                  <div className="line-clamp-3 text-sm leading-relaxed text-gray-300 transition-all hover:line-clamp-none">
                    <ReactMarkdown components={{ p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p> }}>
                      {invention.description}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>

              <ViewerControls
                isExploded={isExploded}
                onToggleExplode={() => setIsExploded((prev) => !prev)}
                onReset={() => {
                  setIsExploded(false);
                  setSelectedComponentId(null);
                }}
              />
              {selectedComponentId && (
                <ComponentInfo
                  componentId={selectedComponentId}
                  onClose={() => setSelectedComponentId(null)}
                />
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center p-8">
              <div className="max-w-2xl rounded-[2rem] border border-white/10 bg-[var(--bg-panel)] p-10 shadow-2xl backdrop-blur-2xl ring-1 ring-white/5">
                <div className="mb-8 flex flex-col items-center text-center">
                  <Badge category={invention.category} className="mb-4" />
                  <h2 className="mb-3 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                    {invention.title}
                  </h2>
                  <div className="h-1 w-20 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500" />
                </div>
                
                <div className="prose prose-invert max-w-none">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => (
                        <p className="text-lg leading-relaxed text-gray-200 antialiased first-letter:float-left first-letter:mr-3 first-letter:text-5xl first-letter:font-bold first-letter:text-blue-400 mb-6 last:mb-0">
                          {children}
                        </p>
                      )
                    }}
                  >
                    {invention.description}
                  </ReactMarkdown>
                </div>

                <div className="mt-10 grid grid-cols-2 gap-4 border-t border-white/5 pt-8">
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Invention Date</h4>
                    <p className="text-xl font-semibold text-white">{invention.year}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">Primary Inventor</h4>
                    <p className="text-xl font-semibold text-white">{invention.inventors[0]}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {shouldShowTranscriptRail && (
          <aside className="h-[40vh] border-t border-white/5 bg-black/20 lg:h-full lg:w-[420px] lg:border-l lg:border-t-0">
              <ChatPanel
                messages={messages}
                isLoading={isLoading}
                isSpeaking={isSpeaking}
                suggestedQuestions={suggestedQuestions}
                isVoiceActive={voice.status === "live"}
                isVoiceConnecting={voice.status === "connecting"}
                isVoiceMuted={voice.isMuted}
                voiceError={voice.error}
                onSendMessage={sendMessage}
                onStartVoice={handleStartVoice}
                onToggleMute={() => {
                  void voice.toggleMute();
                }}
                onStopVoice={handleStopVoice}
              />
          </aside>
        )}
      </section>
    </main>
  );
}
