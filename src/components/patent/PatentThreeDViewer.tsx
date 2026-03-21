"use client";

import { ContactShadows, Environment, Html, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { PatentAssemblyContract } from "@/lib/patent-workspace";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PatentThreeDViewerItem = {
  id: string;
  name: string;
  refNumber?: string;
  kind?: string;
  description?: string;
  url: string | null; // null = placeholder (no GLB)
  contract: PatentAssemblyContract;
};

export type PatentThreeDViewerProps = {
  items: PatentThreeDViewerItem[];
  exploded: boolean;
  onExplodedChange?: (exploded: boolean) => void;
};

// ---------------------------------------------------------------------------
// LegendPanel
// ---------------------------------------------------------------------------

function LegendPanel({
  items,
  hoveredId,
  selectedId,
  exploded,
  onHover,
  onSelect,
  onExplodedChange,
}: {
  items: PatentThreeDViewerItem[];
  hoveredId: string | null;
  selectedId: string | null;
  exploded: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
  onExplodedChange?: (exploded: boolean) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const sorted = useMemo(
    () =>
      [...items].sort((a, b) => {
        const ra = a.refNumber ?? "";
        const rb = b.refNumber ?? "";
        return ra.localeCompare(rb, undefined, { numeric: true });
      }),
    [items],
  );

  const selectedItem = useMemo(
    () => (selectedId ? items.find((i) => i.id === selectedId) ?? null : null),
    [items, selectedId],
  );

  // Auto-scroll to hovered item
  useEffect(() => {
    if (hoveredId && itemRefs.current[hoveredId] && listRef.current) {
      itemRefs.current[hoveredId]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [hoveredId]);

  return (
    <div className="flex w-64 flex-none flex-col border-l border-white/10 bg-black/40">
      {/* View toggle */}
      {onExplodedChange && (
        <div className="flex border-b border-white/10 p-2">
          <button
            type="button"
            onClick={() => onExplodedChange(false)}
            className={`flex-1 rounded-l px-2 py-1 text-[10px] font-medium transition ${
              !exploded ? "bg-white/15 text-white" : "text-white/50 hover:text-white/70"
            }`}
          >
            Assembled
          </button>
          <button
            type="button"
            onClick={() => onExplodedChange(true)}
            className={`flex-1 rounded-r px-2 py-1 text-[10px] font-medium transition ${
              exploded ? "bg-white/15 text-white" : "text-white/50 hover:text-white/70"
            }`}
          >
            Exploded
          </button>
        </div>
      )}

      {/* Component list */}
      <div ref={listRef} className="flex-1 overflow-y-auto">
        {sorted.map((item) => {
          const isHovered = item.id === hoveredId;
          const isSelected = item.id === selectedId;
          return (
            <div
              key={item.id}
              ref={(el) => {
                itemRefs.current[item.id] = el;
              }}
              onMouseEnter={() => onHover(item.id)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onSelect(isSelected ? null : item.id)}
              className={`cursor-pointer border-b border-white/5 px-3 py-2 transition ${
                isSelected
                  ? "bg-cyan-500/15 text-white"
                  : isHovered
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:bg-white/5 hover:text-white/80"
              }`}
            >
              <div className="flex items-center gap-1.5">
                {item.refNumber && (
                  <span className="rounded bg-white/10 px-1 py-0.5 text-[9px] font-mono text-white/70">
                    {item.refNumber}
                  </span>
                )}
                <span className="truncate text-[11px] font-medium">{item.name}</span>
              </div>
              {item.kind && <div className="mt-0.5 text-[9px] text-white/40">{item.kind}</div>}
              {!item.url && (
                <span className="mt-0.5 inline-block rounded bg-red-950 px-1 py-0.5 text-[8px] text-red-400">
                  placeholder
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Detail panel */}
      {selectedItem && (
        <div className="border-t border-white/10 p-3">
          <div className="text-[11px] font-semibold text-white">{selectedItem.name}</div>
          {selectedItem.refNumber && (
            <div className="mt-0.5 text-[9px] text-white/50">Ref: {selectedItem.refNumber}</div>
          )}
          {selectedItem.description && (
            <p className="mt-1.5 text-[10px] leading-relaxed text-white/60">{selectedItem.description}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-1">
            {selectedItem.contract.placementTier === 3 && (
              <span className="text-[9px] bg-amber-950 text-amber-500 px-1.5 py-0.5 rounded">
                approximate position
              </span>
            )}
            {selectedItem.contract.placementTier === 2 && (
              <span className="text-[9px] bg-blue-950 text-blue-400 px-1.5 py-0.5 rounded">inferred position</span>
            )}
            {!selectedItem.url && (
              <span className="text-[9px] bg-red-950 text-red-400 px-1.5 py-0.5 rounded">
                placeholder — no source image
              </span>
            )}
            {selectedItem.contract.fitWarnings?.includes("glb_generation_failed") && selectedItem.url && (
              <span className="text-[9px] bg-amber-950 text-amber-500 px-1.5 py-0.5 rounded">
                simplified geometry
              </span>
            )}
            {selectedItem.contract.fitWarnings?.includes("scale_mismatch") && (
              <span className="text-[9px] bg-yellow-950 text-yellow-500 px-1.5 py-0.5 rounded">
                ⚠ scale adjusted from text
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// LoadedModel — renders a GLB with material highlighting
// ---------------------------------------------------------------------------

function LoadedModel({
  url,
  center,
  isHovered,
  isSelected,
  isDimmed,
}: {
  url: string;
  center: [number, number, number];
  isHovered: boolean;
  isSelected: boolean;
  isDimmed: boolean;
}) {
  const gltf = useGLTF(url);
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const materialsRef = useRef<THREE.MeshStandardMaterial[]>([]);

  // Collect cloned materials once
  useEffect(() => {
    const mats: THREE.MeshStandardMaterial[] = [];
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map((m) => {
            const cloned = m.clone() as THREE.MeshStandardMaterial;
            mats.push(cloned);
            return cloned;
          });
        } else {
          const cloned = mesh.material.clone() as THREE.MeshStandardMaterial;
          mats.push(cloned);
          mesh.material = cloned;
        }
      }
    });
    materialsRef.current = mats;

    return () => {
      mats.forEach((m) => m.dispose());
    };
  }, [scene]);

  // Update material properties reactively
  useEffect(() => {
    for (const mat of materialsRef.current) {
      mat.emissive = new THREE.Color(isHovered ? 0x44aaff : isSelected ? 0x22ccaa : 0x000000);
      mat.emissiveIntensity = isHovered ? 0.35 : isSelected ? 0.25 : 0;
      mat.opacity = isDimmed ? 0.25 : 1;
      mat.transparent = isDimmed;
      mat.needsUpdate = true;
    }
  }, [isHovered, isSelected, isDimmed]);

  return (
    <primitive
      object={scene}
      position={[-center[0], -center[1], -center[2]]}
    />
  );
}

// ---------------------------------------------------------------------------
// PlaceholderMesh — wireframe box with a label
// ---------------------------------------------------------------------------

function PlaceholderMesh({
  name,
  isHovered,
  isSelected,
  isDimmed,
}: {
  name: string;
  isHovered: boolean;
  isSelected: boolean;
  isDimmed: boolean;
}) {
  const color = isHovered ? "#44aaff" : isSelected ? "#22ccaa" : "#555566";
  const opacity = isDimmed ? 0.15 : 0.5;

  return (
    <group>
      <mesh>
        <boxGeometry args={[0.15, 0.15, 0.15]} />
        <meshStandardMaterial color={color} wireframe transparent opacity={opacity} />
      </mesh>
      {!isDimmed && (
        <Html center distanceFactor={3} style={{ pointerEvents: "none" }}>
          <div className="whitespace-nowrap rounded bg-black/80 px-1.5 py-0.5 text-[9px] text-white/70">
            {name}
          </div>
        </Html>
      )}
    </group>
  );
}

// ---------------------------------------------------------------------------
// ComponentMesh — wraps LoadedModel or PlaceholderMesh with position + events
// ---------------------------------------------------------------------------

function ComponentMesh({
  item,
  exploded,
  isHovered,
  isSelected,
  isDimmed,
  onHover,
  onSelect,
}: {
  item: PatentThreeDViewerItem;
  exploded: boolean;
  isHovered: boolean;
  isSelected: boolean;
  isDimmed: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
}) {
  const position: [number, number, number] = exploded
    ? [
        item.contract.assembledPosition[0] + item.contract.explodedOffset[0],
        item.contract.assembledPosition[1] + item.contract.explodedOffset[1],
        item.contract.assembledPosition[2] + item.contract.explodedOffset[2],
      ]
    : item.contract.assembledPosition;

  return (
    <group
      position={position}
      userData={{ componentId: item.id }}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(item.id);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onHover(null);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(isSelected ? null : item.id);
      }}
    >
      <group scale={item.contract.normalizedScale}>
        {item.url ? (
          <LoadedModel
            url={item.url}
            center={item.contract.nativeBounds.center}
            isHovered={isHovered}
            isSelected={isSelected}
            isDimmed={isDimmed}
          />
        ) : (
          <PlaceholderMesh
            name={item.name}
            isHovered={isHovered}
            isSelected={isSelected}
            isDimmed={isDimmed}
          />
        )}
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Main viewer
// ---------------------------------------------------------------------------

export function PatentThreeDViewer({ items, exploded, onExplodedChange }: PatentThreeDViewerProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="flex h-[420px] w-full overflow-hidden rounded-2xl border border-white/10 bg-[#060913]">
      <div className="relative flex-[2]">
        <Canvas camera={{ position: [0, 0, 3] as [number, number, number], fov: 50 }}>
          <color attach="background" args={["#060913"]} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1.15} />
          <directionalLight position={[-3, 2, -4]} intensity={0.35} color="#8ad8ff" />
          <Suspense fallback={null}>
            <Environment preset="city" />
            {items.map((item) => (
              <ComponentMesh
                key={item.id}
                item={item}
                exploded={exploded}
                isHovered={item.id === hoveredId}
                isSelected={item.id === selectedId}
                isDimmed={
                  (hoveredId !== null && item.id !== hoveredId) ||
                  (selectedId !== null && item.id !== selectedId)
                }
                onHover={setHoveredId}
                onSelect={setSelectedId}
              />
            ))}
            <ContactShadows position={[0, -0.65, 0]} opacity={0.35} scale={8} blur={2.5} />
          </Suspense>
          <OrbitControls
            enableDamping
            dampingFactor={0.05}
            minDistance={1.2}
            maxDistance={8}
            autoRotate={!exploded}
            autoRotateSpeed={1}
            target={[0, 0, 0]}
          />
        </Canvas>
      </div>
      <LegendPanel
        items={items}
        hoveredId={hoveredId}
        selectedId={selectedId}
        exploded={exploded}
        onHover={setHoveredId}
        onSelect={setSelectedId}
        onExplodedChange={onExplodedChange}
      />
    </div>
  );
}
