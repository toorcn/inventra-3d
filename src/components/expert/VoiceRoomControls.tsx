"use client";

import { Mic, MicOff, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";

type VoiceRoomStatus = "connecting" | "live" | "error";

interface VoiceRoomControlsProps {
  status: VoiceRoomStatus;
  isTranscriptOpen: boolean;
  isMuted: boolean;
  voiceError: string | null;
  onToggleTranscript: () => void;
  onToggleMute: () => void;
  onStopVoice: () => void;
}

export function VoiceRoomControls({
  status,
  isTranscriptOpen,
  isMuted,
  voiceError,
  onToggleTranscript,
  onToggleMute,
  onStopVoice,
}: VoiceRoomControlsProps) {
  const title =
    status === "error" ? "Voice room error" : status === "connecting" ? "Joining voice room" : "Live voice room";
  const body =
    status === "error"
      ? voiceError ?? "The voice room could not start."
      : status === "connecting"
        ? "Connecting Agora to the 3D room."
        : "The model stays centered while the call runs beside it.";

  return (
    <div className="pointer-events-auto absolute right-4 top-4 z-20 w-[min(100%,22rem)] rounded-[1.75rem] border border-cyan-400/15 bg-black/55 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl ring-1 ring-white/5">
      <div className="flex items-start gap-3">
        <div
          className={`mt-1 size-3 rounded-full ${
            status === "connecting" ? "animate-pulse bg-amber-400" : status === "error" ? "bg-rose-400" : "bg-cyan-400"
          }`}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-300">
            {title}
          </p>
          <p className="mt-1 text-sm leading-6 text-white/80">{body}</p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 p-2 text-white/80">
          {status === "error" ? <X className="size-4" /> : <Mic className="size-4" />}
        </div>
      </div>

      {voiceError && (
        <div className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-50">
          {voiceError}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {status === "live" && (
          <button
            type="button"
            onClick={onToggleMute}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-white/10"
          >
            {isMuted ? <Mic className="size-4" /> : <MicOff className="size-4" />}
            {isMuted ? "Unmute mic" : "Mute mic"}
          </button>
        )}
        <button
          type="button"
          onClick={onToggleTranscript}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-white/10"
        >
          {isTranscriptOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
          {isTranscriptOpen ? "Hide transcript" : "Open transcript"}
        </button>
        <button
          type="button"
          onClick={onStopVoice}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-white/10"
        >
          <X className="size-4" />
          Leave call
        </button>
      </div>
    </div>
  );
}
