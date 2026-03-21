"use client";

import { getInventionById } from "@/data/inventions";
import { getComponentById } from "@/data/invention-components";
import type { ChatMessage, ExpertAction } from "@/types";
import { useCallback, useEffect, useMemo, useState } from "react";

interface UseExpertProps {
  inventionId: string;
  componentId?: string | null;
  onActions?: (actions: ExpertAction[]) => void;
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

const ACTION_BLOCK_RE = /\[\[ACTIONS\]\]([\s\S]*?)\[\[\/ACTIONS\]\]/g;

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function normalizeAction(raw: Record<string, unknown>): ExpertAction | null {
  const type = raw.type;
  if (typeof type !== "string") return null;

  if (type === "highlight") {
    if (!isStringArray(raw.componentIds)) return null;
    return {
      type,
      componentIds: raw.componentIds,
      durationMs: typeof raw.durationMs === "number" ? raw.durationMs : undefined,
      color: typeof raw.color === "string" ? raw.color : undefined,
      mode: raw.mode === "glow" || raw.mode === "pulse" ? raw.mode : undefined,
    };
  }

  if (type === "select") {
    if (typeof raw.componentId !== "string") return null;
    return {
      type,
      componentId: raw.componentId,
      durationMs: typeof raw.durationMs === "number" ? raw.durationMs : undefined,
    };
  }

  if (type === "explode" || type === "assemble" || type === "reset") {
    return { type };
  }

  if (type === "beam") {
    if (typeof raw.fromComponentId !== "string" || typeof raw.toComponentId !== "string") return null;
    return {
      type,
      fromComponentId: raw.fromComponentId,
      toComponentId: raw.toComponentId,
      durationMs: typeof raw.durationMs === "number" ? raw.durationMs : undefined,
      color: typeof raw.color === "string" ? raw.color : undefined,
      thickness: typeof raw.thickness === "number" ? raw.thickness : undefined,
    };
  }

  return null;
}

function extractActions(text: string): { cleanText: string; actions: ExpertAction[] } {
  const actions: ExpertAction[] = [];
  let cleanText = text;

  for (const match of text.matchAll(ACTION_BLOCK_RE)) {
    const payload = match[1]?.trim();
    if (payload) {
      try {
        const parsed = JSON.parse(payload) as unknown;
        const actionList = Array.isArray(parsed)
          ? parsed
          : typeof parsed === "object" && parsed && Array.isArray((parsed as { actions?: unknown }).actions)
            ? (parsed as { actions?: unknown }).actions
            : [];
        for (const action of actionList) {
          if (action && typeof action === "object") {
            const normalized = normalizeAction(action as Record<string, unknown>);
            if (normalized) actions.push(normalized);
          }
        }
      } catch {
        // Ignore malformed action blocks.
      }
    }
    cleanText = cleanText.replace(match[0], "").trim();
  }

  return { cleanText, actions };
}

export function useExpert({ inventionId, componentId, onActions }: UseExpertProps) {
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
        const { cleanText, actions } = extractActions(text);

        const assistantMsg: ChatMessage = {
          id: uid(),
          role: "assistant",
          content: cleanText || text,
          actions: actions.length ? actions : undefined,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, assistantMsg]);
        if (actions.length) {
          onActions?.(actions);
        }
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
    [inventionId, componentId, messages, onActions],
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
