"use client";

import { getInventionById } from "@/data/inventions";
import { getComponentById } from "@/data/invention-components";
import type { ChatMessage, ChatResponse, ExpertAction, TranscriptDelivery } from "@/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface UseExpertProps {
  inventionId: string;
  componentId?: string | null;
  onActions?: (actions: ExpertAction[]) => void;
}

interface SendMessageOptions {
  delivery?: TranscriptDelivery;
}

interface AppendMessageOptions {
  role: ChatMessage["role"];
  content: string;
  actions?: ExpertAction[];
  delivery?: TranscriptDelivery;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function createIntroMessage(invention: ReturnType<typeof getInventionById>): ChatMessage {
  return {
    id: "intro",
    role: "assistant",
    content: invention
      ? `Welcome! I'm your AI guide for the **${invention.title}** (${invention.year}). ${invention.description.split(".")[0]}. Ask me anything about how it works, its history, or its components!`
      : "Select an invention to begin exploring.",
    timestamp: Date.now(),
  };
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

export function useExpert({ inventionId, componentId, onActions }: UseExpertProps) {
  const invention = getInventionById(inventionId);
  const introMessage: ChatMessage = useMemo(() => createIntroMessage(invention), [invention]);
  const [messages, setMessages] = useState<ChatMessage[]>([introMessage]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesRef = useRef<ChatMessage[]>([introMessage]);

  useEffect(() => {
    const next = [introMessage];
    messagesRef.current = next;
    setMessages(next);
  }, [introMessage]);

  const suggestedQuestions = useMemo(
    () => buildSuggestedQuestions(inventionId, componentId),
    [inventionId, componentId],
  );

  const appendMessage = useCallback((message: AppendMessageOptions) => {
    const nextMessage: ChatMessage = {
      id: uid(),
      timestamp: Date.now(),
      ...message,
    };

    setMessages((prev) => {
      const next = [...prev, nextMessage];
      messagesRef.current = next;
      return next;
    });
  }, []);

  const sendMessage = useCallback(
    async (content: string, options: SendMessageOptions = {}) => {
      const delivery = options.delivery ?? "typed";
      const userMsg: ChatMessage = {
        id: uid(),
        role: "user",
        content,
        delivery,
        timestamp: Date.now(),
      };

      const conversation = [...messagesRef.current, userMsg];
      messagesRef.current = conversation;
      setMessages(conversation);
      setIsLoading(true);
      setIsSpeaking(true);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inventionId,
            componentId: componentId ?? undefined,
            messages: conversation,
          }),
        });

        const payload = (await response.json()) as ChatResponse | { error?: string };
        if ("error" in payload && payload.error) {
          throw new Error(payload.error);
        }

        const { content: assistantContent, actions } = payload as ChatResponse;

        const assistantMsg: ChatMessage = {
          id: uid(),
          role: "assistant",
          content: assistantContent,
          actions: actions.length ? actions : undefined,
          delivery,
          timestamp: Date.now(),
        };

        setMessages((prev) => {
          const next = [...prev, assistantMsg];
          messagesRef.current = next;
          return next;
        });
        if (actions.length) {
          onActions?.(actions);
        }
      } catch {
        const errorMsg: ChatMessage = {
          id: uid(),
          role: "assistant",
          content: "Sorry, I encountered an error. Please try asking again.",
          delivery,
          timestamp: Date.now(),
        };
        setMessages((prev) => {
          const next = [...prev, errorMsg];
          messagesRef.current = next;
          return next;
        });
      } finally {
        setIsLoading(false);
        setIsSpeaking(false);
      }
    },
    [inventionId, componentId, onActions],
  );

  const clearMessages = useCallback(() => {
    const next = [introMessage];
    messagesRef.current = next;
    setMessages(next);
  }, [introMessage]);

  return {
    appendMessage,
    messages,
    isLoading,
    isSpeaking,
    sendMessage,
    suggestedQuestions,
    clearMessages,
  };
}
