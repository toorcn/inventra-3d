"use client";

import type { ChatMessage } from "@/types";
import ReactMarkdown from "react-markdown";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "rounded-br-md bg-blue-500/80 text-white"
            : "rounded-bl-md border border-white/5 bg-white/[0.06] text-gray-200"
        }`}
      >
        <ReactMarkdown
          components={{
            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
