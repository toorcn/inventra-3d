import type { Country } from "@/types";

export const countries: Country[] = [
  { code: "US", name: "United States", lat: 39.8283, lng: -98.5795 },
  { code: "GB", name: "United Kingdom", lat: 55.3781, lng: -3.436 },
  { code: "IT", name: "Italy", lat: 45.4064, lng: 11.8768 },
  { code: "DE", name: "Germany", lat: 51.1657, lng: 10.4515 },
  { code: "AR", name: "Argentina", lat: -38.4161, lng: -63.6167 },
  { code: "CH", name: "Switzerland", lat: 46.8182, lng: 8.2275 },
  { code: "JP", name: "Japan", lat: 36.2048, lng: 138.2529 },
  { code: "CN", name: "China", lat: 35.8617, lng: 104.1954 },
  { code: "AU", name: "Australia", lat: -25.2744, lng: 133.7751 },
  { code: "SE", name: "Sweden", lat: 60.1282, lng: 18.6435 },
  { code: "FR", name: "France", lat: 46.2276, lng: 2.2137 },
];

export function getCountryByCode(code: string): Country | undefined {
  return countries.find((country) => country.code === code);
}
