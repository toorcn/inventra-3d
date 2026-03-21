import { buildAgoraRtcToken, getAgoraVoiceConfig, hasAgoraVoiceConfig } from "@/lib/agora";
import {
  clearVoiceSessionPendingActions,
  createVoiceSession,
  getVoiceSession,
  getVoiceSessionEvents,
  updateVoiceSessionContext,
} from "@/lib/voice-session-store";
import type { VoiceSessionPollResponse, VoiceSessionResponse } from "@/types";

export const runtime = "nodejs";

const POLL_INTERVAL_MS = 1200;

function getDisabledVoiceResponse(message = "Live voice is not configured."): VoiceSessionResponse {
  return {
    enabled: false,
    status: "disabled",
    error: message,
  };
}

export async function GET(request: Request): Promise<Response> {
  try {
    if (!hasAgoraVoiceConfig()) {
      return Response.json(getDisabledVoiceResponse(), { status: 200 });
    }

    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId")?.trim();

    if (!sessionId) {
      const config = getAgoraVoiceConfig();
      const response: VoiceSessionResponse = {
        enabled: true,
        appId: config.appId,
        status: "idle",
        pollIntervalMs: POLL_INTERVAL_MS,
      };
      return Response.json(response, { status: 200 });
    }

    const cursorValue = url.searchParams.get("cursor");
    const cursor = cursorValue ? Number.parseInt(cursorValue, 10) : 0;
    const snapshot = getVoiceSessionEvents(sessionId, Number.isFinite(cursor) ? cursor : 0);
    clearVoiceSessionPendingActions(sessionId);

    const response: VoiceSessionPollResponse = {
      enabled: true,
      sessionId,
      status: snapshot.status,
      partialTranscript: snapshot.partialTranscript,
      cursor: snapshot.cursor,
      events: snapshot.events,
    };

    return Response.json(response, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown voice session error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    if (!hasAgoraVoiceConfig()) {
      return Response.json(getDisabledVoiceResponse(), { status: 200 });
    }

    const body = (await request.json()) as {
      inventionId?: string;
      componentId?: string | null;
      sessionId?: string;
    };

    let session;
    if (body.sessionId) {
      session = updateVoiceSessionContext(body.sessionId, {
        inventionId: body.inventionId,
        componentId: body.componentId,
      });
    } else {
      if (!body.inventionId?.trim()) {
        return Response.json({ error: "Missing inventionId" }, { status: 400 });
      }
      session = createVoiceSession({
        inventionId: body.inventionId.trim(),
        componentId: body.componentId ?? undefined,
      });
    }

    const config = getAgoraVoiceConfig();
    const response: VoiceSessionResponse = {
      enabled: true,
      sessionId: session.sessionId,
      appId: config.appId,
      channelName: session.channelName,
      rtcUid: session.rtcUid,
      rtcToken: buildAgoraRtcToken(session.channelName, session.rtcUid),
      status: session.status,
      partialTranscript: session.partialTranscript,
      cursor: session.cursor,
      pollIntervalMs: POLL_INTERVAL_MS,
    };

    return Response.json(response, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown voice session error";
    return Response.json({ error: message }, { status: 500 });
  }
}
