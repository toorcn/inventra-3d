"use client";

import { animated, useSpring } from "@react-spring/three";
import type { ReactNode } from "react";

interface ExplodedViewProps {
  assembledPosition: [number, number, number];
  explodedPosition: [number, number, number];
  isExploded: boolean;
  children: ReactNode;
}

export function ExplodedView({
  assembledPosition,
  explodedPosition,
  isExploded,
  children,
}: ExplodedViewProps) {
  const { position } = useSpring({
    position: isExploded ? explodedPosition : assembledPosition,
    config: { mass: 1, tension: 170, friction: 26 },
  });

  return (
    <animated.group position={position as unknown as [number, number, number]}>
      {children}
    </animated.group>
  );
}
