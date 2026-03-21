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
  inventionId: string;
  componentId?: string;
  requestMessages: ChatMessage[];
  // Full conversation history from Agora's webhook body (system messages excluded).
  // Used directly for LLM context so the webhook is stateless w.r.t. the session store.
  agoraMessages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
};

export async function processVoiceWebhookTurnStreaming({
  sessionId,
  inventionId,
  componentId,
  requestMessages,
  agoraMessages,
}: ProcessVoiceWebhookInput): Promise<ReadableStream<Uint8Array>> {
  const invention = getInventionById(inventionId);

  if (!invention) {
    throw new Error("Invention not found");
  }

  const userMessage = requestMessages[0];

  // Best-effort: append to in-memory store and push Pusher events.
  // These may fail if the session isn't in this serverless instance's memory.
  try {
    appendVoiceSessionMessage(sessionId, userMessage);
    setVoiceSessionThinking(sessionId, userMessage.content);
  } catch {
    // Session not in this instance — Pusher still delivers events below.
  }
  publishVoiceEvents(sessionId, [userMessage], [], "thinking", userMessage.content);

  const component =
    componentId && componentId.trim().length > 0 ? getComponentById(componentId) : undefined;
  const systemPrompt = buildToolInstructions(invention, component);

  // Use Agora's conversation history directly — it tracks the full turn history
  // across all webhook calls, making this path stateless w.r.t. the session store.
  const messagesForLlm = agoraMessages.filter((m) => m.role !== "system");

  // Kick off both calls in parallel:
  // - structured agent → extracts 3D viewer actions
  // - prose stream     → generates the spoken response for TTS
  const agentResultPromise = runExpertAgent(invention, messagesForLlm, component);

  const openRouterStream = await chatCompletionStream(
    [
      {
        role: "system",
        content: `${systemPrompt}\n\nIMPORTANT: You are speaking aloud to the user. Keep replies short and conversational — 1 to 3 sentences max. Be punchy and interactive, like a knowledgeable friend, not a lecturer. No raw tool syntax, JSON, or action markers in your words. When performing 3D viewer actions describe them naturally, e.g. "Let me explode the view so you can see each part." Actions execute automatically in parallel.`,
      },
      ...messagesForLlm,
    ],
    { max_tokens: 200, temperature: 0.4 },
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

      // Best-effort store update.
      try {
        appendVoiceSessionMessage(sessionId, assistantMessage);
        setVoiceSessionSpeaking(sessionId, fullContent);
      } catch {
        // Session not in this instance's memory.
      }
      publishVoiceEvents(sessionId, [assistantMessage], [], "speaking", null);

      // Emit viewer actions from the already-in-flight structured agent call.
      void agentResultPromise
        .then(({ actions }) => {
          if (actions.length > 0) {
            try {
              enqueueVoiceSessionActions(sessionId, actions);
            } catch {
              // Best-effort.
            }
            publishVoiceEvents(sessionId, [], actions, "speaking", null);
          }
        })
        .catch(() => {});
    },
  });

  return openRouterStream.pipeThrough(transform);
}
