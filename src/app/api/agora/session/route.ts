import { buildAgoraSession } from "@/lib/agora";
import type { AgoraVoicePrepareRequest, AgoraVoicePrepareResponse } from "@/types";

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
