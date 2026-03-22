"use client";

import type { Category, CategoryId, CountryHoverData, Invention } from "@/types";
import type { GlobeMethods } from "react-globe.gl";
import Globe from "react-globe.gl";
import { useEffect, useMemo, useRef, useState } from "react";
import { useWindowSize } from "@/hooks/useWindowSize";

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
  onCountryClick: (countryCode: string, countryName: string) => void;
  onInventionClick: (inventionId: string) => void;
  onCountryHover: (data: CountryHoverData | null) => void;
  globeRef?: React.MutableRefObject<GlobeMethods | undefined>;
  hoveredCountry?: CountryHoverData | null;
}

const GEOJSON_URL =
  "https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson";
const GLOBE_TEXTURE_URL =
  "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg";
const SKY_TEXTURE_URL =
  "https://raw.githubusercontent.com/vasturiano/three-globe/master/example/img/night-sky.png";

// Geographic centroids for countries in the dataset
const COUNTRY_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  US: { lat: 39.5, lng: -98.35 },
  GB: { lat: 55.37, lng: -3.44 },
  DE: { lat: 51.17, lng: 10.45 },
  CH: { lat: 46.82, lng: 8.23 },
  SE: { lat: 60.13, lng: 18.64 },
  CN: { lat: 35.86, lng: 104.2 },
  JP: { lat: 36.2, lng: 138.25 },
  IT: { lat: 41.87, lng: 12.57 },
};

// Star polygon points for a 5-pointed star in a 40×40 viewBox
const STAR_POINTS = "20,2 24.4,13.9 37.1,14.4 27.1,22.3 30.6,34.6 20,27.5 9.4,34.6 12.9,22.3 2.9,14.4 15.6,13.9";

