"use client";

import { useEffect, useRef, useState } from "react";
import { useExpert } from "@/hooks/useExpert";
import type { Invention, InventionComponent, ChatMessage } from "@/types";

interface AvatarPanelProps {
  invention: Invention;
  selectedComponent: InventionComponent | null;
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-2`}
    >
      <div
        className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
          isUser
            ? "bg-blue-500/30 text-white text-right"
            : "bg-white/5 text-white/90 text-left"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}

export default function AvatarPanel({ invention, selectedComponent }: AvatarPanelProps) {
  const { messages, isLoading, isSpeaking, sendMessage, suggestedQuestions } = useExpert({
    inventionId: invention.id,
    componentId: selectedComponent?.id ?? null,
  });

  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;
    setInputValue("");
    sendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  // Determine if we should show suggested questions
  // Show them when only the intro message exists (no user messages yet)
  const hasUserMessages = messages.some((m) => m.role === "user");

  return (
    <div
      className="absolute right-4 top-20 bottom-20 w-80 z-30 flex flex-col"
      style={{
        background: "rgba(0,0,0,0.70)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRadius: "1rem",
        border: "1px solid rgba(255,255,255,0.10)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 shrink-0">
        {/* Avatar icon with pulse when speaking */}
        <div className="relative">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 ${
              isSpeaking ? "animate-pulse" : ""
            }`}
            style={{ background: "rgba(37,99,235,0.75)" }}
          >
            🎓
          </div>
          {isSpeaking && (
            <span
              className="absolute inset-0 rounded-full animate-ping"
              style={{ background: "rgba(37,99,235,0.35)" }}
            />
          )}
        </div>

        <div className="min-w-0">
          <p className="text-white font-semibold text-sm truncate">
            {invention.avatarPersona}
          </p>
          <p className="text-white/50 text-xs truncate">
            {isSpeaking
              ? "Speaking…"
              : isLoading
              ? "Thinking…"
              : "Ask me anything"}
          </p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 min-h-0">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isLoading && (
          <div className="flex justify-start mb-2">
            <div className="bg-white/5 rounded-xl px-3 py-2 text-white/50 text-sm flex gap-1 items-center">
              <span className="animate-bounce" style={{ animationDelay: "0ms" }}>●</span>
              <span className="animate-bounce" style={{ animationDelay: "150ms" }}>●</span>
              <span className="animate-bounce" style={{ animationDelay: "300ms" }}>●</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested questions — shown when no user messages */}
      {!hasUserMessages && suggestedQuestions.length > 0 && (
        <div className="px-3 pb-2 shrink-0 space-y-1.5">
          <p className="text-white/40 text-xs px-1 mb-1">Suggested questions</p>
          {suggestedQuestions.map((q) => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              className="w-full text-left rounded-lg px-3 py-2 text-xs text-white/80 transition-colors hover:text-white"
              style={{
                background: "rgba(37,99,235,0.15)",
                border: "1px solid rgba(37,99,235,0.35)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(37,99,235,0.30)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(37,99,235,0.15)";
              }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div
        className="px-3 py-3 border-t border-white/10 shrink-0 flex gap-2"
      >
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question…"
          disabled={isLoading}
          className="flex-1 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:ring-1 focus:ring-blue-500/60 disabled:opacity-50"
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        />
        <button
          onClick={handleSend}
          disabled={!inputValue.trim() || isLoading}
          className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-white transition-opacity disabled:opacity-40"
          style={{ background: "#2563EB" }}
          aria-label="Send"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
