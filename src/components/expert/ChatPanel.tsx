"use client";

import { ExpertAvatar } from "./ExpertAvatar";
import { MessageBubble } from "./MessageBubble";
import { SuggestedQuestions } from "./SuggestedQuestions";
import type { ChatMessage, ChatResponse, TranscriptDelivery } from "@/types";
import type { VoiceStatus } from "@/hooks/useVoiceSession";
import { LoaderCircle, Mic, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ChatPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
  isSpeaking: boolean;
  suggestedQuestions: string[];
  voiceStatus: VoiceStatus;
  voiceError: string | null;
  onSendMessage: (content: string, options?: { delivery?: TranscriptDelivery }) => Promise<ChatResponse>;
  onToggleRecording: () => void;
}

export function ChatPanel({
  messages,
  isLoading,
  isSpeaking,
  suggestedQuestions,
  voiceStatus,
  voiceError,
  onSendMessage,
  onToggleRecording,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isVoiceRecording = voiceStatus === "recording";
  const isVoiceTranscribing = voiceStatus === "transcribing";
  const isVoiceSpeaking = voiceStatus === "speaking";
  const isVoiceBusy = isVoiceRecording || isVoiceTranscribing || isVoiceSpeaking;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading || isVoiceBusy) return;
    setInput("");
    void onSendMessage(text, { delivery: "typed" });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
        <ExpertAvatar isSpeaking={isSpeaking || isVoiceRecording || isVoiceTranscribing || isVoiceSpeaking} />
        <div>
          <h3 className="text-sm font-semibold text-white">AI Expert</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            {isVoiceRecording
              ? "Recording one spoken turn..."
              : isVoiceTranscribing
                ? "Transcribing and answering..."
                : isVoiceSpeaking
                  ? "Playing the answer..."
                  : isSpeaking
                    ? "Thinking..."
                    : "Tap Speak to ask by voice, or type below."}
          </p>
        </div>
        <div className="ml-auto">
          <button
            type="button"
            onClick={onToggleRecording}
            disabled={isLoading || isVoiceTranscribing || isVoiceSpeaking}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            {isVoiceTranscribing || isVoiceSpeaking ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Mic className="size-4" />
            )}
            {isVoiceRecording
              ? "Stop turn"
              : isVoiceTranscribing
                ? "Transcribing..."
                : isVoiceSpeaking
                  ? "Playing..."
                  : "Speak"}
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-3">
          {voiceError && (
            <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
              Voice mode issue: {voiceError}
            </div>
          )}
          {isVoiceRecording || isVoiceTranscribing || isVoiceSpeaking ? (
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-xs text-cyan-100">
              Voice input is active. Spoken turns and typed follow-ups share the same transcript.
            </div>
          ) : null}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md border border-white/5 bg-white/[0.06] px-4 py-2.5 text-sm text-gray-400">
                <span className="inline-flex gap-1">
                  <span className="animate-bounce">.</span>
                  <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>
                    .
                  </span>
                  <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>
                    .
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <SuggestedQuestions
        questions={suggestedQuestions}
        disabled={isLoading || isVoiceBusy}
        onSelect={(q) => {
          setInput("");
          void onSendMessage(q, { delivery: "typed" });
        }}
      />

      <div className="border-t border-white/5 p-3">
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a question..."
            disabled={isLoading || isVoiceBusy}
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[var(--text-secondary)]"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || isVoiceBusy}
            className="rounded-full p-1.5 text-blue-400 transition-colors hover:bg-blue-500/20 disabled:opacity-40"
          >
            <Send className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
