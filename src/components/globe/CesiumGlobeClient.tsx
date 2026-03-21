"use client";

import { useEffect, useRef } from "react";
import "cesium/Build/Cesium/Widgets/widgets.css";
import type { Invention } from "@/types";
import { inventions } from "@/data/inventions";
import { categoryColorMap } from "@/data/categories";

interface CesiumGlobeClientProps {
  onInventionSelect: (invention: Invention) => void;
  selectedInventionId?: string;
  temporosYear: number;
}

// Draw a glowing dot on a canvas and return it as an HTMLCanvasElement
function createGlowingDotCanvas(color: string): HTMLCanvasElement {
  const size = 32;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const cx = size / 2;
  const cy = size / 2;
  const radius = 8;

  // Outer glow
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
  gradient.addColorStop(0, color + "cc");
  gradient.addColorStop(0.4, color + "66");
  gradient.addColorStop(1, color + "00");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
  ctx.fill();

  // Core dot
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  // White highlight
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath();
  ctx.arc(cx - 2, cy - 2, radius * 0.4, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}

export default function CesiumGlobeClient({
  onInventionSelect,
  selectedInventionId,
  temporosYear,
}: CesiumGlobeClientProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rippleEntitiesRef = useRef<any[]>([]);

  // Initialize Cesium viewer once
  useEffect(() => {
    if (!containerRef.current) return;

    // Set Cesium base URL for static assets
    (window as unknown as Record<string, unknown>)["CESIUM_BASE_URL"] = "/cesium";

    let viewer: unknown;

    async function initCesium() {
      const Cesium = await import("cesium");

      // Configure Ion token if available
      const ionToken = process.env.NEXT_PUBLIC_CESIUM_ION_ACCESS_TOKEN;
      if (ionToken) {
        Cesium.Ion.defaultAccessToken = ionToken;
      }

      // Create viewer with UI elements disabled
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const v = new (Cesium.Viewer as any)(containerRef.current!, {
        timeline: false,
        animation: false,
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        selectionIndicator: false,
        navigationHelpButton: false,
        fullscreenButton: false,
        infoBox: false,
        scene3DOnly: true,
      });

      viewer = v;
      viewerRef.current = v;

      // Dark background colours
      v.scene.backgroundColor = Cesium.Color.fromCssColorString("#0a0a1a");
      v.scene.globe.baseColor = Cesium.Color.fromCssColorString("#111827");

      // Google Photorealistic 3D Tiles if key provided
      const googleKey = process.env.NEXT_PUBLIC_GOOGLE_3D_TILES_KEY;
      if (googleKey) {
        try {
          const tileset = await Cesium.Cesium3DTileset.fromUrl(
            `https://tile.googleapis.com/v1/3dtiles/root.json?key=${googleKey}`,
          );
          v.scene.primitives.add(tileset);
        } catch (err) {
          console.warn("Failed to load Google 3D Tiles:", err);
        }
      }

      // Default camera position
      v.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(0, 20, 20000000),
      });

      // Click handler
      v.screenSpaceEventHandler.setInputAction(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (click: any) => {
          const picked = v.scene.pick(click.position);
          if (Cesium.defined(picked) && picked.id) {
            const entity = picked.id;
            if (
              entity.properties &&
              entity.properties.inventionId
            ) {
              const inventionId = entity.properties.inventionId.getValue();
              const found = inventions.find((inv) => inv.id === inventionId);
              if (found) {
                onInventionSelect(found);
              }
            }
          }
        },
        Cesium.ScreenSpaceEventType.LEFT_CLICK,
      );

      // Hover handler — show/hide labels
      v.screenSpaceEventHandler.setInputAction(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (movement: any) => {
          const picked = v.scene.pick(movement.endPosition);
          // Hide all labels first
          v.entities.values.forEach((entity: { label?: { show?: { setValue: (v: boolean) => void } } }) => {
            if (entity.label && entity.label.show) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (entity.label.show as any).setValue(false);
            }
          });
          // Show label on hovered entity
          if (Cesium.defined(picked) && picked.id) {
            const entity = picked.id;
            if (entity.label && entity.label.show) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (entity.label.show as any).setValue(true);
            }
          }
        },
        Cesium.ScreenSpaceEventType.MOUSE_MOVE,
      );
    }

    initCesium().catch(console.error);

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const v = viewer as any;
      if (v && !v.isDestroyed()) {
        v.destroy();
      }
      viewerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers when temporosYear changes
  useEffect(() => {
    const v = viewerRef.current;
    if (!v) return;

    async function updateMarkers() {
      const Cesium = await import("cesium");

      // Remove existing invention entities and ripple entities
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toRemove = v.entities.values.filter((e: any) =>
        e.properties && (e.properties.inventionId || e.properties.isRipple),
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toRemove.forEach((e: any) => v.entities.remove(e));
      rippleEntitiesRef.current = [];

      // Filter inventions visible at current temporosYear
      const visible = inventions.filter(
        (inv) => inv.inventionDate <= temporosYear,
      );

      for (const inv of visible) {
        const color = categoryColorMap[inv.category] ?? "#ffffff";
        const cesiumColor = Cesium.Color.fromCssColorString(color);
        const dotCanvas = createGlowingDotCanvas(color);

        const position = Cesium.Cartesian3.fromDegrees(
          inv.location.lng,
          inv.location.lat,
          0,
        );

        // Add billboard + label entity
        v.entities.add({
          position,
          billboard: {
            image: dotCanvas,
            width: 32,
            height: 32,
            verticalOrigin: Cesium.VerticalOrigin.CENTER,
            horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          },
          label: {
            text: `${inv.title} (${inv.year})`,
            font: "12px sans-serif",
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -40),
            show: false,
          },
          properties: {
            inventionId: inv.id,
          },
        });

        // Ripple: show if commercialisationDate is within 10 years of temporosYear
        const diff = temporosYear - inv.commercialisationDate;
        if (diff >= 0 && diff <= 10) {
          const progress = diff / 10; // 0..1
          const maxRadius = 500000; // metres
          const currentRadius = progress * maxRadius;
          const opacity = 1 - progress;

          const rippleEntity = v.entities.add({
            position,
            ellipse: {
              semiMajorAxis: currentRadius,
              semiMinorAxis: currentRadius,
              material: cesiumColor.withAlpha(opacity * 0.4),
              outline: true,
              outlineColor: cesiumColor.withAlpha(opacity),
              outlineWidth: 2,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            },
            properties: {
              isRipple: true,
            },
          });

          rippleEntitiesRef.current.push(rippleEntity);
        }
      }
    }

    updateMarkers().catch(console.error);
  }, [temporosYear]);

  // Fly to selected invention when selectedInventionId changes
  useEffect(() => {
    const v = viewerRef.current;
    if (!v || !selectedInventionId) return;

    async function flyToSelected() {
      const Cesium = await import("cesium");
      const inv = inventions.find((i) => i.id === selectedInventionId);
      if (!inv) return;

      v.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
          inv.location.lng,
          inv.location.lat,
          800000,
        ),
        duration: 2.0,
      });
    }

    flyToSelected().catch(console.error);
  }, [selectedInventionId]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", minHeight: "520px" }}
    />
  );
}
