"use client";

import type { ChatMessage } from "@/types";
import ReactMarkdown from "react-markdown";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const deliveryLabel =
    message.delivery === "spoken"
      ? "Spoken"
      : message.delivery === "typed"
        ? "Typed"
        : null;

  return (
    <div className={`flex w-full ${isSystem ? "justify-center" : isUser ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-500`}>
      <div
        className={`relative max-w-[85%] px-5 py-3.5 text-[13.5px] leading-relaxed shadow-xl backdrop-blur-sm transition-all hover:shadow-2xl ${
          isSystem
            ? "rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-50"
            : isUser
              ? "rounded-2xl rounded-tr-none border border-white/10 bg-gradient-to-br from-[#1a1f3c] to-[#0a0a1a] text-gray-200"
              : "rounded-2xl rounded-tl-none border border-[var(--accent-gold)]/20 bg-gradient-to-br from-[#1a1c2e]/80 to-black/60 text-[var(--text-primary)]"
        }`}
      >
        {/* Accent Glow for AI messages */}
        {!isUser && !isSystem && (
          <div className="absolute -left-px -top-px h-6 w-6 rounded-tl-none rounded-br-full border-l border-t border-[var(--accent-gold)]/40 pointer-events-none" />
        )}

        {(isSystem || deliveryLabel) && (
          <div className={`mb-2 flex ${isSystem ? "justify-center" : isUser ? "justify-end" : "justify-start"}`}>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.24em] ${
                isSystem
                  ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-100"
                  : deliveryLabel === "Spoken"
                    ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-100"
                    : "border-white/10 bg-white/5 text-[var(--text-secondary)]"
              }`}
            >
              {isSystem ? "System" : deliveryLabel}
            </span>
          </div>
        )}

        <ReactMarkdown
          components={{
            p: ({ children }) => <p className="mb-2 last:mb-0 opacity-90">{children}</p>,
            strong: ({ children }) => (
              <strong className={`font-bold ${isSystem ? "text-cyan-50" : "text-[var(--accent-gold-light)] drop-shadow-sm"}`}>
                {children}
              </strong>
            ),
            code: ({ children }) => (
              <code className={`rounded px-1.5 py-0.5 font-mono text-xs ${isSystem ? "bg-cyan-400/20 text-cyan-50" : "bg-black/40 text-[var(--accent-gold)]"}`}>
                {children}
              </code>
            ),

          }}
        >
          {message.content}
        </ReactMarkdown>

        {/* Timestamp or indicator could go here in future */}
      </div>
    </div>
  );
}
