import { describe, expect, it } from "vitest";
import { getComponentsByInventionId } from "@/data/invention-components";
import { getInventionById } from "@/data/inventions";
import { getModelDefinitionByInventionId } from "@/data/models";

const macintoshComponentIds = [
  "macintosh-case",
  "macintosh-screen",
  "macintosh-crt",
  "macintosh-floppy-drive",
  "macintosh-logic-board",
  "macintosh-analog-board",
  "macintosh-speaker",
];

describe("macintosh seeded data", () => {
  it("registers the macintosh as a modeled computing invention", () => {
    const invention = getInventionById("macintosh");

    expect(invention).toBeDefined();
    expect(invention).toMatchObject({
      id: "macintosh",
      category: "computing",
      hasModel: true,
    });
  });

  it("returns the seeded macintosh components in the defined order", () => {
    const components = getComponentsByInventionId("macintosh");

    expect(components.map((component) => component.id)).toEqual(macintoshComponentIds);
  });

  it("builds a macintosh model definition with matching component ids", () => {
    const modelDefinition = getModelDefinitionByInventionId("macintosh");

    expect(modelDefinition).toBeDefined();
    expect(modelDefinition?.components.map((component) => component.componentId)).toEqual(
      macintoshComponentIds,
    );
  });
});
