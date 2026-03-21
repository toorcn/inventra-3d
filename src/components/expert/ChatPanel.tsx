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
  voicePartialTranscript: string | null;
  onSendMessage: (content: string, options?: { delivery?: TranscriptDelivery }) => Promise<ChatResponse>;
  onToggleVoiceConnection: () => void;
}

export function ChatPanel({
  messages,
  isLoading,
  isSpeaking,
  suggestedQuestions,
  voiceStatus,
  voiceError,
  voicePartialTranscript,
  onSendMessage,
  onToggleVoiceConnection,
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
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
        <ExpertAvatar isSpeaking={isSpeaking || isVoiceThinking || isVoiceSpeaking} />
        <div>
          <h3 className="text-sm font-semibold text-white">AI Expert</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            {isVoiceDisabled
              ? "Live voice is unavailable. Typed chat still works."
              : isVoiceConnecting
                ? "Connecting live voice..."
                : isVoiceDisconnecting
                  ? "Disconnecting live voice..."
                  : isVoiceSpeaking
                    ? "Speaking through Agora..."
                    : isVoiceThinking
                      ? "Thinking through the answer..."
                      : isVoiceListening
                        ? "Live voice is connected and listening."
                        : isSpeaking
                          ? "Thinking..."
                          : "Connect live voice or type below."}
          </p>
        </div>
        <div className="ml-auto">
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

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-3">
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
        disabled={shouldDisableInput}
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
            disabled={shouldDisableInput}
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[var(--text-secondary)]"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || shouldDisableInput}
            className="rounded-full p-1.5 text-blue-400 transition-colors hover:bg-blue-500/20 disabled:opacity-40"
          >
            <Send className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
