import type { Invention, InventionComponent } from "@/types";

export function buildInventionContext(
  invention: Invention,
  component?: InventionComponent,
): string {
  const avatarPersona = invention.avatarPersona ?? "an expert guide";

  // Layer 1 — Base persona
  const layer1 = [
    `You are ${avatarPersona}, explaining ${invention.title} to a curious student.`,
    `Use plain language — no legal terms, no jargon.`,
    `Be enthusiastic but precise. Keep answers under 3 sentences unless asked for more.`,
    `Never say "patent claim" — translate everything to plain English.`,
  ].join("\n");

  // Layer 2 — Invention context
  const layer2Lines = [
    `You are explaining the ${invention.title}, invented in ${invention.year} in ${invention.location.label}.`,
    `Description: ${invention.description}`,
    `Patent: ${invention.patentNumber ?? "Pre-patent era"}`,
  ];
  const layer2 = layer2Lines.join("\n");

  // Layer 3 — Component (when selected)
  let layer3 = "";
  if (component) {
    layer3 = [
      `The user is currently looking at the ${component.name}.`,
      `What it does: ${component.description}`,
      `Source: ${component.patentText ?? "No patent text available"}`,
      `Reference this component specifically in your next response.`,
    ].join("\n");
  }

  const layers = [layer1, layer2];
  if (layer3) layers.push(layer3);

  return layers.join("\n\n");
}
