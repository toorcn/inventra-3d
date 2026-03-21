import type { Invention } from "@/types";

export function getInventionOriginLabel(
  invention: Pick<Invention, "country" | "stateOrProvince">,
): string {
  return invention.stateOrProvince
    ? `${invention.stateOrProvince}, ${invention.country}`
    : invention.country;
}
