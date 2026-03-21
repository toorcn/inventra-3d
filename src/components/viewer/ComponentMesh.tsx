"use client";

import { RoundedBox } from "@react-three/drei";
import type { GeometryDef } from "@/types";
import type { ComponentModel } from "@/data/models";
import { useState } from "react";
import * as THREE from "three";

interface ComponentMeshProps {
  model: ComponentModel;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

function GeometryFromDef({ def }: { def: GeometryDef }) {
  switch (def.type) {
    case "box":
      return <boxGeometry args={def.args as [number, number, number]} />;
    case "sphere":
      return <sphereGeometry args={def.args as [number, number, number]} />;
    case "cylinder":
      return <cylinderGeometry args={def.args as [number, number, number, number]} />;
    case "torus":
      return <torusGeometry args={def.args as [number, number, number, number]} />;
    case "torusKnot":
      return <torusKnotGeometry args={def.args as [number, number, number, number]} />;
    case "plane":
      return <planeGeometry args={def.args as [number, number]} />;
    case "roundedBox":
      return null;
    default:
      return <boxGeometry args={[1, 1, 1]} />;
  }
}

export function ComponentMesh({ model, isSelected, onSelect }: ComponentMeshProps) {
  const [hovered, setHovered] = useState(false);

  const handleClick = (e: { stopPropagation?: () => void }) => {
    e.stopPropagation?.();
    onSelect(model.componentId);
  };

  const scale = hovered ? 1.04 : 1;
  const emissiveColor = isSelected
    ? "#3b82f6"
    : hovered
      ? (model.emissive ?? model.color)
      : (model.emissive ?? "#000000");
  const emissiveIntensity = isSelected ? 0.6 : hovered ? 0.3 : (model.emissiveIntensity ?? 0);

  if (model.geometry.type === "roundedBox") {
    const [w = 1, h = 1, d = 1] = model.geometry.args;
    return (
      <RoundedBox
        args={[w, h, d]}
        radius={0.05}
        smoothness={4}
        scale={scale}
        rotation={model.rotation ?? [0, 0, 0]}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={handleClick}
      >
        <meshStandardMaterial
          color={model.color}
          metalness={model.metalness ?? 0.35}
          roughness={model.roughness ?? 0.45}
          transparent={model.transparent ?? false}
          opacity={model.opacity ?? 1}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
        />
      </RoundedBox>
    );
  }

  return (
    <mesh
      scale={scale}
      rotation={model.rotation ? new THREE.Euler(...model.rotation) : undefined}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={handleClick}
    >
      <GeometryFromDef def={model.geometry} />
      <meshStandardMaterial
        color={model.color}
        metalness={model.metalness ?? 0.35}
        roughness={model.roughness ?? 0.45}
        transparent={model.transparent ?? false}
        opacity={model.opacity ?? 1}
        emissive={emissiveColor}
        emissiveIntensity={emissiveIntensity}
      />
    </mesh>
  );
}
