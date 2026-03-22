import { afterEach, describe, expect, it } from "vitest";
import type { ChatMessage } from "@/types";
import {
  appendVoiceSessionMessage,
  clearVoiceSessionPendingActions,
  createVoiceSession,
  enqueueVoiceSessionActions,
  getVoiceSession,
  getVoiceSessionEvents,
  removeVoiceSession,
  resetVoiceSessionsForTests,
  updateVoiceSessionContext,
} from "@/lib/voice-session-store";

function createMessage(id: string, role: ChatMessage["role"], content: string): ChatMessage {
  return {
    id,
    role,
    content,
    delivery: role === "assistant" ? "spoken" : "typed",
    timestamp: Date.now(),
  };
}

afterEach(() => {
  resetVoiceSessionsForTests();
});

describe("voice session store", () => {
  it("creates, updates, and removes a live voice session", () => {
    const session = createVoiceSession({
      inventionId: "telephone",
      componentId: "transmitter",
    });

    expect(session.inventionId).toBe("telephone");
    expect(session.componentId).toBe("transmitter");
    expect(session.agentId).toBeNull();

    updateVoiceSessionContext(session.sessionId, {
      componentId: null,
    });

    expect(getVoiceSession(session.sessionId).componentId).toBeUndefined();

    removeVoiceSession(session.sessionId);
    expect(() => getVoiceSession(session.sessionId)).toThrow("Voice session not found");
  });

  it("stores shared chat history and action events for typed and spoken turns", () => {
    const session = createVoiceSession({
      inventionId: "telephone",
    });

    appendVoiceSessionMessage(
      session.sessionId,
      createMessage("typed-user", "user", "How does it work?"),
    );
    appendVoiceSessionMessage(
      session.sessionId,
      createMessage("spoken-user", "user", "Show me the receiver"),
    );
    enqueueVoiceSessionActions(session.sessionId, [
      {
        type: "highlight",
        componentIds: ["receiver"],
      },
    ]);

    const snapshot = getVoiceSessionEvents(session.sessionId);

    expect(getVoiceSession(session.sessionId).messages.map((message) => message.id)).toEqual([
      "typed-user",
      "spoken-user",
    ]);
    expect(snapshot.events).toHaveLength(3);
    expect(snapshot.events[0]).toMatchObject({
      type: "message",
      message: {
        id: "typed-user",
      },
    });
    expect(snapshot.events[2]).toMatchObject({
      type: "actions",
    });

    clearVoiceSessionPendingActions(session.sessionId);
    expect(getVoiceSession(session.sessionId).pendingActions).toEqual([]);
  });

  it("deduplicates repeated message ids and drops expired sessions during access", () => {
    const session = createVoiceSession({
      inventionId: "telephone",
    });

    const message = createMessage("duplicate-id", "user", "Repeated message");
    appendVoiceSessionMessage(session.sessionId, message);
    appendVoiceSessionMessage(session.sessionId, message);

    expect(getVoiceSession(session.sessionId).messages).toHaveLength(1);

    getVoiceSession(session.sessionId).expiresAt = Date.now() - 1;
    expect(() => getVoiceSession(session.sessionId)).toThrow("Voice session not found");
  });
});
