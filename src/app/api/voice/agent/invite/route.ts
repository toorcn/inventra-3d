import { getComponentById } from "@/data/invention-components";
import { getInventionById } from "@/data/inventions";
import { inviteAgoraAgent, hasAgoraVoiceConfig } from "@/lib/agora";
import { attachVoiceSessionAgent, getVoiceSession, setVoiceSessionStatus } from "@/lib/voice-session-store";
import type { VoiceAgentInviteRequest, VoiceAgentInviteResponse } from "@/types";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    if (!hasAgoraVoiceConfig()) {
      return Response.json({ error: "Live voice is not configured." }, { status: 400 });
    }

    const body = (await request.json()) as VoiceAgentInviteRequest;
    if (!body.sessionId?.trim()) {
      return Response.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const session = getVoiceSession(body.sessionId.trim());
    const invention = getInventionById(session.inventionId);

    if (!invention) {
      return Response.json({ error: "Invention not found" }, { status: 404 });
    }

    setVoiceSessionStatus(session.sessionId, "connecting");
    const component =
      session.componentId && session.componentId.trim().length > 0
        ? getComponentById(session.componentId)
        : undefined;
    const agentId = await inviteAgoraAgent(session, invention, component);
    attachVoiceSessionAgent(session.sessionId, agentId);

    const response: VoiceAgentInviteResponse = {
      ok: true,
      agentId,
    };

    return Response.json(response, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown voice invite error";
    return Response.json({ error: message }, { status: 500 });
  }
}
