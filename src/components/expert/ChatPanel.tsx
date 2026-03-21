"use client";

import { ExpertAvatar } from "./ExpertAvatar";
import { MessageBubble } from "./MessageBubble";
import { SuggestedQuestions } from "./SuggestedQuestions";
import { useExpert } from "@/hooks/useExpert";
import type { ExpertAction } from "@/types";
import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ChatPanelProps {
  inventionId: string;
  componentId?: string | null;
  onActions?: (actions: ExpertAction[]) => void;
}

export function ChatPanel({ inventionId, componentId, onActions }: ChatPanelProps) {
  const { messages, isLoading, isSpeaking, sendMessage, suggestedQuestions } = useExpert({
    inventionId,
    componentId,
    onActions,
  });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    sendMessage(text);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
        <ExpertAvatar isSpeaking={isSpeaking} />
        <div>
          <h3 className="text-sm font-semibold text-white">AI Expert</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            {isSpeaking ? "Thinking..." : "Ask me anything"}
          </p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-3">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md border border-white/5 bg-white/[0.06] px-4 py-2.5 text-sm text-gray-400">
                <span className="inline-flex gap-1">
                  <span className="animate-bounce">.</span>
                  <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>.</span>
                  <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>.</span>
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
          sendMessage(q);
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
