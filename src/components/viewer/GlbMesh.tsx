"use client";

import { useGLTF } from "@react-three/drei";
import { animated, useSpring } from "@react-spring/three";
import { useState, useMemo } from "react";
import * as THREE from "three";
import type { ComponentModel } from "@/data/models";

interface GlbMeshProps {
  model: ComponentModel;
  isSelected: boolean;
  highlight?: { color?: string; mode?: "glow" | "pulse" };
  onSelect: (id: string) => void;
}

export function GlbMesh({ model, isSelected, highlight, onSelect }: GlbMeshProps) {
  const { scene } = useGLTF(`/${model.geometry.glbUrl!}`);
  const [hovered, setHovered] = useState(false);

  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    // Compute bounding box and normalize to fit within a unit sphere
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = maxDim > 0 ? 1.5 / maxDim : 1;
    clone.scale.setScalar(scale);
    clone.position.set(-center.x * scale, -center.y * scale, -center.z * scale);

    return clone;
  }, [scene]);

  const handleClick = (e: { stopPropagation?: () => void }) => {
    e.stopPropagation?.();
    onSelect(model.componentId);
  };

  const isHighlighted = Boolean(highlight);
  const scaleBase = hovered ? 1.04 : 1;
  const accentColor = isSelected ? "#60a5fa" : (highlight?.color ?? "#38bdf8");
  const isPulsing = isHighlighted && highlight?.mode === "pulse" && !isSelected;

  const { pulse } = useSpring({
    pulse: isPulsing ? 1 : 0,
    loop: isPulsing ? { reverse: true } : false,
    config: { tension: 120, friction: 14 },
  });

  const animatedScale = pulse.to((p) => scaleBase * (1 + p * (isHighlighted ? 0.08 : 0.05)));

  // Apply highlight/selection emissive to all materials in the loaded scene
  useMemo(() => {
    const emissiveIntensity = isSelected ? 0.95 : isHighlighted ? 0.7 : hovered ? 0.15 : 0;
    const emissiveColor = isSelected || isHighlighted ? accentColor : hovered ? "#ffffff" : "#000000";

    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mat = child.material as THREE.MeshStandardMaterial;
        if (mat.emissive) {
          mat.emissive.set(emissiveColor);
          mat.emissiveIntensity = emissiveIntensity;
        }
      }
    });
  }, [clonedScene, isSelected, isHighlighted, hovered, accentColor]);

  return (
    <animated.group
      scale={animatedScale}
      rotation={model.rotation ? [model.rotation[0], model.rotation[1], model.rotation[2]] : [0, 0, 0]}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={handleClick}
    >
      <primitive object={clonedScene} />
    </animated.group>
  );
}
