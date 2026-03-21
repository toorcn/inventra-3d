import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import ModelViewerClient from "@/components/viewer/ModelViewerClient";

vi.mock("@react-three/fiber", () => ({
  Canvas: ({
    children,
    ...props
  }: {
    children: ReactNode;
    [key: string]: unknown;
  }) => createElement("div", { "data-testid": "canvas", ...props }, children),
}));

vi.mock("@react-three/drei", () => ({
  ContactShadows: (props: Record<string, unknown>) =>
    createElement("div", { "data-testid": "shadows", ...props }),
  Environment: (props: Record<string, unknown>) =>
    createElement("div", { "data-testid": "environment", ...props }),
  OrbitControls: (props: Record<string, unknown>) =>
    createElement("div", {
      "data-testid": "orbit-controls",
      "data-autorotate": String(props.autoRotate),
    }),
}));

vi.mock("@/components/viewer/InventionModel", () => ({
  InventionModel: (props: Record<string, unknown>) =>
    createElement("div", { "data-testid": "invention-model", ...props }),
}));

vi.mock("@/data/models", () => ({
  getModelDefinitionByInventionId: () => ({
    cameraPosition: [0, 1.2, 5],
    cameraTarget: [0, 0, 0],
    components: [],
  }),
}));

describe("ModelViewerClient", () => {
  it("disables auto-rotate while gesture tracking is active", () => {
    render(
      <ModelViewerClient
        inventionId="iphone"
        isExploded={false}
        viewerTransform={{ rotationX: 0.2, rotationY: 0.4 }}
        gestureTrackingActive
        selectedComponentId={null}
        onComponentSelect={vi.fn()}
      />,
    );

    expect(screen.getByTestId("orbit-controls").getAttribute("data-autorotate")).toBe(
      "false",
    );
  });
});
