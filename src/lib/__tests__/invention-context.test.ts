import { describe, expect, it } from "vitest";
import { buildInventionContext } from "@/lib/invention-context";
import { getComponentById } from "@/data/invention-components";
import { getInventionById } from "@/data/inventions";

describe("buildInventionContext", () => {
  it("includes invention title in context", () => {
    const invention = getInventionById("iphone");
    expect(invention).toBeDefined();
    const context = buildInventionContext(invention!);
    expect(context).toContain(invention!.title);
  });

  it("includes component info when provided", () => {
    const invention = getInventionById("iphone");
    const component = getComponentById("iphone-camera");
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
