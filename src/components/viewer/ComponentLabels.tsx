"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";
import type { InventionComponent } from "@/types";

interface ComponentLabelsProps {
  components: InventionComponent[];
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  renderer: THREE.WebGLRenderer | null;
  isExploded: boolean;
  selectedComponentId: string | null;
  onSelect: (component: InventionComponent) => void;
}

interface LabelEntry {
  component: InventionComponent;
  x: number;
  y: number;
}

export default function ComponentLabels({
  components,
  scene,
  camera,
  renderer,
  isExploded,
  selectedComponentId,
  onSelect,
}: ComponentLabelsProps) {
  const [labels, setLabels] = useState<LabelEntry[]>([]);

  useEffect(() => {
    if (!isExploded) {
      setLabels([]);
      return;
    }

    const intervalId = setInterval(() => {
      if (!scene || !camera || !renderer) return;

      const size = new THREE.Vector2();
      renderer.getSize(size);
      const width = size.x;
      const height = size.y;

      const newLabels: LabelEntry[] = [];

      // Build a map of component id -> component for quick lookup
      const componentMap = new Map<string, InventionComponent>();
      components.forEach((c) => componentMap.set(c.id, c));

      scene.traverse((object) => {
        if (!(object as THREE.Mesh).isMesh) return;
        const mesh = object as THREE.Mesh;

        // Try to match by mesh name or userData.componentData
        let comp: InventionComponent | null = null;

        const ud = mesh.userData as { componentData?: InventionComponent | null };
        if (ud.componentData) {
          comp = ud.componentData;
        } else if (componentMap.has(mesh.name)) {
          comp = componentMap.get(mesh.name)!;
        } else if (componentMap.has(mesh.name.toLowerCase())) {
          comp = componentMap.get(mesh.name.toLowerCase())!;
        }

        if (!comp) return;

        // Get world position of the mesh
        const worldPos = new THREE.Vector3();
        mesh.getWorldPosition(worldPos);

        // Project to NDC
        const projected = worldPos.clone().project(camera);

        // Convert NDC to pixel coords
        const x = (projected.x * 0.5 + 0.5) * width;
        const y = (-projected.y * 0.5 + 0.5) * height;

        // Skip if behind camera (z > 1 in NDC)
        if (projected.z > 1) return;

        newLabels.push({ component: comp, x, y });
      });

      setLabels(newLabels);
    }, 100);

    return () => clearInterval(intervalId);
  }, [isExploded, scene, camera, renderer, components]);

  if (!isExploded) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {labels.map((label) => {
        const isSelected = selectedComponentId === label.component.id;
        return (
          <div
            key={label.component.id}
            style={{
              position: "absolute",
              left: label.x,
              top: label.y,
              transform: `translate(-50%, -120%) scale(${isSelected ? 1.1 : 1})`,
              transition: "transform 0.15s ease, background-color 0.15s ease",
            }}
            className={`pointer-events-auto cursor-pointer rounded-lg px-3 py-1.5 text-xs text-white backdrop-blur-sm ${
              isSelected ? "bg-[#2563EB]/80" : "bg-black/60"
            }`}
            onClick={() => onSelect(label.component)}
          >
            {label.component.name}
          </div>
        );
      })}
    </div>
  );
}
