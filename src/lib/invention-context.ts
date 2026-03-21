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
