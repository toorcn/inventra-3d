import { getComponentsByInventionId } from "@/data/invention-components";
import type { Invention, InventionComponent } from "@/types";

export function buildInventionContext(
  invention: Invention,
  component?: InventionComponent,
): string {
  const components = getComponentsByInventionId(invention.id);
  const lines = [
    `You are an expert historian and engineer explaining the ${invention.title}.`,
    `Year: ${invention.year}`,
    `Inventors: ${invention.inventors.join(", ")}`,
    `Country: ${invention.country}`,
    `Category: ${invention.category}`,
    `Description: ${invention.description}`,
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

  lines.push(
    "Tone guidelines: clear, educational, and engaging for mixed audiences.",
    "Response length: 2-3 short paragraphs maximum.",
    "Always connect explanations to real-world impact.",
  );

  if (components.length > 0) {
    lines.push(
      `Component IDs: ${components.map((comp) => `${comp.id}=${comp.name}`).join(" | ")}`,
      "Visual cues are available through the chat system's structured viewer-tool layer when needed.",
    );
  }

  return lines.join("\n");
}

export function buildVoiceAgentContext(
  invention: Invention,
  component?: InventionComponent,
): string {
  const lines = [
    buildInventionContext(invention, component),
    "This conversation is happening over live voice.",
    "Speak naturally and keep each response concise enough for audio delivery.",
    "Avoid markdown, bullet points, or JSON in spoken replies.",
    "If the user asks for a visual walkthrough, describe which parts to inspect rather than mentioning hidden tools.",
    "If you are unsure, say so briefly and stay grounded in the invention context above.",
  ];

  return lines.join("\n");
}
