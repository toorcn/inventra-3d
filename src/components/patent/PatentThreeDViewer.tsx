"use client";

import { ContactShadows, Environment, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useMemo } from "react";
import type { PatentAssemblyContract } from "@/lib/patent-workspace";

type PatentThreeDViewerItem = {
  id: string;
  name: string;
  url: string;
  contract: PatentAssemblyContract;
};

type PatentThreeDViewerProps = {
  items: PatentThreeDViewerItem[];
  exploded: boolean;
};

function PatentModel({
  item,
  exploded,
}: {
  item: PatentThreeDViewerItem;
  exploded: boolean;
}) {
  const gltf = useGLTF(item.url);
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const position: [number, number, number] = exploded
    ? [
        item.contract.assembledPosition[0] + item.contract.explodedOffset[0],
        item.contract.assembledPosition[1] + item.contract.explodedOffset[1],
        item.contract.assembledPosition[2] + item.contract.explodedOffset[2],
      ]
    : item.contract.assembledPosition;

  return (
    <group position={position}>
      <group scale={item.contract.normalizedScale}>
        <primitive
          object={scene}
          position={[
            -item.contract.nativeBounds.center[0],
            -item.contract.nativeBounds.center[1],
            -item.contract.nativeBounds.center[2],
          ]}
        />
      </group>
    </group>
  );
}

export function PatentThreeDViewer({ items, exploded }: PatentThreeDViewerProps) {
  const cameraPosition = exploded ? [1.8, 1.4, 2.6] : [1.3, 1.05, 2.2];

  return (
    <div className="h-[420px] w-full overflow-hidden rounded-2xl border border-white/10 bg-[#060913]">
      <Canvas camera={{ position: cameraPosition as [number, number, number], fov: 42 }}>
        <color attach="background" args={["#060913"]} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[4, 5, 4]} intensity={1.15} />
        <directionalLight position={[-3, 2, -4]} intensity={0.35} color="#8ad8ff" />
        <Suspense fallback={null}>
          <Environment preset="city" />
          {items.map((item) => (
            <PatentModel key={item.id} item={item} exploded={exploded} />
          ))}
          <ContactShadows position={[0, -0.65, 0]} opacity={0.35} scale={8} blur={2.5} />
        </Suspense>
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={1.2}
          maxDistance={8}
          autoRotate={!exploded}
          autoRotateSpeed={0.45}
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  );
}
