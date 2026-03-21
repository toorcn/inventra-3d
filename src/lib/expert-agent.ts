import { getComponentsByInventionId } from "@/data/invention-components";
import type { Invention, InventionComponent } from "@/types";
import type { ExpertAction } from "@/types";
import { chatCompletion, hasOpenRouterApiKey, structuredOutput, type OpenRouterMessage } from "./openrouter";

type ToolName =
  | "highlight_components"
  | "select_component"
  | "explode_model"
  | "assemble_model"
  | "reset_viewer"
  | "emit_beam";

type ToolCall =
  | {
      name: "highlight_components";
      arguments: {
        componentIds: string[];
        durationMs?: number;
        color?: string;
        mode?: "glow" | "pulse";
      };
    }
  | {
      name: "select_component";
      arguments: {
        componentId: string;
        durationMs?: number;
      };
    }
  | {
      name: "explode_model" | "assemble_model" | "reset_viewer";
      arguments: Record<string, never>;
    }
  | {
      name: "emit_beam";
      arguments: {
        fromComponentId: string;
        toComponentId: string;
        durationMs?: number;
        color?: string;
        thickness?: number;
      };
    };

type AgentModelResponse = {
  reply: string;
  toolCalls: Array<{
    name: ToolName;
    arguments?: Record<string, unknown>;
  }>;
};

export interface ExpertAgentResult {
  content: string;
  actions: ExpertAction[];
}

function buildToolInstructions(invention: Invention, component?: InventionComponent): string {
  const components = getComponentsByInventionId(invention.id);
  const lines = [
    `You are an expert historian and engineer explaining the ${invention.title}.`,
    `Year: ${invention.year}`,
    `Inventors: ${invention.inventors.join(", ")}`,
    `Country: ${invention.country}`,
    `Category: ${invention.category}`,
    `Description: ${invention.description}`,
    "Tone guidelines: clear, educational, and engaging for mixed audiences.",
    "Response length: 2-3 short paragraphs maximum.",
    "Always connect explanations to real-world impact.",
    "Available viewer tools are listed below. Use them only when the visual cue materially helps the explanation.",
  ];

  if (invention.patentNumber) {
    lines.push(`Patent: ${invention.patentNumber}`);
  }

  if (component) {
    lines.push(`Focused component: ${component.name}`);
    lines.push(`Component function: ${component.description}`);
    lines.push(`Materials: ${component.materials.join(", ")}`);
    if (component.patentText) {
      lines.push(`Relevant technical text: ${component.patentText}`);
    }
  }

  if (components.length > 0) {
    lines.push(`Component IDs: ${components.map((item) => `${item.id}=${item.name}`).join(" | ")}`);
    lines.push("Tool: highlight_components { componentIds, durationMs?, color?, mode? }");
    lines.push("Tool: select_component { componentId, durationMs? }");
    lines.push("Tool: explode_model {}");
    lines.push("Tool: assemble_model {}");
    lines.push("Tool: reset_viewer {}");
    lines.push("Tool: emit_beam { fromComponentId, toComponentId, durationMs?, color?, thickness? }");
  } else {
    lines.push("No viewer tools are available for this invention because there is no 3D model.");
  }

  return lines.join("\n");
}

function toStructuredToolCall(raw: AgentModelResponse["toolCalls"][number]): ToolCall | null {
  const args = raw.arguments ?? {};

  if (raw.name === "highlight_components") {
    if (!Array.isArray(args.componentIds) || !args.componentIds.every((id) => typeof id === "string")) {
      return null;
    }
    return {
      name: raw.name,
      arguments: {
        componentIds: args.componentIds,
        durationMs: typeof args.durationMs === "number" ? args.durationMs : undefined,
        color: typeof args.color === "string" ? args.color : undefined,
        mode: args.mode === "glow" || args.mode === "pulse" ? args.mode : undefined,
      },
    };
  }

  if (raw.name === "select_component") {
    if (typeof args.componentId !== "string") {
      return null;
    }
    return {
      name: raw.name,
      arguments: {
        componentId: args.componentId,
        durationMs: typeof args.durationMs === "number" ? args.durationMs : undefined,
      },
    };
  }

  if (raw.name === "explode_model" || raw.name === "assemble_model" || raw.name === "reset_viewer") {
    return {
      name: raw.name,
      arguments: {},
    };
  }

  if (raw.name === "emit_beam") {
    if (typeof args.fromComponentId !== "string" || typeof args.toComponentId !== "string") {
      return null;
    }
    return {
      name: raw.name,
      arguments: {
        fromComponentId: args.fromComponentId,
        toComponentId: args.toComponentId,
        durationMs: typeof args.durationMs === "number" ? args.durationMs : undefined,
        color: typeof args.color === "string" ? args.color : undefined,
        thickness: typeof args.thickness === "number" ? args.thickness : undefined,
      },
    };
  }

  return null;
}

