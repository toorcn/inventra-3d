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
    <div className={`flex ${isSystem ? "justify-center" : isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isSystem
            ? "border border-cyan-400/20 bg-cyan-500/10 text-cyan-50"
            : isUser
              ? "rounded-br-md bg-blue-500/80 text-white"
              : "rounded-bl-md border border-white/5 bg-white/[0.06] text-gray-200"
        }`}
      >
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
            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            strong: ({ children }) => (
              <strong className={`font-bold ${isSystem ? "text-cyan-50" : "text-white"}`}>
                {children}
              </strong>
            ),
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
