"use client";

import { ContactShadows, Environment, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { InventionModel } from "./InventionModel";
import { getModelDefinitionByInventionId } from "@/data/models";
import { Spinner } from "@/components/ui/Spinner";

interface ModelViewerClientProps {
  inventionId: string;
  isExploded: boolean;
  selectedComponentId: string | null;
  onComponentSelect: (id: string | null) => void;
}

export default function ModelViewerClient({
  inventionId,
  isExploded,
  selectedComponentId,
  onComponentSelect,
}: ModelViewerClientProps) {
  const definition = getModelDefinitionByInventionId(inventionId);
  const cameraPos = definition?.cameraPosition ?? [0, 1.2, 5];

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
            onComponentSelect={onComponentSelect}
          />
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
