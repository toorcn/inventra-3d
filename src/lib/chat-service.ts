import { randomUUID } from "node:crypto";
import { getComponentById } from "@/data/invention-components";
import { getInventionById } from "@/data/inventions";
import { hasAgoraVoiceConfig, speakAgoraAgent } from "@/lib/agora";
import { buildToolInstructions, runExpertAgent } from "@/lib/expert-agent";
import { chatCompletionStream } from "@/lib/openrouter";
import { hasPusherConfig, pusherServer, voiceChannel } from "@/lib/pusher";
import type { ChatMessage, ChatResponse, ExpertAction, TranscriptDelivery, ViewerState, VoiceSessionStatus } from "@/types";
import {
  appendVoiceSessionMessage,
  enqueueVoiceSessionActions,
  getVoiceSession,
  setVoiceSessionListening,
  setVoiceSessionSpeaking,
  setVoiceSessionThinking,
  updateVoiceSessionContext,
} from "./voice-session-store";

function publishVoiceEvents(
  sessionId: string,
  messages: ChatMessage[],
  actions: ExpertAction[],
  status: VoiceSessionStatus,
  partialTranscript: string | null,
): void {
  if (!hasPusherConfig() || !pusherServer) return;

  const channel = voiceChannel(sessionId);
  const batch: Array<{ channel: string; name: string; data: unknown }> = [
    ...messages.map((msg) => ({ channel, name: "voice:message", data: msg })),
    ...(actions.length ? [{ channel, name: "voice:actions", data: { actions } }] : []),
    { channel, name: "voice:status", data: { status, partialTranscript } },
  ];

  void pusherServer.triggerBatch(batch).catch(() => {});
}

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
  viewerState?: ViewerState | null;
  requestMessages: ChatMessage[];
  delivery: TranscriptDelivery;
  sessionId?: string;
  clientMessageId?: string;
};

export async function processChatTurn({
  inventionId,
  componentId,
  viewerState,
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

    // Push user message immediately so the chat bubble appears before the LLM responds.
    publishVoiceEvents(sessionId, [userMessage], [], "thinking", delivery === "spoken" ? userMessage.content : null);
  }

  const component =
    componentId && componentId.trim().length > 0 ? getComponentById(componentId) : undefined;
  const result = await runExpertAgent(invention, toOpenRouterMessages(conversationMessages), component, viewerState ?? undefined);
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

    const finalSession = getVoiceSession(sessionId);
    publishVoiceEvents(
      sessionId,
      [assistantMessage],
      result.actions,
      finalSession.status,
      finalSession.partialTranscript,
    );
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

export async function processVoiceWebhookTurnStreaming({
  sessionId,
  requestMessages,
}: ProcessVoiceWebhookInput): Promise<ReadableStream<Uint8Array>> {
  const session = getVoiceSession(sessionId);
  const invention = getInventionById(session.inventionId);

  if (!invention) {
    throw new Error("Invention not found");
  }

  const userMessage = requestMessages[0];
  appendVoiceSessionMessage(sessionId, userMessage);
  setVoiceSessionThinking(sessionId, userMessage.content);
  publishVoiceEvents(sessionId, [userMessage], [], "thinking", userMessage.content);

  const component =
    session.componentId && session.componentId.trim().length > 0
      ? getComponentById(session.componentId)
      : undefined;
  const systemPrompt = buildToolInstructions(invention, component);
  const conversationMessages = getVoiceSession(sessionId).messages;
  const messagesForLlm = toOpenRouterMessages(conversationMessages);

  // Kick off both calls in parallel:
  // - structured agent → extracts 3D viewer actions
  // - prose stream     → generates the spoken response for TTS
  // This way the prose model never has to disclaim tool use; it just describes
  // what is happening naturally, and actions arrive as soon as they're ready.
  const agentResultPromise = runExpertAgent(invention, messagesForLlm, component);

  const openRouterStream = await chatCompletionStream(
    [
      {
        role: "system",
        content: `${systemPrompt}\n\nIMPORTANT: You are speaking aloud to the user. Reply with natural conversational prose only — no raw tool syntax, JSON, or action markers in your words. When asked to perform 3D viewer actions (explode, highlight, select a component, assemble, etc.) describe what you are doing naturally, for example "Let me explode the view so you can see each component." The viewer actions are executed automatically in parallel with your response.`,
      },
      ...messagesForLlm,
    ],
    { max_tokens: 700, temperature: 0.2 },
  );

  let fullContent = "";
  const decoder = new TextDecoder();

  const transform = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      controller.enqueue(chunk);
      const text = decoder.decode(chunk, { stream: true });
      for (const line of text.split("\n")) {
        if (line.startsWith("data: ") && !line.includes("[DONE]")) {
          try {
            const json = JSON.parse(line.slice(6));
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) fullContent += delta;
          } catch {
            // Ignore malformed SSE chunks.
          }
        }
      }
    },
    flush() {
      const assistantMessage: ChatMessage = {
        id: randomUUID(),
        role: "assistant",
        content: fullContent,
        delivery: "spoken",
        timestamp: Date.now(),
      };
      appendVoiceSessionMessage(sessionId, assistantMessage);
      setVoiceSessionSpeaking(sessionId, fullContent);
      publishVoiceEvents(sessionId, [assistantMessage], [], "speaking", null);

      // Emit viewer actions from the already-in-flight structured agent call.
      void agentResultPromise
        .then(({ actions }) => {
          if (actions.length > 0) {
            try {
              enqueueVoiceSessionActions(sessionId, actions);
              publishVoiceEvents(
                sessionId,
                [],
                actions,
                getVoiceSession(sessionId).status,
                null,
              );
            } catch {
              // Session may have expired by the time actions resolve.
            }
          }
        })
        .catch(() => {});
    },
  });

  return openRouterStream.pipeThrough(transform);
}
