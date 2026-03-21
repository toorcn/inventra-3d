"use client";

import { Brain } from "lucide-react";

interface ExpertAvatarProps {
  isSpeaking: boolean;
}

export function ExpertAvatar({ isSpeaking }: ExpertAvatarProps) {
  return (
    <div className="relative">
      {/* Hexagonal Frame Container */}
      <div
        className={`relative flex size-12 items-center justify-center transition-all duration-500 ${
          isSpeaking ? "scale-110" : "scale-100"
        }`}
      >
        {/* Outer Glow */}
        {isSpeaking && (
          <div className="absolute inset-0 animate-pulse bg-[var(--accent-gold)]/20 blur-xl rounded-full" />
        )}
        
        {/* Hexagon shape using clip-path */}
        <div 
          className="absolute inset-0 bg-gradient-to-br from-[var(--accent-gold)] via-[var(--accent-gold-light)] to-[#8a6d3b]"
          style={{ clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)" }}
        />
        
        {/* Inner Hexagon for spacing */}
        <div 
          className="absolute inset-[2px] bg-[#0a0b14]"
          style={{ clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)" }}
        />

        {/* Content */}
        <div className="relative z-10">
          <Brain 
            className={`size-6 transition-all duration-300 ${
              isSpeaking ? "text-[var(--accent-gold)]" : "text-[var(--accent-gold-light)] opacity-70"
            }`} 
          />
        </div>
      </div>
      
      {/* Refined Speaking Indicator */}
      {isSpeaking && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
          <span className="size-1 rounded-full bg-[var(--accent-gold)] animate-bounce" style={{ animationDelay: "0s" }} />
          <span className="size-1 rounded-full bg-[var(--accent-gold)] animate-bounce" style={{ animationDelay: "0.1s" }} />
          <span className="size-1 rounded-full bg-[var(--accent-gold)] animate-bounce" style={{ animationDelay: "0.2s" }} />
        </div>
      )}
    </div>
  );
}
