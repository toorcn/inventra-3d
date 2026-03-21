import { describe, expect, it } from "vitest";
import { executeToolCalls } from "@/lib/expert-agent";

describe("executeToolCalls", () => {
  it("maps valid highlight and beam tool calls into viewer actions", () => {
    const actions = executeToolCalls("tesla-coil", [
      {
        name: "highlight_components",
        arguments: {
          componentIds: ["tesla-top-load", "invalid-id"],
          mode: "pulse",
          durationMs: 1800,
        },
      },
      {
        name: "emit_beam",
        arguments: {
          fromComponentId: "tesla-spark-gap",
          toComponentId: "tesla-top-load",
          color: "#7dd3fc",
        },
      },
    ]);

    expect(actions).toEqual([
      {
        type: "highlight",
        componentIds: ["tesla-top-load"],
        mode: "pulse",
        durationMs: 1800,
        color: undefined,
      },
      {
        type: "beam",
        fromComponentId: "tesla-spark-gap",
        toComponentId: "tesla-top-load",
        durationMs: undefined,
        color: "#7dd3fc",
        thickness: undefined,
      },
    ]);
  });

  it("drops component-scoped tool calls that reference invalid component ids", () => {
    const actions = executeToolCalls("light-bulb", [
      {
        name: "select_component",
        arguments: {
          componentId: "tesla-top-load",
        },
      },
      {
        name: "highlight_components",
        arguments: {
          componentIds: ["not-real"],
        },
      },
    ]);

    expect(actions).toEqual([]);
  });
});
