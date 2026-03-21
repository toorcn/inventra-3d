"use client";

import { useCallback, useEffect, useRef } from "react";
import "cesium/Build/Cesium/Widgets/widgets.css";
import type { Invention } from "@/types";
import { inventions } from "@/data/inventions";
import { categoryColorMap } from "@/data/categories";
import type { GlobeCameraController } from "./camera-controller";

interface CesiumGlobeClientProps {
  onInventionSelect: (invention: Invention) => void;
  onCameraReady?: (controller: GlobeCameraController | null) => void;
  selectedInventionId?: string;
  temporosYear: number;
}

const DEFAULT_VIEW = {
  lng: 0,
  lat: 20,
  height: 20000000,
};

const INVENTION_FOCUS_HEIGHT = 800000;
const AUTO_ROTATE_RESUME_DELAY_MS = 3000;
const INITIAL_AUTO_ROTATE_DELAY_MS = 500;
const AUTO_ROTATE_RADIANS_PER_SECOND = 0.08;

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
  onCameraReady,
  selectedInventionId,
  temporosYear,
}: CesiumGlobeClientProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedInventionIdRef = useRef<string | undefined>(selectedInventionId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewerRef = useRef<any>(null);
  const cesiumRef = useRef<typeof import("cesium") | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rippleEntitiesRef = useRef<any[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoRotateEnabledRef = useRef(false);
  const userInteractingRef = useRef(false);

  const clearResumeTimer = useCallback(() => {
    if (!resumeTimerRef.current) return;
    clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = null;
  }, []);

  const pauseAutoRotate = useCallback(() => {
    autoRotateEnabledRef.current = false;
    clearResumeTimer();
  }, [clearResumeTimer]);

  const resumeAutoRotateAfterDelay = useCallback((delayMs = AUTO_ROTATE_RESUME_DELAY_MS) => {
    clearResumeTimer();
    if (userInteractingRef.current) return;

    resumeTimerRef.current = setTimeout(() => {
      autoRotateEnabledRef.current = true;
    }, delayMs);
  }, [clearResumeTimer]);

  const flyToCoordinates = useCallback((
    lng: number,
    lat: number,
    height: number,
    durationSeconds = 2,
  ) => {
    const Cesium = cesiumRef.current;
    const v = viewerRef.current;
    if (!Cesium || !v) return;

    pauseAutoRotate();
    v.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lng, lat, height),
      duration: durationSeconds,
      complete: () => {
        resumeAutoRotateAfterDelay();
      },
      cancel: () => {
        resumeAutoRotateAfterDelay();
      },
    });
  }, [pauseAutoRotate, resumeAutoRotateAfterDelay]);

  const flyToInvention = useCallback((invention: Invention) => {
    flyToCoordinates(
      invention.location.lng,
      invention.location.lat,
      INVENTION_FOCUS_HEIGHT,
    );
  }, [flyToCoordinates]);

  const reset = useCallback(() => {
    flyToCoordinates(DEFAULT_VIEW.lng, DEFAULT_VIEW.lat, DEFAULT_VIEW.height, 2.2);
  }, [flyToCoordinates]);

  useEffect(() => {
    selectedInventionIdRef.current = selectedInventionId;
  }, [selectedInventionId]);

  useEffect(() => {
    onCameraReady?.({
      flyToInvention,
      reset,
      pauseAutoRotate,
      resumeAutoRotateAfterDelay,
    });

    return () => {
      onCameraReady?.(null);
    };
  }, [flyToInvention, onCameraReady, pauseAutoRotate, reset, resumeAutoRotateAfterDelay]);

  // Initialize Cesium viewer once
  useEffect(() => {
    if (!containerRef.current) return;

    // Set Cesium base URL for static assets
    (window as unknown as Record<string, unknown>)["CESIUM_BASE_URL"] = "/cesium";

    let viewer: unknown;

    async function initCesium() {
      const Cesium = await import("cesium");
      cesiumRef.current = Cesium;

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
        destination: Cesium.Cartesian3.fromDegrees(
          DEFAULT_VIEW.lng,
          DEFAULT_VIEW.lat,
          DEFAULT_VIEW.height,
        ),
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
                pauseAutoRotate();
                onInventionSelect(found);
              }
            }
          }
        },
        Cesium.ScreenSpaceEventType.LEFT_CLICK,
      );

      const syncLabelVisibility = (hoveredEntity?: { label?: { show?: { setValue: (value: boolean) => void } } }) => {
        v.entities.values.forEach((entity: {
          label?: { show?: { setValue: (value: boolean) => void } };
          properties?: { inventionId?: { getValue?: () => string } };
        }) => {
          if (!entity.label?.show) return;

          const inventionId = entity.properties?.inventionId?.getValue?.();
          entity.label.show.setValue(
            entity === hoveredEntity || inventionId === selectedInventionIdRef.current,
          );
        });
      };

      // Hover handler — show/hide labels
      v.screenSpaceEventHandler.setInputAction(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (movement: any) => {
          const picked = v.scene.pick(movement.endPosition);
          if (Cesium.defined(picked) && picked.id) {
            syncLabelVisibility(picked.id);
            return;
          }
          syncLabelVisibility();
        },
        Cesium.ScreenSpaceEventType.MOUSE_MOVE,
      );

      const handleInteractionStart = () => {
        userInteractingRef.current = true;
        pauseAutoRotate();
      };

      const handleInteractionEnd = () => {
        userInteractingRef.current = false;
        resumeAutoRotateAfterDelay();
      };

      const handleWheel = () => {
        pauseAutoRotate();
        resumeAutoRotateAfterDelay();
      };

      v.screenSpaceEventHandler.setInputAction(
        handleInteractionStart,
        Cesium.ScreenSpaceEventType.LEFT_DOWN,
      );
      v.screenSpaceEventHandler.setInputAction(
        handleInteractionStart,
        Cesium.ScreenSpaceEventType.MIDDLE_DOWN,
      );
      v.screenSpaceEventHandler.setInputAction(
        handleInteractionStart,
        Cesium.ScreenSpaceEventType.RIGHT_DOWN,
      );
      v.screenSpaceEventHandler.setInputAction(
        handleInteractionStart,
        Cesium.ScreenSpaceEventType.PINCH_START,
      );
      v.screenSpaceEventHandler.setInputAction(
        handleInteractionEnd,
        Cesium.ScreenSpaceEventType.LEFT_UP,
      );
      v.screenSpaceEventHandler.setInputAction(
        handleInteractionEnd,
        Cesium.ScreenSpaceEventType.MIDDLE_UP,
      );
      v.screenSpaceEventHandler.setInputAction(
        handleInteractionEnd,
        Cesium.ScreenSpaceEventType.RIGHT_UP,
      );
      v.screenSpaceEventHandler.setInputAction(
        handleInteractionEnd,
        Cesium.ScreenSpaceEventType.PINCH_END,
      );
      v.screenSpaceEventHandler.setInputAction(
        handleWheel,
        Cesium.ScreenSpaceEventType.WHEEL,
      );

      let lastFrameTime = performance.now();
      const animate = (timestamp: number) => {
        lastFrameTime ||= timestamp;
        const deltaSeconds = Math.min((timestamp - lastFrameTime) / 1000, 0.05);
        lastFrameTime = timestamp;

        if (
          autoRotateEnabledRef.current &&
          !userInteractingRef.current &&
          viewerRef.current &&
          !viewerRef.current.isDestroyed()
        ) {
          viewerRef.current.camera.rotate(
            Cesium.Cartesian3.UNIT_Z,
            -AUTO_ROTATE_RADIANS_PER_SECOND * deltaSeconds,
          );
        }

        animationFrameRef.current = window.requestAnimationFrame(animate);
      };

      animationFrameRef.current = window.requestAnimationFrame(animate);
      resumeAutoRotateAfterDelay(INITIAL_AUTO_ROTATE_DELAY_MS);
    }

    initCesium().catch(console.error);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
      clearResumeTimer();
      autoRotateEnabledRef.current = false;
      userInteractingRef.current = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const v = viewer as any;
      if (v && !v.isDestroyed()) {
        v.destroy();
      }
      viewerRef.current = null;
      cesiumRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearResumeTimer, onInventionSelect, pauseAutoRotate, resumeAutoRotateAfterDelay]);

  // Update markers when temporosYear changes
  useEffect(() => {
    const v = viewerRef.current;
    const CesiumModule = cesiumRef.current;
    if (!v || !CesiumModule) return;
    const Cesium = CesiumModule;

    function updateMarkers() {
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
        const isSelected = inv.id === selectedInventionId;

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
            width: isSelected ? 40 : 32,
            height: isSelected ? 40 : 32,
            verticalOrigin: Cesium.VerticalOrigin.CENTER,
            horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: `${inv.title} (${inv.year})`,
            font: "12px sans-serif",
            fillColor: isSelected ? cesiumColor.brighten(0.3, new Cesium.Color()) : Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -40),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            show: isSelected,
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

    updateMarkers();
  }, [selectedInventionId, temporosYear]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", minHeight: "520px" }}
    />
  );
}
