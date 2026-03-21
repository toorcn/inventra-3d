"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import "cesium/Build/Cesium/Widgets/widgets.css";
import type { Invention } from "@/types";
import { getCountryByCode } from "@/data/countries";
import { inventions } from "@/data/inventions";
import { categoryColorMap } from "@/data/categories";
import { getInventionOriginLabel } from "@/lib/invention-origin";
import { InventionFocusOverlay } from "./InventionFocusOverlay";
import type { GlobeCameraController } from "./camera-controller";

interface CesiumGlobeClientProps {
  onInventionSelect: (invention: Invention) => void;
  onCountrySelect: (countryCode: string) => void;
  onCameraReady?: (controller: GlobeCameraController | null) => void;
  focusedInventionId?: string;
  activeInventionId?: string;
  highlightedCountryCodes?: string[];
  temporosYear: number;
  onEnterViewer?: (invention: Invention) => void;
  onOpenDetails?: (invention: Invention) => void;
}

const DEFAULT_VIEW = {
  lng: 0,
  lat: 20,
  height: 20000000,
};

const COUNTRY_BOUNDARY_URL = "/data/countries.geojson";
const INVENTION_FOCUS_HEIGHT = 800000;
const COUNTRY_FOCUS_HEIGHT = 3500000;
const REGION_FOCUS_HEIGHT = 6500000;
const AUTO_ROTATE_RESUME_DELAY_MS = 3000;
const INITIAL_AUTO_ROTATE_DELAY_MS = 500;
const AUTO_ROTATE_RADIANS_PER_SECOND = 0.03;

interface GlobeViewTarget {
  lng: number;
  lat: number;
  height: number;
}

interface GeoJsonFeature {
  type: "Feature";
  geometry: unknown;
  properties?: Record<string, unknown>;
}

interface GeoJsonFeatureCollection {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
}

interface HoveredCountryState {
  code: string;
  name: string;
  x: number;
  y: number;
}

interface OverlayScreenPosition {
  left: number;
  top: number;
}

const PREVIEW_OVERLAY_SIZE = { width: 240, height: 240 };
const CONTEXT_OVERLAY_SIZE = { width: 240, height: 360 };

function normalizeLongitude(lng: number): number {
  if (lng > 180) return ((lng + 180) % 360) - 180;
  if (lng < -180) return ((lng - 180) % 360) + 180;
  return lng;
}

function clampOverlayPosition(
  x: number,
  y: number,
  containerWidth: number,
  containerHeight: number,
  overlayWidth: number,
  overlayHeight: number,
): OverlayScreenPosition {
  const horizontalPadding = overlayWidth / 2 + 16;
  const verticalPadding = overlayHeight + 24;

  return {
    left: Math.min(Math.max(x, horizontalPadding), containerWidth - horizontalPadding),
    top: Math.min(Math.max(y - 22, verticalPadding), containerHeight - 16),
  };
}

