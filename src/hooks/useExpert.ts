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

export function useExpert({ inventionId, componentId }: UseExpertProps) {
  const invention = getInventionById(inventionId);
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
      setIsSpeaking(true);

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

        const text = await response.text();

        const assistantMsg: ChatMessage = {
          id: uid(),
          role: "assistant",
          content: text,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } catch {
        const errorMsg: ChatMessage = {
          id: uid(),
          role: "assistant",
          content: "Sorry, I encountered an error. Please try asking again.",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
        setIsSpeaking(false);
      }
    },
    [inventionId, componentId, messages],
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
