import { randomUUID } from "node:crypto";
import { getComponentById } from "@/data/invention-components";
import { getInventionById } from "@/data/inventions";
import { hasAgoraVoiceConfig, speakAgoraAgent } from "@/lib/agora";
import { runExpertAgent } from "@/lib/expert-agent";
import type { ChatMessage, ChatResponse, TranscriptDelivery } from "@/types";
import {
  appendVoiceSessionMessage,
  enqueueVoiceSessionActions,
  getVoiceSession,
  setVoiceSessionListening,
  setVoiceSessionSpeaking,
  setVoiceSessionThinking,
  updateVoiceSessionContext,
} from "./voice-session-store";

function toOpenRouterMessages(
  messages: ChatMessage[],
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  return messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: message.content,
    }));
}

function extractLatestUserMessage(messages: ChatMessage[]): ChatMessage | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role === "user") {
      return message;
    }
  }

  return undefined;
}

type ProcessChatTurnInput = {
  inventionId: string;
  componentId?: string | null;
  requestMessages: ChatMessage[];
  delivery: TranscriptDelivery;
  sessionId?: string;
  clientMessageId?: string;
};

export async function processChatTurn({
  inventionId,
  componentId,
  requestMessages,
  delivery,
  sessionId,
  clientMessageId,
}: ProcessChatTurnInput): Promise<ChatResponse> {
  const invention = getInventionById(inventionId);

  if (!invention) {
    throw new Error("Invention not found");
  }

  const latestUserMessage = extractLatestUserMessage(requestMessages);
  if (!latestUserMessage) {
    throw new Error("Missing user message");
  }

  const userMessageId = clientMessageId ?? latestUserMessage.id ?? randomUUID();
  const userMessage: ChatMessage = {
    id: userMessageId,
    role: "user",
    content: latestUserMessage.content,
    delivery,
    timestamp: latestUserMessage.timestamp || Date.now(),
  };

  let conversationMessages = requestMessages;

  if (sessionId) {
    updateVoiceSessionContext(sessionId, {
      inventionId,
      componentId,
    });

    appendVoiceSessionMessage(sessionId, userMessage);
    if (delivery === "spoken") {
      setVoiceSessionThinking(sessionId, userMessage.content);
    } else {
      setVoiceSessionThinking(sessionId);
    }
    conversationMessages = getVoiceSession(sessionId).messages;
  }

  const component =
    componentId && componentId.trim().length > 0 ? getComponentById(componentId) : undefined;
  const result = await runExpertAgent(invention, toOpenRouterMessages(conversationMessages), component);
  const assistantMessageId = randomUUID();
  const assistantMessage: ChatMessage = {
    id: assistantMessageId,
    role: "assistant",
    content: result.content,
    actions: result.actions.length ? result.actions : undefined,
    delivery,
    timestamp: Date.now(),
  };

  if (sessionId) {
    appendVoiceSessionMessage(sessionId, assistantMessage);
    enqueueVoiceSessionActions(sessionId, result.actions);

    if (delivery === "spoken") {
      setVoiceSessionSpeaking(sessionId, result.content);
    } else {
      const session = getVoiceSession(sessionId);
      let didSpeak = false;
      if (session.agentId && hasAgoraVoiceConfig()) {
        try {
          await speakAgoraAgent(session.agentId, result.content);
          didSpeak = true;
        } catch {
          // Keep typed chat working even if agent speech fails.
        }
      }
      if (result.content.trim() && didSpeak) {
        setVoiceSessionSpeaking(sessionId, result.content);
      } else {
        setVoiceSessionListening(sessionId);
      }
    }
  }

  return {
    content: result.content,
    actions: result.actions,
    assistantMessageId,
    sessionId,
  };
}

type ProcessVoiceWebhookInput = {
  sessionId: string;
  requestMessages: ChatMessage[];
};

export async function processVoiceWebhookTurn({
  sessionId,
  requestMessages,
}: ProcessVoiceWebhookInput): Promise<ChatResponse> {
  const session = getVoiceSession(sessionId);

  return processChatTurn({
    inventionId: session.inventionId,
    componentId: session.componentId,
    requestMessages,
    delivery: "spoken",
    sessionId,
  });
}