function getEntityStringProperty(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  entity: any,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = entity?.properties?.[key]?.getValue?.();
    if (typeof value === "string" && value && value !== "-99") {
      return value;
    }
  }

  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getCountryCodeFromEntity(entity: any): string | null {
  return getEntityStringProperty(entity, [
    "countryCode",
    "ISO_A2",
    "ISO_A2_EH",
    "ISO3166-1-Alpha-2",
  ]);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getCountryNameFromEntity(entity: any): string | null {
  return getEntityStringProperty(entity, [
    "countryName",
    "ADMIN",
    "NAME",
    "NAME_LONG",
    "name",
  ]);
}

function normalizeCountryBoundaryGeoJson(
  source: GeoJsonFeatureCollection,
  representedCountryCodes: Set<string>,
): GeoJsonFeatureCollection {
  return {
    type: "FeatureCollection",
    features: source.features
      .filter((feature) => {
        const code = typeof feature.properties?.ISO_A2 === "string"
          ? feature.properties.ISO_A2
          : typeof feature.properties?.ISO_A2_EH === "string"
            ? feature.properties.ISO_A2_EH
            : typeof feature.properties?.["ISO3166-1-Alpha-2"] === "string"
              ? feature.properties["ISO3166-1-Alpha-2"]
            : null;

        return Boolean(code && representedCountryCodes.has(code) && code !== "-99");
      })
      .map((feature) => ({
        ...feature,
        properties: {
          ...feature.properties,
          countryCode: feature.properties?.countryCode
            ?? feature.properties?.ISO_A2
            ?? feature.properties?.ISO_A2_EH
            ?? feature.properties?.["ISO3166-1-Alpha-2"],
          countryName: feature.properties?.countryName
            ?? feature.properties?.ADMIN
            ?? feature.properties?.NAME
            ?? feature.properties?.NAME_LONG
            ?? feature.properties?.name,
        },
      })),
  };
}

function createBoundaryFillMaterial(
  Cesium: typeof import("cesium"),
  countryCode: string,
  highlightedCountryCodesRef: RefObject<string[]>,
  hoveredCountryCodeRef: RefObject<string | null>,
) {
  return new Cesium.ColorMaterialProperty(
    new Cesium.CallbackProperty(() => {
      const isHovered = hoveredCountryCodeRef.current === countryCode;
      const isHighlighted = highlightedCountryCodesRef.current.includes(countryCode);

      if (isHovered) {
        return Cesium.Color.fromCssColorString("#60a5fa").withAlpha(0.35);
      }

      if (isHighlighted) {
        return Cesium.Color.fromCssColorString("#3b82f6").withAlpha(0.22);
      }

      return Cesium.Color.fromCssColorString("#1d4ed8").withAlpha(0.02);
    }, false),
  );
}

function createBoundaryStrokeMaterial(
  Cesium: typeof import("cesium"),
  countryCode: string,
  highlightedCountryCodesRef: RefObject<string[]>,
  hoveredCountryCodeRef: RefObject<string | null>,
) {
  return new Cesium.ColorMaterialProperty(
    new Cesium.CallbackProperty(() => {
      const isHovered = hoveredCountryCodeRef.current === countryCode;
      const isHighlighted = highlightedCountryCodesRef.current.includes(countryCode);

      if (isHovered) {
        return Cesium.Color.fromCssColorString("#93c5fd").withAlpha(1.0);
      }

      if (isHighlighted) {
        return Cesium.Color.fromCssColorString("#60a5fa").withAlpha(0.88);
      }

      return Cesium.Color.fromCssColorString("#60a5fa").withAlpha(0.38);
    }, false),
  );
}

function styleBoundaryEntities(
  Cesium: typeof import("cesium"),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  entities: any[],
  countryCode: string,
  highlightedCountryCodesRef: RefObject<string[]>,
  hoveredCountryCodeRef: RefObject<string | null>,
) {
  const fillMaterial = createBoundaryFillMaterial(
    Cesium,
    countryCode,
    highlightedCountryCodesRef,
    hoveredCountryCodeRef,
  );
  const strokeMaterial = createBoundaryStrokeMaterial(
    Cesium,
    countryCode,
    highlightedCountryCodesRef,
    hoveredCountryCodeRef,
  );

  for (const entity of entities) {
    if (entity.polygon) {
      entity.polygon.material = fillMaterial;
      entity.polygon.outline = true;
      entity.polygon.outlineColor = new Cesium.CallbackProperty(
        () => strokeMaterial.color?.getValue?.() ?? Cesium.Color.WHITE,
        false,
      );
      entity.polygon.outlineWidth = new Cesium.CallbackProperty(() => {
        const isHovered = hoveredCountryCodeRef.current === countryCode;
        const isHighlighted = highlightedCountryCodesRef.current.includes(countryCode);
        if (isHovered) return 2.5;
        if (isHighlighted) return 2.0;
        return 1.2;
      }, false);
      entity.polygon.height = 0;
    }

    if (entity.polyline) {
      entity.polyline.clampToGround = true;
      entity.polyline.width = 1.6;
      entity.polyline.material = strokeMaterial;
    }
  }
}

export default function CesiumGlobeClient({
  onInventionSelect,
  onCountrySelect,
  onCameraReady,
  focusedInventionId,
  activeInventionId,
  highlightedCountryCodes = [],
  temporosYear,
  onEnterViewer,
  onOpenDetails,
}: CesiumGlobeClientProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const focusedInventionIdRef = useRef<string | undefined>(focusedInventionId);
  const activeInventionIdRef = useRef<string | undefined>(activeInventionId);
  const highlightedCountryCodesRef = useRef<string[]>(highlightedCountryCodes);
  const hoveredCountryCodeRef = useRef<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewerRef = useRef<any>(null);
  const cesiumRef = useRef<typeof import("cesium") | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rippleEntitiesRef = useRef<any[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoRotateEnabledRef = useRef(false);
  const userInteractingRef = useRef(false);
  const currentViewRef = useRef<GlobeViewTarget>(DEFAULT_VIEW);
  const [hoveredCountry, setHoveredCountry] = useState<HoveredCountryState | null>(null);
  const [hoveredInventionId, setHoveredInventionId] = useState<string | null>(null);
  const [focusedOverlayPosition, setFocusedOverlayPosition] = useState<OverlayScreenPosition | null>(null);
  const [activeOverlayPosition, setActiveOverlayPosition] = useState<OverlayScreenPosition | null>(null);
  const [hoveredOverlayPosition, setHoveredOverlayPosition] = useState<OverlayScreenPosition | null>(null);

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

  const syncCurrentViewFromViewport = useCallback(() => {
    const Cesium = cesiumRef.current;
    const v = viewerRef.current;
    if (!Cesium || !v) return;

    const viewportCenter = new Cesium.Cartesian2(
      v.canvas.clientWidth / 2,
      v.canvas.clientHeight / 2,
    );
    const ray = v.camera.getPickRay(viewportCenter);
    const globePoint = ray ? v.scene.globe.pick(ray, v.scene) : null;
    const centerCartographic = globePoint
      ? Cesium.Cartographic.fromCartesian(globePoint)
      : null;
    const cameraCartographic = Cesium.Cartographic.fromCartesian(v.camera.positionWC);
    if (!cameraCartographic) return;

    currentViewRef.current = {
      lng: centerCartographic
        ? normalizeLongitude(Cesium.Math.toDegrees(centerCartographic.longitude))
        : currentViewRef.current.lng,
      lat: centerCartographic
        ? Cesium.Math.toDegrees(centerCartographic.latitude)
        : currentViewRef.current.lat,
      height: cameraCartographic.height,
    };
  }, []);

  const setCenteredView = useCallback((view: GlobeViewTarget) => {
    const Cesium = cesiumRef.current;
    const v = viewerRef.current;
    if (!Cesium || !v) return;

    const nextView = {
      ...view,
      lng: normalizeLongitude(view.lng),
    };

    currentViewRef.current = nextView;
    const target = Cesium.Cartesian3.fromDegrees(
      nextView.lng,
      nextView.lat,
      0,
    );
    v.camera.lookAt(
      target,
      new Cesium.HeadingPitchRange(0, -Cesium.Math.PI_OVER_TWO, nextView.height),
    );
    v.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    v.scene.requestRender();
  }, []);

  const flyToCoordinates = useCallback((
    lng: number,
    lat: number,
    height: number,
    durationSeconds = 2,
    resumeAfterDelay = true,
  ) => {
    const Cesium = cesiumRef.current;
    const v = viewerRef.current;
    if (!Cesium || !v) return;

    const nextView = {
      lng: normalizeLongitude(lng),
      lat,
      height,
    };

    currentViewRef.current = nextView;
    pauseAutoRotate();
    v.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(nextView.lng, nextView.lat, nextView.height),
      orientation: {
        heading: 0,
        pitch: -Cesium.Math.PI_OVER_TWO,
        roll: 0,
      },
      duration: durationSeconds,
      complete: () => {
        setCenteredView(nextView);
        syncCurrentViewFromViewport();
        if (resumeAfterDelay) {
          resumeAutoRotateAfterDelay();
        }
      },
      cancel: () => {
        syncCurrentViewFromViewport();
        if (resumeAfterDelay) {
          resumeAutoRotateAfterDelay();
        }
      },
    });
  }, [pauseAutoRotate, resumeAutoRotateAfterDelay, syncCurrentViewFromViewport]);

  const flyToInvention = useCallback((invention: Invention) => {
    flyToCoordinates(
      invention.location.lng,
      invention.location.lat,
      INVENTION_FOCUS_HEIGHT,
      2,
      true,
    );
  }, [flyToCoordinates]);

  const reset = useCallback(() => {
    flyToCoordinates(DEFAULT_VIEW.lng, DEFAULT_VIEW.lat, DEFAULT_VIEW.height, 2.2);
  }, [flyToCoordinates]);

  const flyToCountries = useCallback((countryCodes: string[]) => {
    const locations = countryCodes
      .map((code) => getCountryByCode(code))
      .filter((country): country is NonNullable<typeof country> => Boolean(country));

    if (locations.length === 0) {
      reset();
      return;
    }

    const averageLat = locations.reduce((sum, country) => sum + country.lat, 0) / locations.length;
    const averageLng = locations.reduce((sum, country) => sum + country.lng, 0) / locations.length;
    const latSpan = Math.max(...locations.map((country) => country.lat)) - Math.min(...locations.map((country) => country.lat));
    const lngSpan = Math.max(...locations.map((country) => country.lng)) - Math.min(...locations.map((country) => country.lng));
    const height = locations.length === 1
      ? COUNTRY_FOCUS_HEIGHT
      : Math.max(REGION_FOCUS_HEIGHT, (Math.max(latSpan, lngSpan) + 12) * 160000);

    flyToCoordinates(averageLng, averageLat, height, 2.2, true);
  }, [flyToCoordinates, reset]);

  useEffect(() => {
    focusedInventionIdRef.current = focusedInventionId;
  }, [focusedInventionId]);

  useEffect(() => {
    activeInventionIdRef.current = activeInventionId;
  }, [activeInventionId]);

  useEffect(() => {
    if (!focusedInventionId && !activeInventionId) {
      setFocusedOverlayPosition(null);
      setActiveOverlayPosition(null);
      return;
    }

    if (!focusedInventionId) {
      setFocusedOverlayPosition(null);
    }

    if (!activeInventionId) {
      setActiveOverlayPosition(null);
    }
  }, [activeInventionId, focusedInventionId]);

  useEffect(() => {
    if (!focusedInventionId && !activeInventionId) return;
    hoveredCountryCodeRef.current = null;
    setHoveredCountry(null);
  }, [activeInventionId, focusedInventionId]);

  useEffect(() => {
    highlightedCountryCodesRef.current = highlightedCountryCodes;
  }, [highlightedCountryCodes]);

  const hoveredCountryInventions = useMemo(() => {
    if (!hoveredCountry) return [];

    return inventions.filter(
      (inv) =>
        inv.countryCode === hoveredCountry.code &&
        inv.inventionDate <= temporosYear,
    );
  }, [hoveredCountry, temporosYear]);

  const focusedInvention = useMemo(
    () => inventions.find((inv) => inv.id === focusedInventionId) ?? null,
    [focusedInventionId],
  );

  const activeInvention = useMemo(
    () => inventions.find((inv) => inv.id === activeInventionId) ?? null,
    [activeInventionId],
  );

  const hoveredInvention = useMemo(
    () => inventions.find((inv) => inv.id === hoveredInventionId) ?? null,
    [hoveredInventionId],
  );

  useEffect(() => {
    onCameraReady?.({
      flyToInvention,
      flyToCountries,
      reset,
      pauseAutoRotate,
      resumeAutoRotateAfterDelay,
    });

    return () => {
      onCameraReady?.(null);
    };
  }, [flyToCountries, flyToInvention, onCameraReady, pauseAutoRotate, reset, resumeAutoRotateAfterDelay]);

  useEffect(() => {
    const Cesium = cesiumRef.current;
    const v = viewerRef.current;
    const container = containerRef.current;
    if (!Cesium || !v || !container) return;

    const computePosition = (
      invention: Invention | null,
      overlayWidth: number,
      overlayHeight: number,
    ): OverlayScreenPosition | null => {
      if (!invention) return null;

      const world = Cesium.Cartesian3.fromDegrees(
        invention.location.lng,
        invention.location.lat,
        0,
      );

      const surfaceNormal = Cesium.Cartesian3.normalize(
        world,
        new Cesium.Cartesian3(),
      );
      const toCamera = Cesium.Cartesian3.normalize(
        Cesium.Cartesian3.subtract(v.camera.positionWC, world, new Cesium.Cartesian3()),
        new Cesium.Cartesian3(),
      );

      if (Cesium.Cartesian3.dot(surfaceNormal, toCamera) <= 0) {
        return null;
      }

      const windowPosition = Cesium.SceneTransforms.worldToWindowCoordinates(v.scene, world);
      if (!windowPosition) return null;

      return clampOverlayPosition(
        windowPosition.x,
        windowPosition.y,
        container.clientWidth,
        container.clientHeight,
        overlayWidth,
        overlayHeight,
      );
    };

    const updateOverlayPositions = () => {
      setFocusedOverlayPosition(
        computePosition(
          activeInvention ? null : focusedInvention,
          PREVIEW_OVERLAY_SIZE.width,
          PREVIEW_OVERLAY_SIZE.height,
        ),
      );
      setHoveredOverlayPosition(
        computePosition(
          activeInvention || focusedInvention ? null : hoveredInvention,
          PREVIEW_OVERLAY_SIZE.width,
          PREVIEW_OVERLAY_SIZE.height,
        ),
      );
      setActiveOverlayPosition(
        computePosition(
          activeInvention,
          CONTEXT_OVERLAY_SIZE.width,
          CONTEXT_OVERLAY_SIZE.height,
        ),
      );
    };

    updateOverlayPositions();
    v.scene.postRender.addEventListener(updateOverlayPositions);

    return () => {
      if (!v.isDestroyed()) {
        v.scene.postRender.removeEventListener(updateOverlayPositions);
      }
    };
  }, [activeInvention, focusedInvention, hoveredInvention]);

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
      v.scene.globe.enableLighting = true;
      v.scene.globe.showGroundAtmosphere = true;

      try {
        const response = await fetch(COUNTRY_BOUNDARY_URL);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const representedCountries = new Set(inventions.map((invention) => invention.countryCode));
        const rawGeoJson = (await response.json()) as GeoJsonFeatureCollection;
        const geoJson = normalizeCountryBoundaryGeoJson(rawGeoJson, representedCountries);
        const dataSource = await Cesium.GeoJsonDataSource.load(geoJson, {
          clampToGround: true,
        });

        representedCountries.forEach((countryCode) => {
          const entities = dataSource.entities.values.filter(
            (entity) => getCountryCodeFromEntity(entity) === countryCode,
          );

          styleBoundaryEntities(
            Cesium,
            entities,
            countryCode,
            highlightedCountryCodesRef,
            hoveredCountryCodeRef,
          );
        });

        await v.dataSources.add(dataSource);
      } catch (error) {
        console.warn("Failed to load country boundaries:", error);
      }

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
      setCenteredView(DEFAULT_VIEW);

      if (process.env.NODE_ENV !== "production") {
        (
          window as Window & {
            __inventorNetGlobe?: {
              getState: () => {
                autoRotateEnabled: boolean;
                userInteracting: boolean;
                trackedView: GlobeViewTarget;
                centeredView: GlobeViewTarget | null;
              };
            };
          }
        ).__inventorNetGlobe = {
          getState: () => {
            const viewportCenter = new Cesium.Cartesian2(
              v.canvas.clientWidth / 2,
              v.canvas.clientHeight / 2,
            );
            const ray = v.camera.getPickRay(viewportCenter);
            const globePoint = ray ? v.scene.globe.pick(ray, v.scene) : null;
            const centerCartographic = globePoint
              ? Cesium.Cartographic.fromCartesian(globePoint)
              : null;
            const cameraCartographic = Cesium.Cartographic.fromCartesian(v.camera.positionWC);

            return {
              autoRotateEnabled: autoRotateEnabledRef.current,
              userInteracting: userInteractingRef.current,
              trackedView: currentViewRef.current,
              centeredView: centerCartographic && cameraCartographic
                ? {
                  lng: normalizeLongitude(Cesium.Math.toDegrees(centerCartographic.longitude)),
                  lat: Cesium.Math.toDegrees(centerCartographic.latitude),
                  height: cameraCartographic.height,
                }
                : null,
            };
          },
        };
      }

      // Click handler
      v.screenSpaceEventHandler.setInputAction(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (click: any) => {
          const picked = v.scene.pick(click.position);
          if (Cesium.defined(picked) && picked.id) {
            const entity = picked.id;
            const countryCode = getCountryCodeFromEntity(entity);

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
              return;
            }

            if (
              countryCode &&
              inventions.some((inv) => inv.countryCode === countryCode)
            ) {
              pauseAutoRotate();
              onCountrySelect(countryCode);
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
            entity === hoveredEntity
              || inventionId === activeInventionIdRef.current
              || inventionId === focusedInventionIdRef.current,
          );
        });
      };

      // Hover handler — show/hide labels
      v.screenSpaceEventHandler.setInputAction(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (movement: any) => {
          const picked = v.scene.pick(movement.endPosition);
          if (Cesium.defined(picked) && picked.id) {
            const entity = picked.id;
            const inventionId = entity.properties?.inventionId?.getValue?.();
            const countryCode = getCountryCodeFromEntity(entity);
            const countryName = getCountryNameFromEntity(entity);

            if (inventionId) {
              setHoveredInventionId(inventionId);
              hoveredCountryCodeRef.current = null;
              setHoveredCountry(null);
              syncLabelVisibility(entity);
              return;
            }

            if (countryCode && countryName) {
              setHoveredInventionId(null);
              hoveredCountryCodeRef.current = countryCode;
              setHoveredCountry({
                code: countryCode,
                name: countryName,
                x: movement.endPosition.x,
                y: movement.endPosition.y,
              });
              syncLabelVisibility();
              return;
            }

            return;
          }

          setHoveredInventionId(null);
          hoveredCountryCodeRef.current = null;
          setHoveredCountry(null);
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
        syncCurrentViewFromViewport();
        resumeAutoRotateAfterDelay();
      };

      const handleWheel = () => {
        pauseAutoRotate();
        syncCurrentViewFromViewport();
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
      const removeUpdateListener = v.scene.preUpdate.addEventListener(() => {
        if (
          autoRotateEnabledRef.current &&
          !userInteractingRef.current &&
          !v.isDestroyed()
        ) {
          const now = performance.now();
          const deltaSeconds = Math.min((now - lastFrameTime) / 1000, 0.06);
          lastFrameTime = now;

          if (deltaSeconds > 0) {
            const currentView = currentViewRef.current;
            setCenteredView({
              ...currentView,
              lng: currentView.lng - Cesium.Math.toDegrees(AUTO_ROTATE_RADIANS_PER_SECOND * deltaSeconds),
            });
          }
        } else {
          lastFrameTime = performance.now();
        }
      });

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
      setHoveredInventionId(null);
      hoveredCountryCodeRef.current = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const v = viewer as any;
      if (v && !v.isDestroyed()) {
        v.destroy();
      }
      viewerRef.current = null;
      cesiumRef.current = null;
      if (process.env.NODE_ENV !== "production") {
        delete (
          window as Window & {
            __inventorNetGlobe?: unknown;
          }
        ).__inventorNetGlobe;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearResumeTimer, onInventionSelect, pauseAutoRotate, resumeAutoRotateAfterDelay, setCenteredView, syncCurrentViewFromViewport]);

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
        const isFocused = inv.id === focusedInventionId;
        const isActive = inv.id === activeInventionId;
        const isEmphasized = isFocused || isActive;

        const position = Cesium.Cartesian3.fromDegrees(
          inv.location.lng,
          inv.location.lat,
          0,
        );

        // Add billboard + label entity
        v.entities.add({
          position,
          billboard: {
            image: inv.imageSrc,
            width: isActive ? 148 : isFocused ? 136 : 104,
            height: isActive ? 108 : isFocused ? 100 : 76,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            pixelOffset: new Cesium.Cartesian2(0, isEmphasized ? -24 : -10),
            scaleByDistance: new Cesium.NearFarScalar(1500000, 1, 22000000, isEmphasized ? 0.74 : 0.52),
            translucencyByDistance: new Cesium.NearFarScalar(1500000, 1, 22000000, isEmphasized ? 0.96 : 0.8),
            color: isActive
              ? Cesium.Color.WHITE
              : isFocused
                ? Cesium.Color.fromCssColorString("#dbeafe")
                : Cesium.Color.WHITE.withAlpha(0.92),
          },
          label: {
            text: `${inv.title}\n${getInventionOriginLabel(inv)}`,
            font: "12px sans-serif",
            fillColor: isEmphasized ? cesiumColor.brighten(0.3, new Cesium.Color()) : Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, isEmphasized ? -132 : -92),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            show: isEmphasized,
          },
          point: {
            color: isActive
              ? Cesium.Color.fromCssColorString("#60a5fa")
              : cesiumColor.withAlpha(isFocused ? 1 : 0.92),
            outlineColor: Cesium.Color.fromCssColorString(isActive ? "#dbeafe" : "#07111d"),
            outlineWidth: isEmphasized ? 3 : 2,
            pixelSize: isActive ? 12 : isFocused ? 10 : 7,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
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
    v.scene.requestRender();
  }, [activeInventionId, focusedInventionId, highlightedCountryCodes, temporosYear]);

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100%", minHeight: "520px" }}
      />

      {focusedInvention && focusedOverlayPosition && !activeInvention ? (
        <InventionFocusOverlay
          invention={focusedInvention}
          position={focusedOverlayPosition}
          mode="preview"
          onActivate={onInventionSelect}
        />
      ) : null}

      {hoveredInvention && hoveredOverlayPosition && !focusedInvention && !activeInvention ? (
        <InventionFocusOverlay
          invention={hoveredInvention}
          position={hoveredOverlayPosition}
          mode="preview"
          onActivate={onInventionSelect}
        />
      ) : null}

      {activeInvention && activeOverlayPosition ? (
        <InventionFocusOverlay
          invention={activeInvention}
          position={activeOverlayPosition}
          mode="context"
          onActivate={onInventionSelect}
          onEnterViewer={onEnterViewer}
          onOpenDetails={onOpenDetails}
        />
      ) : null}

      {hoveredCountry ? (
        <div
          className="pointer-events-none absolute z-10 rounded-2xl border border-white/12 bg-[#08101d]/90 px-3 py-2 shadow-2xl shadow-black/35 backdrop-blur-xl"
          style={{
            left: hoveredCountry.x + 20,
            top: Math.max(24, hoveredCountry.y - 18),
          }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-blue-200/55">
            Country
          </p>
          <div className="mt-1 flex items-center gap-3">
            <h3 className="text-sm font-semibold text-white">{hoveredCountry.name}</h3>
            <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-100/80">
              {hoveredCountryInventions.length} invention{hoveredCountryInventions.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
