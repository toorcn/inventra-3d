import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { ChatPanel } from "@/components/expert/ChatPanel";
import type { ChatMessage, ChatResponse } from "@/types";

if (!("scrollTo" in HTMLElement.prototype)) {
  Object.defineProperty(HTMLElement.prototype, "scrollTo", {
    value: vi.fn(),
    writable: true,
  });
}

function renderChatPanel(overrides: Partial<ComponentProps<typeof ChatPanel>> = {}) {
  const defaultMessages: ChatMessage[] = [
    {
      id: "intro",
      role: "assistant",
      content: "Welcome to the live expert.",
      timestamp: Date.now(),
    },
  ];
  const defaultResponse: ChatResponse = {
    content: "Answer",
    actions: [],
  };
  const onSendMessage = vi.fn().mockResolvedValue(defaultResponse);

  return render(
    createElement(ChatPanel, {
      messages: defaultMessages,
      isLoading: false,
      isSpeaking: false,
      suggestedQuestions: ["How does it work?"],
      voiceStatus: "idle",
      voiceError: null,
      voicePartialTranscript: null,
      onSendMessage,
      onToggleVoiceConnection: vi.fn(),
      ...overrides,
    }),
  );
}

describe("ChatPanel", () => {
  it("disables the live voice control when voice is unavailable", () => {
    renderChatPanel({
      voiceStatus: "disabled",
      voiceError: "Missing Agora configuration",
    });

    const button = screen.getByRole("button", { name: "Unavailable" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Live voice is unavailable/i)).toBeTruthy();
    expect(screen.getByText(/Missing Agora configuration/i)).toBeTruthy();
  });

  it("shows the live transcript banner while keeping typed input available", () => {
    const typedResponse: ChatResponse = {
      content: "Typed answer",
      actions: [],
    };
    const onSendMessage = vi.fn().mockResolvedValue(typedResponse);

    renderChatPanel({
      voiceStatus: "listening",
      voicePartialTranscript: "show me the transmitter",
      onSendMessage,
    });

    expect(screen.getByText(/Live transcript: show me the transmitter/i)).toBeTruthy();

    const input = screen.getByPlaceholderText("Type a question...");
    fireEvent.change(input, { target: { value: "Tell me more" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSendMessage).toHaveBeenCalledWith("Tell me more", { delivery: "typed" });
  });
});
