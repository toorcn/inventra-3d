"use client";

import { ExpertAvatar } from "./ExpertAvatar";
import { MessageBubble } from "./MessageBubble";
import { SuggestedQuestions } from "./SuggestedQuestions";
import type { ChatMessage, ChatResponse, TranscriptDelivery } from "@/types";
import type { VoiceStatus } from "@/hooks/useVoiceSession";
import { LoaderCircle, Mic, MicOff, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ChatPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
  isSpeaking: boolean;
  suggestedQuestions: string[];
  voiceStatus: VoiceStatus;
  voiceError: string | null;
  voiceMuted: boolean;
  voicePartialTranscript: string | null;
  onSendMessage: (content: string, options?: { delivery?: TranscriptDelivery }) => Promise<ChatResponse>;
  onToggleVoiceConnection: () => void;
  onToggleVoiceMute: () => void;
}

export function ChatPanel({
  messages,
  isLoading,
  isSpeaking,
  suggestedQuestions,
  voiceStatus,
  voiceError,
  voiceMuted,
  voicePartialTranscript,
  onSendMessage,
  onToggleVoiceConnection,
  onToggleVoiceMute,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isVoiceConnecting = voiceStatus === "connecting";
  const isVoiceDisconnecting = voiceStatus === "disconnecting";
  const isVoiceThinking = voiceStatus === "thinking";
  const isVoiceSpeaking = voiceStatus === "speaking";
  const isVoiceListening = voiceStatus === "listening" || voiceStatus === "connected";
  const isVoiceConnected = isVoiceListening || isVoiceThinking || isVoiceSpeaking;
  const isVoiceDisabled = voiceStatus === "disabled";
  const shouldDisableInput = isLoading || isVoiceConnecting || isVoiceDisconnecting;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || shouldDisableInput) return;
    setInput("");
    void onSendMessage(text, { delivery: "typed" });
  };

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-black/40 to-black/10">
      {/* Premium Header */}
      <div className="flex items-center gap-4 border-b border-white/5 bg-white/[0.02] px-6 py-5 backdrop-blur-md">
        <ExpertAvatar isSpeaking={isSpeaking || isVoiceThinking || isVoiceSpeaking} />
        <div>
          <h3 className="text-lg font-bold tracking-tight text-white" style={{ fontFamily: "var(--font-playfair), serif" }}>
            Discovery Archivist
          </h3>
          <div className="flex items-center gap-2">
            <span className={`size-1.5 rounded-full ${isSpeaking || isVoiceThinking || isVoiceSpeaking ? "animate-pulse bg-[var(--accent-gold)]" : "bg-white/20"}`} />
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-gold-light)] opacity-70">
              {isVoiceDisabled
                ? "Voice Offline"
                : isVoiceConnecting
                  ? "Connecting..."
                  : isVoiceDisconnecting
                    ? "Disconnecting..."
                    : isVoiceSpeaking
                      ? "Speaking..."
                      : isVoiceThinking
                        ? "Thinking..."
                        : isVoiceListening
                          ? "Listening..."
                          : isSpeaking
                            ? "Processing..."
                            : "Awaiting Inquiry"}
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {isVoiceConnected && (
            <button
              type="button"
              onClick={onToggleVoiceMute}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                voiceMuted
                  ? "border-amber-400/30 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                  : "border-white/10 bg-white/5 text-white hover:bg-white/10"
              }`}
            >
              {voiceMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
              {voiceMuted ? "Unmute" : "Mute"}
            </button>
          )}
          <button
            type="button"
            onClick={onToggleVoiceConnection}
            disabled={isVoiceDisabled || isVoiceConnecting || isVoiceDisconnecting}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            {isVoiceConnecting || isVoiceDisconnecting ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Mic className="size-4" />
            )}
            {isVoiceConnecting
              ? "Connecting..."
              : isVoiceDisconnecting
                ? "Disconnecting..."
                : isVoiceConnected
                  ? "Disconnect"
                  : isVoiceDisabled
                    ? "Unavailable"
                    : "Connect Voice"}
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 scrollbar-hide">
        <div className="flex flex-col gap-6">
          {voiceError && (
            <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
              Voice mode issue: {voiceError}
            </div>
          )}
          {isVoiceConnected ? (
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-xs text-cyan-100">
              {voicePartialTranscript?.trim()
                ? `Live transcript: ${voicePartialTranscript}`
                : "Live voice is active. Spoken turns and typed follow-ups share the same transcript."}
            </div>
          ) : null}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-none border border-white/5 bg-white/[0.03] px-5 py-3 text-sm text-[var(--accent-gold-light)]/40">
                <span className="flex items-center gap-1.5 font-mono text-xs">
                  <span className="animate-pulse">TRANSFUSING DATA</span>
                  <span className="flex gap-0.5">
                    <span className="animate-bounce" style={{ animationDelay: "0s" }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>.</span>
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-auto">
        <SuggestedQuestions
          questions={suggestedQuestions}
          disabled={shouldDisableInput}
          onSelect={(q) => {
            setInput("");
            void onSendMessage(q, { delivery: "typed" });
          }}
        />

        {/* Improved Input Area */}
        <div className="border-t border-white/5 p-4 bg-black/20">
          <div className="group relative flex items-center gap-2 transition-all">
            <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-[var(--accent-gold)]/20 to-transparent opacity-0 transition-opacity group-focus-within:opacity-100" />
            <div className="relative flex w-full items-center gap-2 rounded-xl border border-white/10 bg-[#0a0b14]/80 px-4 py-3 shadow-inner ring-offset-black transition-all group-focus-within:border-[var(--accent-gold)]/50 group-focus-within:bg-[#0a0b14]">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask the Archivist..."
                disabled={shouldDisableInput}
                className="flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-[var(--text-secondary)] placeholder:italic"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || shouldDisableInput}
                className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--accent-gold)] to-[#8a6d3b] text-black transition-all hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-20"
              >
                <Send className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
