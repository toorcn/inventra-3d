import type { ChatMessage, ExpertAction, VoiceSessionEvent, VoiceSessionStatus } from "@/types";
import { randomUUID } from "node:crypto";

const SESSION_TTL_MS = 30 * 60 * 1000;
const MAX_EVENTS = 250;

export interface VoiceSessionRecord {
  sessionId: string;
  channelName: string;
  rtcUid: number;
  agentRtcUid: number;
  agentId: string | null;
  inventionId: string;
  componentId?: string;
  messages: ChatMessage[];
  pendingActions: ExpertAction[];
  partialTranscript: string | null;
  status: VoiceSessionStatus;
  expiresAt: number;
  llmApiKey: string;
  cursor: number;
  events: VoiceSessionEvent[];
  speakingUntil: number | null;
}

type CreateVoiceSessionInput = {
  inventionId: string;
  componentId?: string;
};

declare global {
  var __inventornetVoiceSessions__: Map<string, VoiceSessionRecord> | undefined;
}

const sessions =
  globalThis.__inventornetVoiceSessions__ ??
  (globalThis.__inventornetVoiceSessions__ = new Map<string, VoiceSessionRecord>());

function now(): number {
  return Date.now();
}

function randomUid(): number {
  return Math.floor(100000 + Math.random() * 900000);
}

function estimateSpeechDurationMs(text: string): number {
  const normalized = text.trim();
  if (!normalized) {
    return 0;
  }

  return Math.max(1500, Math.min(12000, normalized.length * 45));
}

function touch(session: VoiceSessionRecord): VoiceSessionRecord {
  session.expiresAt = now() + SESSION_TTL_MS;

  if (session.status === "speaking" && session.speakingUntil !== null && session.speakingUntil <= now()) {
    session.status = "listening";
    session.speakingUntil = null;
  }

  return session;
}

function cleanupExpiredSessions() {
  const cutoff = now();

  for (const [sessionId, session] of sessions.entries()) {
    if (session.expiresAt <= cutoff) {
      sessions.delete(sessionId);
    }
  }
}

function getSessionOrThrow(sessionId: string): VoiceSessionRecord {
  cleanupExpiredSessions();
  const session = sessions.get(sessionId);

  if (!session) {
    throw new Error("Voice session not found");
  }

  return touch(session);
}

function nextCursor(session: VoiceSessionRecord): number {
  session.cursor += 1;
  return session.cursor;
}

function trimEvents(session: VoiceSessionRecord) {
  if (session.events.length > MAX_EVENTS) {
    session.events.splice(0, session.events.length - MAX_EVENTS);
  }
}

export function createVoiceSession({ inventionId, componentId }: CreateVoiceSessionInput): VoiceSessionRecord {
  cleanupExpiredSessions();
  const sessionId = randomUUID();
  const session: VoiceSessionRecord = {
    sessionId,
    channelName: `inventornet-${sessionId}`,
    rtcUid: randomUid(),
    agentRtcUid: randomUid(),
    agentId: null,
    inventionId,
    componentId,
    messages: [],
    pendingActions: [],
    partialTranscript: null,
    status: "idle",
    expiresAt: now() + SESSION_TTL_MS,
    llmApiKey: randomUUID(),
    cursor: 0,
    events: [],
    speakingUntil: null,
  };

  sessions.set(sessionId, session);
  return session;
}

export function getVoiceSession(sessionId: string): VoiceSessionRecord {
  return getSessionOrThrow(sessionId);
}

export function updateVoiceSessionContext(
  sessionId: string,
  context: { inventionId?: string; componentId?: string | null },
): VoiceSessionRecord {
  const session = getSessionOrThrow(sessionId);

  if (context.inventionId) {
    session.inventionId = context.inventionId;
  }

  if (context.componentId !== undefined) {
    session.componentId = context.componentId ?? undefined;
  }

  return session;
}

export function attachVoiceSessionAgent(sessionId: string, agentId: string): VoiceSessionRecord {
  const session = getSessionOrThrow(sessionId);
  session.agentId = agentId;
  session.status = "listening";
  session.speakingUntil = null;
  return session;
}

export function setVoiceSessionStatus(sessionId: string, status: VoiceSessionStatus): VoiceSessionRecord {
  const session = getSessionOrThrow(sessionId);
  session.status = status;
  if (status !== "speaking") {
    session.speakingUntil = null;
  }
  return session;
}

export function setVoiceSessionThinking(sessionId: string, partialTranscript?: string | null): VoiceSessionRecord {
  const session = getSessionOrThrow(sessionId);
  session.status = "thinking";
  session.speakingUntil = null;
  session.partialTranscript = partialTranscript ?? null;
  return session;
}

export function setVoiceSessionListening(sessionId: string): VoiceSessionRecord {
  const session = getSessionOrThrow(sessionId);
  session.status = "listening";
  session.partialTranscript = null;
  session.speakingUntil = null;
  return session;
}

export function setVoiceSessionSpeaking(sessionId: string, text: string): VoiceSessionRecord {
  const session = getSessionOrThrow(sessionId);
  session.status = "speaking";
  session.partialTranscript = null;
  session.speakingUntil = now() + estimateSpeechDurationMs(text);
  return session;
}

export function appendVoiceSessionMessage(sessionId: string, message: ChatMessage): VoiceSessionRecord {
  const session = getSessionOrThrow(sessionId);

  if (!session.messages.some((existing) => existing.id === message.id)) {
    session.messages.push(message);
    session.events.push({
      cursor: nextCursor(session),
      type: "message",
      message,
    });
    trimEvents(session);
  }

  return session;
}

export function enqueueVoiceSessionActions(sessionId: string, actions: ExpertAction[]): VoiceSessionRecord {
  if (actions.length === 0) {
    return getSessionOrThrow(sessionId);
  }

  const session = getSessionOrThrow(sessionId);
  session.pendingActions = [...session.pendingActions, ...actions];
  session.events.push({
    cursor: nextCursor(session),
    type: "actions",
    actions,
  });
  trimEvents(session);
  return session;
}

export function clearVoiceSessionPendingActions(sessionId: string): VoiceSessionRecord {
  const session = getSessionOrThrow(sessionId);
  session.pendingActions = [];
  return session;
}

export function getVoiceSessionEvents(sessionId: string, afterCursor = 0): { cursor: number; events: VoiceSessionEvent[]; status: VoiceSessionStatus; partialTranscript: string | null } {
  const session = getSessionOrThrow(sessionId);
  return {
    cursor: session.cursor,
    events: session.events.filter((event) => event.cursor > afterCursor),
    status: session.status,
    partialTranscript: session.partialTranscript,
  };
}

export function removeVoiceSession(sessionId: string) {
  sessions.delete(sessionId);
}

export function resetVoiceSessionsForTests() {
  sessions.clear();
}
