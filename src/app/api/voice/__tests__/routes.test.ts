import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getSessionRoute, POST as postSessionRoute } from "@/app/api/voice/session/route";
import { POST as inviteAgentRoute } from "@/app/api/voice/agent/invite/route";
import { POST as removeAgentRoute } from "@/app/api/voice/agent/remove/route";
import { POST as llmRoute } from "@/app/api/voice/llm/route";
import {
  createVoiceSession,
  getVoiceSession,
  getVoiceSessionEvents,
  resetVoiceSessionsForTests,
} from "@/lib/voice-session-store";

const trackedKeys = [
  "NEXT_PUBLIC_AGORA_APP_ID",
  "AGORA_APP_CERTIFICATE",
  "AGORA_CUSTOMER_ID",
  "AGORA_CUSTOMER_SECRET",
  "ELEVENLABS_API_KEY",
  "ELEVENLABS_VOICE_ID",
  "ELEVENLABS_MODEL_ID",
  "NEXT_PUBLIC_APP_URL",
  "OPENROUTER_API_KEY",
] as const;

const originalValues = Object.fromEntries(
  trackedKeys.map((key) => [key, process.env[key]]),
) as Record<(typeof trackedKeys)[number], string | undefined>;

function setConfiguredVoiceEnv() {
  process.env.NEXT_PUBLIC_AGORA_APP_ID = "test-app-id";
  process.env.AGORA_APP_CERTIFICATE = "test-app-certificate";
  process.env.AGORA_CUSTOMER_ID = "test-customer-id";
  process.env.AGORA_CUSTOMER_SECRET = "test-customer-secret";
  process.env.ELEVENLABS_API_KEY = "test-elevenlabs-key";
  process.env.ELEVENLABS_VOICE_ID = "test-voice-id";
  process.env.ELEVENLABS_MODEL_ID = "test-model-id";
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  delete process.env.OPENROUTER_API_KEY;
}

beforeEach(() => {
  vi.restoreAllMocks();
  setConfiguredVoiceEnv();
});

afterEach(() => {
  trackedKeys.forEach((key) => {
    const value = originalValues[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  });
  resetVoiceSessionsForTests();
});

describe("voice routes", () => {
  it("returns disabled metadata when Agora voice config is missing", async () => {
    trackedKeys.forEach((key) => {
      delete process.env[key];
    });

    const response = await getSessionRoute(new Request("http://localhost/api/voice/session"));
    const payload = (await response.json()) as { enabled: boolean; status: string };

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      enabled: false,
      status: "disabled",
    });
  });

  it("creates a live session and returns Agora join metadata", async () => {
    const response = await postSessionRoute(
      new Request("http://localhost/api/voice/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inventionId: "telephone",
        }),
      }),
    );

    const payload = (await response.json()) as {
      enabled: boolean;
      sessionId?: string;
      channelName?: string;
      appId?: string;
      rtcUid?: number;
    };

    expect(response.status).toBe(200);
    expect(payload.enabled).toBe(true);
    expect(payload.sessionId).toBeTruthy();
    expect(payload.channelName).toContain("inventra-");
    expect(payload.appId).toBe("test-app-id");
    expect(typeof payload.rtcUid).toBe("number");
    expect(typeof payload.rtcToken).toBe("string");
    expect(payload.rtcToken?.length).toBeGreaterThan(10);
  });

  it("builds the expected Agora invite payload and stores the agent id", async () => {
    const session = createVoiceSession({
      inventionId: "telephone",
    });

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ agent_id: "agent-123" }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await inviteAgentRoute(
      new Request("http://localhost/api/voice/agent/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: session.sessionId,
        }),
      }),
    );

    const payload = (await response.json()) as { ok: boolean; agentId: string };
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const requestBody = JSON.parse(String(init.body)) as {
      properties: {
        token: string;
        llm: {
          url: string;
          api_key: string;
        };
        tts: {
          vendor: string;
          params: {
            voice_id: string;
          };
        };
      };
    };

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      agentId: "agent-123",
    });
    expect(url).toContain("/join");
    expect(requestBody.properties.llm.url).toContain(`/api/voice/llm?sessionId=${session.sessionId}`);
    expect(requestBody.properties.llm.api_key).toBe(session.llmApiKey);
    expect(requestBody.properties.token.length).toBeGreaterThan(10);
    expect(requestBody.properties.tts.vendor).toBe("elevenlabs");
    expect(requestBody.properties.tts.params.voice_id).toBe("test-voice-id");
    expect(getVoiceSession(session.sessionId).agentId).toBe("agent-123");
  });

  it("converts a spoken webhook turn into a final assistant reply and stores the turn history", async () => {
    const session = createVoiceSession({
      inventionId: "telephone",
    });

    const response = await llmRoute(
      new Request(`http://localhost/api/voice/llm?sessionId=${session.sessionId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.llmApiKey}`,
        },
        body: JSON.stringify({
          model: "test-model",
          messages: [
            {
              role: "user",
              content: "How does the telephone work?",
            },
          ],
        }),
      }),
    );

    const payload = (await response.json()) as {
      choices: Array<{
        message: {
          content: string;
        };
      }>;
    };
    const snapshot = getVoiceSessionEvents(session.sessionId);

    expect(response.status).toBe(200);
    expect(payload.choices[0].message.content).toContain("offline mode");
    expect(snapshot.events.filter((event) => event.type === "message")).toHaveLength(2);
    expect(getVoiceSession(session.sessionId).messages).toHaveLength(2);
  });

  it("removes the live session and calls Agora leave when the agent is active", async () => {
    const session = createVoiceSession({
      inventionId: "telephone",
    });
    session.agentId = "agent-456";

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await removeAgentRoute(
      new Request("http://localhost/api/voice/agent/remove", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: session.sessionId,
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toContain(`/agents/${session.agentId}/leave`);
    expect(() => getVoiceSession(session.sessionId)).toThrow("Voice session not found");
  });
});
