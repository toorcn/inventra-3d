import { hasAgoraVoiceConfig, removeAgoraAgent } from "@/lib/agora";
import { getVoiceSession, removeVoiceSession, setVoiceSessionStatus } from "@/lib/voice-session-store";
import type { VoiceAgentRemoveRequest } from "@/types";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as VoiceAgentRemoveRequest;
    if (!body.sessionId?.trim()) {
      return Response.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const session = getVoiceSession(body.sessionId.trim());
    setVoiceSessionStatus(session.sessionId, "disconnecting");

    if (session.agentId && hasAgoraVoiceConfig()) {
      try {
        await removeAgoraAgent(session.agentId);
      } catch {
        // Always clear local session state for v1 cleanup.
      }
    }

    removeVoiceSession(session.sessionId);

    return Response.json(
      { ok: true },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-cache",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown voice remove error";
    return Response.json({ error: message }, { status: 500 });
  }
}
