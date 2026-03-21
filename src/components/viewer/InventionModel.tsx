"use client";

import { ComponentMesh } from "./ComponentMesh";
import { ExplodedView } from "./ExplodedView";
import { getModelDefinitionByInventionId } from "@/data/models";

interface InventionModelProps {
  inventionId: string;
  isExploded: boolean;
  selectedComponentId: string | null;
  highlightMap?: Record<string, { color?: string; mode?: "glow" | "pulse" }>;
  onComponentSelect: (id: string) => void;
}

export function InventionModel({
  inventionId,
  isExploded,
  selectedComponentId,
  highlightMap,
  onComponentSelect,
}: InventionModelProps) {
  const definition = getModelDefinitionByInventionId(inventionId);

  if (!definition) return null;

  return (
    <group>
      {definition.components.map((comp) => (
        <ExplodedView
          key={comp.componentId}
          assembledPosition={comp.assembledPosition}
          explodedPosition={comp.explodedPosition}
          isExploded={isExploded}
        >
          <ComponentMesh
            model={comp}
            isSelected={selectedComponentId === comp.componentId}
            highlight={highlightMap?.[comp.componentId]}
            onSelect={onComponentSelect}
          />
        </ExplodedView>
      ))}
    </group>
  );
}
