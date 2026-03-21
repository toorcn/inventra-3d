import { getComponentsByInventionId } from "./invention-components";
import type { GeometryDef } from "@/types";

export interface ComponentModel {
  componentId: string;
  geometry: GeometryDef;
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
    rotation: component.geometry.rotation,
    color: component.color,
    metalness: 0.35,
    roughness: 0.45,
    transparent: component.id.includes("envelope"),
    opacity: component.id.includes("envelope") ? 0.45 : 1,
    emissive:
      component.id.includes("filament") || component.id.includes("spark")
        ? "#f59e0b"
        : undefined,
    emissiveIntensity:
      component.id.includes("filament") || component.id.includes("spark") ? 0.4 : 0,
  }));
}

export const modelDefinitions: ModelDefinition[] = [
  {
    inventionId: "iphone",
    components: buildComponentModels("iphone"),
    cameraPosition: [0, 0.8, 4],
    cameraTarget: [0, 0, 0],
  },
  {
    inventionId: "macintosh",
    components: buildComponentModels("macintosh"),
    cameraPosition: [0, 0.95, 6],
    cameraTarget: [0, 0.35, 0],
  },
  {
    inventionId: "light-bulb",
    components: buildComponentModels("light-bulb"),
    cameraPosition: [0, 1.2, 4],
    cameraTarget: [0, 0.4, 0],
  },
  {
    inventionId: "tesla-coil",
    components: buildComponentModels("tesla-coil"),
    cameraPosition: [0, 1.8, 5],
    cameraTarget: [0, 0.8, 0],
  },
  {
    inventionId: "wright-flyer",
    components: buildComponentModels("wright-flyer"),
    cameraPosition: [0, 1.4, 6],
    cameraTarget: [0, 0.3, 0],
  },
  {
    inventionId: "steam-engine",
    components: buildComponentModels("steam-engine"),
    cameraPosition: [0, 1.2, 5],
    cameraTarget: [0, 0.4, 0],
  },
];

export function getModelDefinitionByInventionId(
  inventionId: string,
): ModelDefinition | undefined {
  return modelDefinitions.find((model) => model.inventionId === inventionId);
}
