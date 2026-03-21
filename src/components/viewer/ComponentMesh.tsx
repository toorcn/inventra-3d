"use client";

import { RoundedBox } from "@react-three/drei";
import { animated, useSpring } from "@react-spring/three";
import type { GeometryDef } from "@/types";
import type { ComponentModel } from "@/data/models";
import { useState } from "react";
import * as THREE from "three";

interface ComponentMeshProps {
  model: ComponentModel;
  isSelected: boolean;
  highlight?: { color?: string; mode?: "glow" | "pulse" };
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

export function ComponentMesh({ model, isSelected, highlight, onSelect }: ComponentMeshProps) {
  const [hovered, setHovered] = useState(false);

  const handleClick = (e: { stopPropagation?: () => void }) => {
    e.stopPropagation?.();
    onSelect(model.componentId);
  };

  const isHighlighted = Boolean(highlight);
  const scaleBase = hovered ? 1.04 : 1;
  const emissiveColor = isSelected
    ? "#3b82f6"
    : isHighlighted
      ? (highlight?.color ?? "#38bdf8")
      : hovered
        ? (model.emissive ?? model.color)
        : (model.emissive ?? "#000000");
  const emissiveBase = isSelected ? 0.6 : isHighlighted ? 0.45 : hovered ? 0.3 : (model.emissiveIntensity ?? 0);
  const isPulsing = isHighlighted && highlight?.mode === "pulse" && !isSelected;
  const { pulse } = useSpring({
    pulse: isPulsing ? 1 : 0,
    loop: isPulsing ? { reverse: true } : false,
    config: { tension: 120, friction: 14 },
  });
  const animatedScale = pulse.to((p) => scaleBase * (1 + p * 0.05));
  const animatedEmissiveIntensity = pulse.to((p) => emissiveBase + p * 0.35);

  if (model.geometry.type === "roundedBox") {
    const [w = 1, h = 1, d = 1] = model.geometry.args;
    const AnimatedRoundedBox = animated(RoundedBox);
    return (
      <AnimatedRoundedBox
        args={[w, h, d]}
        radius={0.05}
        smoothness={4}
        scale={animatedScale}
        rotation={model.rotation ?? [0, 0, 0]}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={handleClick}
      >
        <animated.meshStandardMaterial
          color={model.color}
          metalness={model.metalness ?? 0.35}
          roughness={model.roughness ?? 0.45}
          transparent={model.transparent ?? false}
          opacity={model.opacity ?? 1}
          emissive={emissiveColor}
          emissiveIntensity={animatedEmissiveIntensity}
        />
      </AnimatedRoundedBox>
    );
  }

  return (
    <animated.mesh
      scale={animatedScale}
      rotation={model.rotation ? new THREE.Euler(...model.rotation) : undefined}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={handleClick}
    >
      <GeometryFromDef def={model.geometry} />
      <animated.meshStandardMaterial
        color={model.color}
        metalness={model.metalness ?? 0.35}
        roughness={model.roughness ?? 0.45}
        transparent={model.transparent ?? false}
        opacity={model.opacity ?? 1}
        emissive={emissiveColor}
        emissiveIntensity={animatedEmissiveIntensity}
      />
    </animated.mesh>
  );
}
