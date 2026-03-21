"use client";

import { Brain } from "lucide-react";

interface ExpertAvatarProps {
  isSpeaking: boolean;
}

export function ExpertAvatar({ isSpeaking }: ExpertAvatarProps) {
  return (
    <div className="relative">
      <div
        className={`flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-500 ${
          isSpeaking ? "animate-pulse" : ""
        }`}
      >
        <Brain className="size-5 text-white" />
      </div>
      {isSpeaking && (
        <span className="absolute -inset-1 animate-ping rounded-full border-2 border-blue-400/40" />
      )}
    </div>
  );
}
