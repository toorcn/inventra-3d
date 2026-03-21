import {
  buildAgoraSession,
  startAgoraAgent,
  stopAgoraAgent,
} from "@/lib/agora";
import type {
  AgoraVoicePrepareRequest,
  AgoraVoicePrepareResponse,
  AgoraVoiceStartRequest,
  AgoraVoiceStartResponse,
  AgoraVoiceStopRequest,
} from "@/types";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as AgoraVoicePrepareRequest;
    const session = buildAgoraSession(body.inventionId);

    const response: AgoraVoicePrepareResponse = {
      appId: session.appId,
      channelName: session.channelName,
      token: session.token,
      userRtcUid: session.userRtcUid,
      expiresAt: session.expiresAt,
    };

    return Response.json(response, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Agora session error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as AgoraVoiceStartRequest;
    const agentId = await startAgoraAgent(body);
    const response: AgoraVoiceStartResponse = { agentId };

    return Response.json(response, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Agora voice start error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as AgoraVoiceStopRequest;
    await stopAgoraAgent(body.agentId);

    return Response.json({}, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Agora voice stop error";
    return Response.json({ error: message }, { status: 500 });
  }
}
