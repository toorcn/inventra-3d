import Pusher from "pusher";

declare global {
  var __inventornetPusherServer__: Pusher | null | undefined;
}

function createPusherServer(): Pusher | null {
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER;

  if (!appId || !key || !secret || !cluster) return null;

  return new Pusher({ appId, key, secret, cluster, useTLS: true });
}

export const pusherServer: Pusher | null =
  globalThis.__inventornetPusherServer__ ??
  (globalThis.__inventornetPusherServer__ = createPusherServer());

export function hasPusherConfig(): boolean {
  return pusherServer !== null;
}

export function voiceChannel(sessionId: string): string {
  return `voice-${sessionId}`;
}
