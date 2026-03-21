import type { Country } from "@/types";

export const countries: Country[] = [
  { code: "US", name: "United States", lat: 39.8283, lng: -98.5795 },
  { code: "GB", name: "United Kingdom", lat: 55.3781, lng: -3.436 },
  { code: "IT", name: "Italy", lat: 45.4064, lng: 11.8768 },
];

export function getCountryByCode(code: string): Country | undefined {
  return countries.find((country) => country.code === code);
}