export function executeToolCalls(inventionId: string, toolCalls: ToolCall[]): ExpertAction[] {
  const componentIds = new Set(getComponentsByInventionId(inventionId).map((item) => item.id));
  const actions: ExpertAction[] = [];

  for (const toolCall of toolCalls) {
    if (toolCall.name === "highlight_components") {
      const validIds = toolCall.arguments.componentIds.filter((id) => componentIds.has(id));
      if (validIds.length > 0) {
        actions.push({
          type: "highlight",
          componentIds: validIds,
          durationMs: toolCall.arguments.durationMs,
          color: toolCall.arguments.color,
          mode: toolCall.arguments.mode,
        });
      }
      continue;
    }

    if (toolCall.name === "select_component") {
      if (componentIds.has(toolCall.arguments.componentId)) {
        actions.push({
          type: "select",
          componentId: toolCall.arguments.componentId,
          durationMs: toolCall.arguments.durationMs,
        });
      }
      continue;
    }

    if (toolCall.name === "explode_model") {
      actions.push({ type: "explode" });
      continue;
    }

    if (toolCall.name === "assemble_model") {
      actions.push({ type: "assemble" });
      continue;
    }

    if (toolCall.name === "reset_viewer") {
      actions.push({ type: "reset" });
      continue;
    }

    if (
      componentIds.has(toolCall.arguments.fromComponentId) &&
      componentIds.has(toolCall.arguments.toComponentId)
    ) {
      actions.push({
        type: "beam",
        fromComponentId: toolCall.arguments.fromComponentId,
        toComponentId: toolCall.arguments.toComponentId,
        durationMs: toolCall.arguments.durationMs,
        color: toolCall.arguments.color,
        thickness: toolCall.arguments.thickness,
      });
    }
  }

  return actions;
}

export async function runExpertAgent(
  invention: Invention,
  messages: OpenRouterMessage[],
  component?: InventionComponent,
): Promise<ExpertAgentResult> {
  const systemPrompt = buildToolInstructions(invention, component);

  if (!hasOpenRouterApiKey()) {
    const content = await chatCompletion([
      { role: "system", content: systemPrompt },
      ...messages,
    ]);
    return { content, actions: [] };
  }

  const schema = {
    type: "object",
    properties: {
      reply: { type: "string" },
      toolCalls: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              enum: [
                "highlight_components",
                "select_component",
                "explode_model",
                "assemble_model",
                "reset_viewer",
                "emit_beam",
              ],
            },
            arguments: {
              type: "object",
              additionalProperties: true,
            },
          },
          required: ["name", "arguments"],
          additionalProperties: false,
        },
      },
    },
    required: ["reply", "toolCalls"],
    additionalProperties: false,
  } satisfies Record<string, unknown>;

  const parsed = await structuredOutput<AgentModelResponse>(
    [
      {
        role: "system",
        content: `${systemPrompt}

Return JSON with:
- reply: the visible answer to the user
- toolCalls: an array of zero or more tool calls

Do not include any tool syntax in reply.`,
      },
      ...messages,
    ],
    schema,
    { temperature: 0.2, max_tokens: 700 },
  );

  const toolCalls = parsed.toolCalls
    .map(toStructuredToolCall)
    .filter((value): value is ToolCall => value !== null);

  return {
    content: parsed.reply,
    actions: executeToolCalls(invention.id, toolCalls),
  };
}
