"use client";

import { ContactShadows, Environment, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useMemo } from "react";
import { InventionModel } from "./InventionModel";
import { getModelDefinitionByInventionId } from "@/data/models";
import { Spinner } from "@/components/ui/Spinner";
import * as THREE from "three";

interface ModelViewerClientProps {
  inventionId: string;
  isExploded: boolean;
  selectedComponentId: string | null;
  highlightMap?: Record<string, { color?: string; mode?: "glow" | "pulse" }>;
  beamEffect?: {
    id: string;
    fromComponentId: string;
    toComponentId: string;
    color?: string;
    thickness?: number;
  } | null;
  onComponentSelect: (id: string | null) => void;
}

interface BeamEffectProps {
  from: [number, number, number];
  to: [number, number, number];
  color?: string;
  thickness?: number;
}

function BeamEffect({ from, to, color = "#7dd3fc", thickness = 0.03 }: BeamEffectProps) {
  const { position, quaternion, length } = useMemo(() => {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const direction = new THREE.Vector3().subVectors(end, start);
    const beamLength = direction.length();
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    const axis = new THREE.Vector3(0, 1, 0);
    const normalized = direction.lengthSq() === 0 ? axis : direction.normalize();
    const quat = new THREE.Quaternion().setFromUnitVectors(axis, normalized);
    return { position: mid, quaternion: quat, length: beamLength };
  }, [from, to]);

  return (
    <mesh position={position} quaternion={quaternion}>
      <cylinderGeometry args={[thickness, thickness, length, 12]} />
      <meshBasicMaterial color={color} transparent opacity={0.85} />
    </mesh>
  );
}

export default function ModelViewerClient({
  inventionId,
  isExploded,
  selectedComponentId,
  highlightMap,
  beamEffect,
  onComponentSelect,
}: ModelViewerClientProps) {
  const definition = getModelDefinitionByInventionId(inventionId);
  const cameraPos = definition?.cameraPosition ?? [0, 1.2, 5];
  const beamData = useMemo(() => {
    if (!definition || !beamEffect) return null;
    const fromComp = definition.components.find(
      (comp) => comp.componentId === beamEffect.fromComponentId,
    );
    const toComp = definition.components.find(
      (comp) => comp.componentId === beamEffect.toComponentId,
    );
    if (!fromComp || !toComp) return null;
    return {
      from: (isExploded ? fromComp.explodedPosition : fromComp.assembledPosition) as [
        number,
        number,
        number,
      ],
      to: (isExploded ? toComp.explodedPosition : toComp.assembledPosition) as [
        number,
        number,
        number,
      ],
      color: beamEffect.color,
      thickness: beamEffect.thickness,
    };
  }, [beamEffect, definition, isExploded]);

  return (
    <div className="relative h-full w-full" style={{ background: "#0a0a1a" }}>
      <Canvas
        camera={{ position: cameraPos, fov: 50 }}
        onPointerMissed={() => onComponentSelect(null)}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <Suspense fallback={null}>
          <Environment preset="city" />
          <InventionModel
            inventionId={inventionId}
            isExploded={isExploded}
            selectedComponentId={selectedComponentId}
            highlightMap={highlightMap}
            onComponentSelect={onComponentSelect}
          />
          {beamData && (
            <BeamEffect
              from={beamData.from}
              to={beamData.to}
              color={beamData.color}
              thickness={beamData.thickness}
            />
          )}
          <ContactShadows position={[0, -1, 0]} opacity={0.4} scale={10} blur={2} />
        </Suspense>
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={2}
          maxDistance={12}
          autoRotate={!isExploded && !selectedComponentId}
          autoRotateSpeed={0.5}
        />
      </Canvas>
      {!definition && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      )}
    </div>
  );
}
