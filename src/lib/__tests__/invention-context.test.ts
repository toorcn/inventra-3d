import { describe, expect, it } from "vitest";
import { buildInventionContext } from "@/lib/invention-context";
import { getComponentById } from "@/data/invention-components";
import { getInventionById } from "@/data/inventions";

describe("buildInventionContext", () => {
  it("includes invention title and persona in context", () => {
    const invention = getInventionById("telephone");
    expect(invention).toBeDefined();
    const context = buildInventionContext(invention!);
    expect(context).toContain(invention!.title);
    expect(context).toContain(invention!.avatarPersona);
  });

  it("includes component name and description when a component is selected", () => {
    const invention = getInventionById("telephone");
    const component = getComponentById("telephone-diaphragm");
    expect(invention).toBeDefined();
    expect(component).toBeDefined();
    const context = buildInventionContext(invention!, component!);
    expect(context).toContain(component!.name);
    expect(context).toContain(component!.description);
  });

  it("includes year and inventor names", () => {
    const invention = getInventionById("steam-engine");
    expect(invention).toBeDefined();
    const context = buildInventionContext(invention!);
    expect(context).toContain(String(invention!.year));
    expect(context).toContain(invention!.inventors[0]);
  });
});