function createStarElement(
  data: CountryHoverData,
  onHoverRef: React.MutableRefObject<(d: CountryHoverData | null) => void>,
): HTMLElement {
  const count = data.inventions.length;

  const wrapper = document.createElement("div");
  wrapper.style.cssText = "pointer-events: auto; cursor: pointer; user-select: none;";

  const inner = document.createElement("div");
  inner.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    transform: translate(-50%, -50%);
    transition: transform 0.2s ease;
  `;

  const starWrap = document.createElement("div");
  starWrap.style.cssText = `
    position: relative;
    filter: drop-shadow(0 0 6px rgba(212,175,85,0.85)) drop-shadow(0 0 14px rgba(212,175,85,0.4));
    transition: filter 0.2s ease, transform 0.2s ease;
  `;

  starWrap.innerHTML = `
    <svg width="44" height="44" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <polygon points="${STAR_POINTS}" fill="#d4af55" opacity="0.92"/>
      <text x="20" y="21.5" text-anchor="middle" dominant-baseline="middle"
        font-family="Arial,sans-serif" font-size="11" font-weight="700" fill="#0a0b14">
        ${count}
      </text>
    </svg>
  `;

  const label = document.createElement("div");
  label.style.cssText = `
    font-size: 9px;
    color: rgba(212,175,85,0.75);
    font-family: Arial, sans-serif;
    margin-top: 1px;
    white-space: nowrap;
    text-shadow: 0 0 6px rgba(0,0,0,1), 0 0 3px rgba(0,0,0,1);
    letter-spacing: 0.05em;
  `;
  label.textContent = data.country;

  inner.appendChild(starWrap);
  inner.appendChild(label);
  wrapper.appendChild(inner);

  wrapper.addEventListener("mouseenter", () => {
    starWrap.style.filter =
      "drop-shadow(0 0 10px rgba(212,175,85,1)) drop-shadow(0 0 24px rgba(212,175,85,0.7))";
    starWrap.style.transform = "scale(1.25)";
    onHoverRef.current(data);
  });

  wrapper.addEventListener("mouseleave", () => {
    starWrap.style.filter =
      "drop-shadow(0 0 6px rgba(212,175,85,0.85)) drop-shadow(0 0 14px rgba(212,175,85,0.4))";
    starWrap.style.transform = "scale(1)";
    onHoverRef.current(null);
  });

  return wrapper;
}

export default function GlobeClient({
  inventions,
  categories,
  activeCategories,
  selectedInventionId,
  onCountryClick,
  onInventionClick,
  onCountryHover,
  globeRef,
  hoveredCountry,
}: GlobeClientProps) {
  const { width, height } = useWindowSize();
  const localRef = useRef<GlobeMethods | undefined>(undefined);
  const [geoCountries, setGeoCountries] = useState<GeoFeature[]>([]);
  const [hoverCountry, setHoverCountry] = useState<GeoFeature | null>(null);

  // Keep callback in ref to avoid stale closures in DOM event listeners
  const onCountryHoverRef = useRef(onCountryHover);
  useEffect(() => {
    onCountryHoverRef.current = onCountryHover;
  }, [onCountryHover]);

  useEffect(() => {
    if (globeRef && localRef.current) globeRef.current = localRef.current;
  });

  useEffect(() => {
    const globe = localRef.current;
    if (!globe) return;
    const controls = globe.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.2;
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
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

  // Group inventions by country for star markers
  const countryData = useMemo<CountryHoverData[]>(() => {
    const map = new Map<string, CountryHoverData>();
    for (const inv of filtered) {
      if (!map.has(inv.countryCode)) {
        const centroid = COUNTRY_CENTROIDS[inv.countryCode] ?? inv.location;
        map.set(inv.countryCode, {
          countryCode: inv.countryCode,
          country: inv.country,
          inventions: [],
        });
        // attach coordinates via a local extension
        (map.get(inv.countryCode) as CountryHoverData & { lat: number; lng: number }).lat =
          centroid.lat;
        (map.get(inv.countryCode) as CountryHoverData & { lat: number; lng: number }).lng =
          centroid.lng;
      }
      map.get(inv.countryCode)!.inventions.push(inv);
    }
    return Array.from(map.values());
  }, [filtered]);

  // Memoise the HTML element factory to avoid recreating elements on every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const htmlElementFactory = useMemo(
    () => (d: object) =>
      createStarElement(d as CountryHoverData, onCountryHoverRef),
    // Intentionally only regenerate when countryData changes (not the ref)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [countryData],
  );

  // Selected invention label (just for highlighted marker)
  const selectedMarker = useMemo(() => {
    if (!selectedInventionId) return [];
    const inv = filtered.find((i) => i.id === selectedInventionId);
    if (!inv) return [];
    return [{ id: inv.id, lat: inv.location.lat, lng: inv.location.lng, name: inv.title }];
  }, [filtered, selectedInventionId]);

  // Premium hover label for the country
  const hoverLabels = useMemo(() => {
    if (!hoveredCountry) return [];
    const centroid = COUNTRY_CENTROIDS[hoveredCountry.countryCode];
    if (!centroid) return [];
    return [{
      name: hoveredCountry.country,
      lat: centroid.lat,
      lng: centroid.lng,
    }];
  }, [hoveredCountry]);

  const allLabels = useMemo(() => [...selectedMarker, ...hoverLabels], [selectedMarker, hoverLabels]);

  return (
    <div className="h-full w-full overflow-hidden">
      <Globe
        ref={localRef as React.MutableRefObject<GlobeMethods | undefined>}
        width={width}
        height={height}
        globeImageUrl={GLOBE_TEXTURE_URL}
        backgroundImageUrl={SKY_TEXTURE_URL}
        polygonsData={geoCountries}
        polygonCapColor={(feature: object) =>
          feature === hoverCountry ? "rgba(232, 229, 217, 0.8)" : "rgba(189, 203, 237, 0.06)"
        }
        polygonSideColor={() => "rgba(0,0,0,0)"}
        polygonStrokeColor={() => "rgba(212, 175, 85, 0.10)"}
        polygonAltitude={() => 0.005}
        onPolygonHover={(feature: object | null) =>
          setHoverCountry((feature as GeoFeature | null) ?? null)
        }
        polygonsTransitionDuration={0}
        onPolygonClick={(feature: object) => {
          const f = feature as GeoFeature;
          const code = f.properties.ISO_A2;
          const name = f.properties.ADMIN || f.properties.NAME || "";
          if (code) onCountryClick(code, name);
        }}
        polygonLabel={(feature: object) => {
          const f = feature as GeoFeature;
          const name = f.properties.ADMIN || f.properties.NAME || "";
          return `
            <div style="
              font-family: 'Playfair Display', serif;
              font-size: 14px;
              font-weight: 700;
              color: #f5f0e1;
              text-shadow: 0 0 8px rgba(0,0,0,0.8), 0 0 4px rgba(212, 175, 85, 0.5);
              letter-spacing: 0.1em;
              pointer-events: none;
              text-transform: uppercase;
            ">
              ${name}
            </div>
          `;
        }}
        // Country star markers
        htmlElementsData={countryData}
        htmlElement={htmlElementFactory}
        htmlLat={(d: object) =>
          ((d as CountryHoverData & { lat: number }).lat)
        }
        htmlLng={(d: object) =>
          ((d as CountryHoverData & { lng: number }).lng)
        }
        htmlAltitude={0.05}
        htmlTransitionDuration={300}
        // Labels (Both selected marker and hover premium label)
        labelsData={allLabels}
        labelLat={(m: object) => (m as { lat: number }).lat}
        labelLng={(m: object) => (m as { lng: number }).lng}
        labelText={(m: object) => (m as { name: string }).name}
        labelSize={(m: object) => {
          // If it's a hovering country label, make it larger and more "premium"
          const hLabels = hoverLabels as {name: string}[];
          const isHoverLabel = hLabels.some(h => h.name === (m as {name: string}).name);
          return isHoverLabel ? 1.4 : 0.4;
        }}
        labelDotRadius={(m: object) => {
          const hLabels = hoverLabels as {name: string}[];
          const isHoverLabel = hLabels.some(h => h.name === (m as {name: string}).name);
          return isHoverLabel ? 0 : 0.4; // Hide dot for hover label
        }}
        labelColor={(m: object) => {
          const hLabels = hoverLabels as {name: string}[];
          const isHoverLabel = hLabels.some(h => h.name === (m as {name: string}).name);
          return isHoverLabel ? "#f5f0e1" : "#d4af55";
        }}
        labelResolution={2}
        labelAltitude={(m: object) => {
          const hLabels = hoverLabels as {name: string}[];
          const isHoverLabel = hLabels.some(h => h.name === (m as {name: string}).name);
          return isHoverLabel ? 0.12 : 0.08;
        }}
        onLabelClick={(m: object) => {
          const id = (m as { id?: string }).id;
          if (id) onInventionClick(id);
        }}
      />
    </div>
  );
}
