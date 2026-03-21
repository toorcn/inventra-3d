"use client";

import { countries } from "@/data/countries";
import type { GlobeViewState, Invention } from "@/types";
import type { GlobeMethods } from "react-globe.gl";
import { useCallback, useState } from "react";

export type { GlobeMethods };

interface RefLike<T> {
  current: T | undefined;
}

const DEFAULT_VIEW: GlobeViewState = { lat: 20, lng: 0, altitude: 1.1 };

export function useGlobeCamera(globeRef: RefLike<GlobeMethods>) {
  const [currentView, setCurrentView] = useState<GlobeViewState>(DEFAULT_VIEW);

  const flyTo = useCallback(
    (lat: number, lng: number, altitude = 0.8, duration = 1600) => {
      const view = { lat, lng, altitude };
      globeRef.current?.pointOfView(view, duration);
      setCurrentView(view);
    },
    [globeRef],
  );

  const flyToCountry = useCallback(
    (countryCode: string, altitude = 1.9, duration = 1600) => {
      const country = countries.find((item) => item.code === countryCode);
      if (!country) {
        return;
      }
      flyTo(country.lat, country.lng, altitude, duration);
    },
    [flyTo],
  );

  const flyToInvention = useCallback(
    (invention: Invention, altitude = 1.3, duration = 1400) => {
      flyTo(invention.location.lat, invention.location.lng, altitude, duration);
    },
    [flyTo],
  );

  const reset = useCallback(() => {
    globeRef.current?.pointOfView(DEFAULT_VIEW, 1500);
    setCurrentView(DEFAULT_VIEW);
  }, [globeRef]);

  return {
    currentView,
    flyTo,
    flyToCountry,
    flyToInvention,
    reset,
  };
}
