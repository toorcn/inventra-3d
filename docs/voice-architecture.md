# Voice Architecture

## Current Setup

```mermaid
sequenceDiagram
    participant Browser
    participant AgoraRTC as Agora RTC (Cloud)
    participant Server as Next.js Server
    participant SessionStore as In-Memory Session Store
    participant OpenRouter
    participant ElevenLabs

    %% Session creation
    Browser->>Server: POST /api/voice/session
    Server->>SessionStore: createVoiceSession()
    Server-->>Browser: { sessionId, channelName, rtcToken, appId }

    %% RTC join
    Browser->>AgoraRTC: join(appId, channelName, rtcToken)
    Browser->>AgoraRTC: publish(microphoneTrack)

    %% Agent invite
    Browser->>Server: POST /api/voice/agent/invite { sessionId }
    Server->>AgoraRTC: inviteAgoraAgent (REST API)
    AgoraRTC-->>Server: { agentId }
    Server->>SessionStore: attachVoiceSessionAgent()
    Server-->>Browser: { ok, agentId }

    %% Agent joins RTC
    AgoraRTC->>AgoraRTC: Agent joins channel, starts listening

    %% User speaks → LLM webhook
    Browser->>AgoraRTC: speak (audio)
    AgoraRTC->>AgoraRTC: ASR (speech → text)
    AgoraRTC->>Server: POST /api/voice/llm?sessionId=... (webhook)
    Server->>SessionStore: setVoiceSessionThinking()
    Server->>OpenRouter: chatCompletion (Gemini)
    OpenRouter-->>Server: text response
    Server->>SessionStore: appendVoiceSessionMessage()
    Server->>SessionStore: enqueueVoiceSessionActions()
    Server->>SessionStore: setVoiceSessionSpeaking()
    Server-->>AgoraRTC: { choices: [{ message: { content } }] }
    AgoraRTC->>ElevenLabs: TTS (text → speech)
    ElevenLabs-->>AgoraRTC: audio
    AgoraRTC->>Browser: play audio (user-published event)

    %% Agora RTC stream-message (status/transcript only)
    AgoraRTC-->>Browser: stream-message (status/partialTranscript)

    %% Browser polls for messages & actions
    loop Every 1200ms
        Browser->>Server: GET /api/voice/session?sessionId=...&cursor=N
        Server->>SessionStore: getVoiceSessionEvents(afterCursor)
        Server-->>Browser: { events, status, partialTranscript, cursor }
        Browser->>Browser: onMessages() / onActions()
    end

    %% Disconnect
    Browser->>Server: POST /api/voice/agent/remove { sessionId }
    Server->>AgoraRTC: removeAgoraAgent (REST API)
    Browser->>AgoraRTC: leave()
```

## Why Polling Exists

The Agora agent runs in **Agora's cloud**. When the LLM webhook fires, your server writes
messages and actions into the in-memory session store. The browser has no persistent
connection to receive these updates, so it polls every 1200ms.

Agora's `stream-message` RTC events only carry lightweight status/transcript signals —
not full chat messages or `ExpertAction` payloads.

## The Vercel Problem

On Vercel (serverless), each request is a separate function invocation and may land on a
different instance. The in-memory `SessionStore` is not shared across instances, which means:

- The LLM webhook and the polling endpoint could hit **different processes** with no
  shared state
- SSE with a subscriber map won't work without a shared pub/sub layer (e.g. Redis, Pusher)

## Options to Replace Polling

| Option | How | Works on Vercel? |
|--------|-----|-----------------|
| **SSE + Redis/Pusher** | Webhook publishes event; browser receives via SSE backed by pub/sub | Yes |
| **Agora stream-message** | Webhook calls Agora REST API to send data message over RTC channel | Yes |
| **Keep polling** | Move session store to Vercel KV (Redis) | Yes |
```
