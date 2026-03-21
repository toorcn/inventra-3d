"use client";

import { getInventionById } from "@/data/inventions";
import { getComponentById } from "@/data/invention-components";
import type { ChatMessage, ChatResponse, ExpertAction, TranscriptDelivery, ViewerState } from "@/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface UseExpertProps {
  inventionId: string;
  componentId?: string | null;
  activeVoiceSessionId?: string | null;
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

export function useExpert({ inventionId, componentId, activeVoiceSessionId, onActions }: UseExpertProps) {
  const invention = getInventionById(inventionId);
  const introMessage: ChatMessage = useMemo(() => createIntroMessage(invention), [invention]);
  const [messages, setMessages] = useState<ChatMessage[]>([introMessage]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesRef = useRef<ChatMessage[]>([introMessage]);
  const messageIdsRef = useRef<Set<string>>(new Set([introMessage.id]));

  useEffect(() => {
    const next = [introMessage];
    messagesRef.current = next;
    messageIdsRef.current = new Set([introMessage.id]);
    setMessages(next);
  }, [introMessage]);

  const suggestedQuestions = useMemo(
    () => buildSuggestedQuestions(inventionId, componentId),
    [inventionId, componentId],
  );

  const appendServerMessages = useCallback((incomingMessages: ChatMessage[]) => {
    const deduped = incomingMessages.filter((message) => !messageIdsRef.current.has(message.id));

    if (deduped.length === 0) {
      return messagesRef.current;
    }

    deduped.forEach((message) => {
      messageIdsRef.current.add(message.id);
    });

    const next = [...messagesRef.current, ...deduped];
    messagesRef.current = next;
    setMessages(next);
    return next;
  }, []);

  const appendMessage = useCallback(
    (message: AppendMessageOptions) => {
      const nextMessage: ChatMessage = {
        id: uid(),
        timestamp: Date.now(),
        ...message,
      };

      appendServerMessages([nextMessage]);
    },
    [appendServerMessages],
  );

  const sendMessage = useCallback(
    async (content: string, options: SendMessageOptions = {}): Promise<ChatResponse> => {
      const delivery = options.delivery ?? "typed";
      const userMsg: ChatMessage = {
        id: uid(),
        role: "user",
        content,
        delivery,
        timestamp: Date.now(),
      };

      const conversation = appendServerMessages([userMsg]);
      setIsLoading(true);
      setIsSpeaking(true);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inventionId,
            componentId: componentId ?? null,
            messages: conversation,
            sessionId: activeVoiceSessionId ?? undefined,
            clientMessageId: userMsg.id,
          }),
        });

        const payload = (await response.json()) as ChatResponse | { error?: string };
        if ("error" in payload && payload.error) {
          throw new Error(payload.error);
        }

        const chatPayload = payload as ChatResponse;
        const { content: assistantContent, actions } = chatPayload;

        const assistantMsg: ChatMessage = {
          id: chatPayload.assistantMessageId ?? uid(),
          role: "assistant",
          content: assistantContent,
          actions: actions.length ? actions : undefined,
          delivery,
          timestamp: Date.now(),
        };

        appendServerMessages([assistantMsg]);
        if (actions.length) {
          onActions?.(actions);
        }

        return {
          content: assistantContent,
          actions,
        };
      } catch {
        const errorMsg: ChatMessage = {
          id: uid(),
          role: "assistant",
          content: "Sorry, I encountered an error. Please try asking again.",
          delivery,
          timestamp: Date.now(),
        };
        appendServerMessages([errorMsg]);

        return {
          content: "Sorry, I encountered an error. Please try asking again.",
          actions: [],
        };
      } finally {
        setIsLoading(false);
        setIsSpeaking(false);
      }
    },
    [activeVoiceSessionId, appendServerMessages, componentId, inventionId, onActions],
  );

  const clearMessages = useCallback(() => {
    const next = [introMessage];
    messagesRef.current = next;
    messageIdsRef.current = new Set([introMessage.id]);
    setMessages(next);
  }, [introMessage]);

  return {
    appendMessage,
    appendServerMessages,
    messages,
    isLoading,
    isSpeaking,
    sendMessage,
    suggestedQuestions,
    clearMessages,
  };
}
