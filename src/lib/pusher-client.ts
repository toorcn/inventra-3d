"use client";

import type PusherJs from "pusher-js";

let _client: PusherJs | null | undefined;

export async function getPusherClient(): Promise<PusherJs | null> {
  if (_client !== undefined) return _client;

  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

  if (!key || !cluster) {
    _client = null;
    return null;
  }

  const Pusher = (await import("pusher-js")).default;
  _client = new Pusher(key, { cluster });
  return _client;
}
