"use client";

import { getInventionById } from "@/data/inventions";
import { getComponentById } from "@/data/invention-components";
import type { ChatMessage } from "@/types";
import { useCallback, useEffect, useMemo, useState } from "react";

interface UseExpertProps {
  inventionId: string;
  componentId?: string | null;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function buildSuggestedQuestions(inventionId: string, componentId?: string | null): string[] {
  const invention = getInventionById(inventionId);
  if (!invention) return [];

  const base = [
    `How does the ${invention.title} work?`,
    `Who invented this and why?`,
    `What was the real-world impact?`,
  ];

  if (componentId) {
    const comp = getComponentById(componentId);
    if (comp) {
      return [
        `What does the ${comp.name} do?`,
        `What materials is the ${comp.name} made of?`,
        `Why is the ${comp.name} important?`,
      ];
    }
  }

  return base;
}

async function playTTS(text: string, avatarPersona: string): Promise<void> {
  try {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, persona: avatarPersona }),
    });

    if (!response.ok) {
      // TTS unavailable — silently skip
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);

    await new Promise<void>((resolve) => {
      audio.onended = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      audio.play().catch(() => resolve());
    });
  } catch {
    // TTS failed — don't break chat
  }
}

export function useExpert({ inventionId, componentId }: UseExpertProps) {
  const invention = getInventionById(inventionId);
  const avatarPersona = invention?.avatarPersona ?? "AI Guide";

  const introMessage: ChatMessage = useMemo(
    () => ({
      id: "intro",
      role: "assistant",
      content: invention
        ? `Welcome! I'm your AI guide for the **${invention.title}** (${invention.year}). ${invention.description.split(".")[0]}. Ask me anything about how it works, its history, or its components!`
        : "Select an invention to begin exploring.",
      timestamp: Date.now(),
    }),
    [invention],
  );

  const [messages, setMessages] = useState<ChatMessage[]>([introMessage]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    setMessages([introMessage]);
  }, [introMessage]);

  const suggestedQuestions = useMemo(
    () => buildSuggestedQuestions(inventionId, componentId),
    [inventionId, componentId],
  );

  const sendMessage = useCallback(
    async (content: string) => {
      const userMsg: ChatMessage = {
        id: uid(),
        role: "user",
        content,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inventionId,
            componentId: componentId ?? undefined,
            messages: [...messages, userMsg],
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText);
        }

        const text = await response.text();

        const assistantMsg: ChatMessage = {
          id: uid(),
          role: "assistant",
          content: text,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, assistantMsg]);

        // TTS playback — non-blocking, won't break chat on failure
        setIsSpeaking(true);
        playTTS(text, avatarPersona).finally(() => {
          setIsSpeaking(false);
        });
      } catch (error) {
        const apiError = error instanceof Error ? error.message : "";
        const missingKey = apiError.includes("OPENROUTER_API_KEY");
        const errorMsg: ChatMessage = {
          id: uid(),
          role: "assistant",
          content: missingKey
            ? "AI Expert is unavailable because OPENROUTER_API_KEY is not configured. Please add a valid OpenRouter API key."
            : "Sorry, I encountered an error. Please try asking again.",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [inventionId, componentId, messages, avatarPersona],
  );

  const clearMessages = useCallback(() => {
    setMessages([introMessage]);
  }, [introMessage]);

  return {
    messages,
    isLoading,
    isSpeaking,
    sendMessage,
    suggestedQuestions,
    clearMessages,
  };
}
