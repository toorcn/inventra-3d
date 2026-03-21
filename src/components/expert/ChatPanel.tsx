"use client";

import { ExpertAvatar } from "./ExpertAvatar";
import { MessageBubble } from "./MessageBubble";
import { SuggestedQuestions } from "./SuggestedQuestions";
import type { ChatMessage, TranscriptDelivery } from "@/types";
import { LoaderCircle, Mic, MicOff, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ChatPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
  isSpeaking: boolean;
  suggestedQuestions: string[];
  isVoiceActive: boolean;
  isVoiceConnecting: boolean;
  voiceError: string | null;
  onSendMessage: (content: string, options?: { delivery?: TranscriptDelivery }) => void;
  onStartVoice: () => void;
  onStopVoice: () => void;
}

export function ChatPanel({
  messages,
  isLoading,
  isSpeaking,
  suggestedQuestions,
  isVoiceActive,
  isVoiceConnecting,
  voiceError,
  onSendMessage,
  onStartVoice,
  onStopVoice,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    onSendMessage(text, { delivery: "typed" });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
        <ExpertAvatar isSpeaking={isSpeaking || isVoiceConnecting || isVoiceActive} />
        <div>
          <h3 className="text-sm font-semibold text-white">AI Expert</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            {isVoiceActive
              ? "Voice room live"
              : isVoiceConnecting
                ? "Joining Agora voice..."
                : isSpeaking
                  ? "Thinking..."
                  : "Ask me anything"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (isVoiceActive || isVoiceConnecting) {
              onStopVoice();
              return;
            }
            onStartVoice();
          }}
          disabled={isVoiceConnecting}
          className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-50"
        >
          {isVoiceConnecting ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : isVoiceActive ? (
            <MicOff className="size-4" />
          ) : (
            <Mic className="size-4" />
          )}
          {isVoiceActive ? "Stop voice" : "Start voice"}
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-3">
          {voiceError && (
            <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
              Voice mode could not start: {voiceError}
            </div>
          )}
          {isVoiceActive && (
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-xs text-cyan-100">
              Live voice mode is active. Spoken exchanges and typed follow-ups share the same transcript.
            </div>
          )}
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
        onSelect={(q) => {
          setInput("");
          onSendMessage(q, { delivery: "typed" });
        }}
      />

      <div className="border-t border-white/5 p-3">
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a question..."
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[var(--text-secondary)]"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="rounded-full p-1.5 text-blue-400 transition-colors hover:bg-blue-500/20 disabled:opacity-40"
          >
            <Send className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
