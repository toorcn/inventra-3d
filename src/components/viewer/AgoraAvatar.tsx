"use client";

import { IAgoraRTCClient } from "agora-rtc-sdk-ng";
import { useEffect, useRef, useState } from "react";

interface AgoraAvatarProps {
  client: IAgoraRTCClient | null;
  personaName?: string;
}

export default function AgoraAvatar({ client, personaName = "Expert" }: AgoraAvatarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    setIsConnected(!!client);
  }, [client]);

  return (
    <div
      ref={containerRef}
      className="absolute right-4 top-4 rounded-xl border border-[#2563EB]/30 bg-black/60 p-4 backdrop-blur-sm w-32 h-40"
    >
      {isConnected ? (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center">
            <div className="text-sm text-white/80">Video Stream</div>
            <div className="text-xs text-white/50 mt-1">Connected</div>
          </div>
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2563EB] to-[#1e40af] flex items-center justify-center mb-2">
            <span className="text-xl">🧠</span>
          </div>
          <div className="text-xs font-medium text-white/90 text-center truncate">
            {personaName}
          </div>
          <div className="text-xs text-white/50 mt-1">Offline</div>
        </div>
      )}
    </div>
  );
}
