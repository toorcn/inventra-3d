"use client";

import { inventionsToMarkers } from "@/components/globe/GlobeMarkers";
import type { Category, CategoryId, Invention } from "@/types";
import type { GlobeMethods } from "react-globe.gl";
import Globe from "react-globe.gl";
import { useEffect, useMemo, useRef, useState } from "react";

interface GeoFeature {
  properties: {
    ISO_A2?: string;
    ADMIN?: string;
    NAME?: string;
  };
  geometry: unknown;
}

interface GlobeClientProps {
  inventions: Invention[];
  categories: Category[];
  activeCategories: CategoryId[];
  selectedInventionId: string | null;
  onCountryClick: (countryCode: string) => void;
  onInventionClick: (inventionId: string) => void;
  globeRef?: React.MutableRefObject<GlobeMethods | undefined>;
}

const GEOJSON_URL =
  "https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson";
const GLOBE_TEXTURE_URL =
  "https://raw.githubusercontent.com/vasturiano/three-globe/master/example/img/earth-night.jpg";
const SKY_TEXTURE_URL =
  "https://raw.githubusercontent.com/vasturiano/three-globe/master/example/img/night-sky.png";

export default function GlobeClient({
  inventions,
  categories,
  activeCategories,
  selectedInventionId,
  onCountryClick,
  onInventionClick,
  globeRef,
}: GlobeClientProps) {
  const localRef = useRef<GlobeMethods | undefined>(undefined);
  const [geoCountries, setGeoCountries] = useState<GeoFeature[]>([]);
  const [hoverCountry, setHoverCountry] = useState<GeoFeature | null>(null);

  useEffect(() => {
    if (globeRef && localRef.current) globeRef.current = localRef.current;
  });

  useEffect(() => {
    fetch(GEOJSON_URL)
      .then((r) => r.json())
      .then((geojson) => setGeoCountries((geojson.features ?? []) as GeoFeature[]))
      .catch(() => setGeoCountries([]));
  }, []);

  const filtered = useMemo(
    () =>
      activeCategories.length
        ? inventions.filter((item) => activeCategories.includes(item.category))
        : inventions,
    [activeCategories, inventions],
  );

  const markers = useMemo(() => inventionsToMarkers(filtered, categories), [filtered, categories]);

  return (
    <div className="h-full min-h-[520px] w-full overflow-hidden">
      <Globe
        ref={localRef as React.MutableRefObject<GlobeMethods | undefined>}
        globeImageUrl={GLOBE_TEXTURE_URL}
        backgroundImageUrl={SKY_TEXTURE_URL}
        polygonsData={geoCountries}
        polygonCapColor={(feature: object) =>
          feature === hoverCountry ? "rgba(6, 182, 212, 0.35)" : "rgba(59, 130, 246, 0.08)"
        }
        polygonSideColor={() => "rgba(37, 99, 235, 0.12)"}
        polygonStrokeColor={() => "rgba(255,255,255,0.15)"}
        polygonAltitude={(feature: object) => (feature === hoverCountry ? 0.12 : 0.03)}
        onPolygonHover={(feature: object | null) =>
          setHoverCountry((feature as GeoFeature | null) ?? null)
        }
        onPolygonClick={(feature: object) => {
          const code = (feature as GeoFeature).properties.ISO_A2;
          if (code) onCountryClick(code);
        }}
        labelsData={markers}
        labelLat={(m: object) => (m as (typeof markers)[number]).lat}
        labelLng={(m: object) => (m as (typeof markers)[number]).lng}
        labelText={(m: object) => (m as (typeof markers)[number]).name}
        labelSize={(m: object) => (m as (typeof markers)[number]).size}
        labelDotRadius={(m: object) => (m as (typeof markers)[number]).size}
        labelColor={(m: object) => (m as (typeof markers)[number]).color}
        labelResolution={2}
        labelAltitude={(m: object) =>
          (m as (typeof markers)[number]).id === selectedInventionId ? 0.08 : 0.02
        }
        onLabelClick={(m: object) => onInventionClick((m as (typeof markers)[number]).id)}
      />
    </div>
  );
}
