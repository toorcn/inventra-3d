import { task, logger } from "@trigger.dev/sdk/v3";
import type { FigureInfo } from "./identify-figures";

export interface CalculatePositionsPayload {
  figures: FigureInfo[];
  meshCount: number;
}

export interface ComponentPosition {
  assembledPosition: [number, number, number];
  explodedPosition: [number, number, number];
}

export interface CalculatePositionsOutput {
  components: ComponentPosition[];
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
}

const SPATIAL_OFFSETS: Record<string, [number, number, number]> = {
  center: [0, 0, 0],
  top: [0, 1, 0],
  bottom: [0, -1, 0],
  left: [-1, 0, 0],
  right: [1, 0, 0],
  front: [0, 0, 1],
  back: [0, 0, -1],
};

export const calculatePositionsTask = task({
  id: "calculate-positions",
  retry: { maxAttempts: 1 },
  run: async (payload: CalculatePositionsPayload): Promise<CalculatePositionsOutput> => {
    logger.info("Calculating positions", { meshCount: payload.meshCount });

    const components: ComponentPosition[] = [];
    const count = Math.min(payload.figures.length, payload.meshCount);

    for (let i = 0; i < count; i++) {
      const figure = payload.figures[i];
      const hint = figure.spatialHint ?? "center";
      const offset = SPATIAL_OFFSETS[hint] ?? SPATIAL_OFFSETS.center;

      // Assembled: components packed together based on spatial hints
      const assembledPosition: [number, number, number] = [
        offset[0] * 0.5,
        offset[1] * 0.5,
        offset[2] * 0.5,
      ];

      // Exploded: spread components outward radially
      const angle = (i / count) * Math.PI * 2;
      const explodeRadius = 2.5;
      const explodedPosition: [number, number, number] = [
        offset[0] * explodeRadius + Math.cos(angle) * (hint === "center" ? explodeRadius : 0.5),
        offset[1] * explodeRadius,
        offset[2] * explodeRadius + Math.sin(angle) * (hint === "center" ? explodeRadius : 0.5),
      ];

      components.push({ assembledPosition, explodedPosition });
    }

    // Camera positioned to see all components
    const cameraPosition: [number, number, number] = [0, 1.5, 5];
    const cameraTarget: [number, number, number] = [0, 0, 0];

    logger.info("Positions calculated", { componentCount: components.length });
    return { components, cameraPosition, cameraTarget };
  },
});
