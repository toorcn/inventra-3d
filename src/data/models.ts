import { getComponentsByInventionId } from "./invention-components";
import type { GeometryDef } from "@/types";

export interface ComponentModel {
  componentId: string;
  geometry?: GeometryDef;
  assembledPosition: [number, number, number];
  explodedPosition: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  color: string;
  metalness?: number;
  roughness?: number;
  transparent?: boolean;
  opacity?: number;
  emissive?: string;
  emissiveIntensity?: number;
}

export interface ModelDefinition {
  inventionId: string;
  components: ComponentModel[];
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
}

function buildComponentModels(inventionId: string): ComponentModel[] {
  return getComponentsByInventionId(inventionId).map((component) => ({
    componentId: component.id,
    geometry: component.geometry,
    assembledPosition: component.assembledPosition,
    explodedPosition: component.explodedPosition,
    rotation: component.geometry?.rotation,
    color: component.color,
    metalness: 0.35,
    roughness: 0.45,
    transparent: false,
    opacity: 1,
  }));
}

export const modelDefinitions: ModelDefinition[] = [
  {
    inventionId: "telephone",
    components: buildComponentModels("telephone"),
    cameraPosition: [0, 1.0, 4],
    cameraTarget: [0, 0, 0],
  },
  {
    inventionId: "iphone",
    components: buildComponentModels("iphone"),
    cameraPosition: [0, 0.8, 4],
    cameraTarget: [0, 0, 0],
  },
  {
    inventionId: "steam-engine",
    components: buildComponentModels("steam-engine"),
    cameraPosition: [0, 1.2, 5],
    cameraTarget: [0, 0.4, 0],
  },
  {
    inventionId: "telescope",
    components: buildComponentModels("telescope"),
    cameraPosition: [0, 0.5, 5],
    cameraTarget: [0, 0, 0],
  },
];

export function getModelDefinitionByInventionId(
  inventionId: string,
): ModelDefinition | undefined {
  return modelDefinitions.find((model) => model.inventionId === inventionId);
}
