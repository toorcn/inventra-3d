import type { CategoryId, Invention } from "@/types";

export const inventions: Invention[] = [
  {
    id: "telephone",
    title: "Telephone",
    year: 1876,
    inventors: ["Alexander Graham Bell"],
    location: { lat: 42.3601, lng: -71.0589, label: "Boston, MA" },
    country: "United States",
    countryCode: "US",
    category: "communications",
    description:
      "Alexander Graham Bell's telephone was the first device to successfully transmit intelligible speech electrically, forever transforming human communication. By converting sound waves into varying electrical currents and back again, it collapsed distances that once took days or weeks to bridge. The patent granted on March 7, 1876 — US174465A — remains one of the most valuable and contested patents in history.",
    patentNumber: "US174465A",
    hasModel: true,
    inventionDate: 1876,
    patentDate: 1876,
    commercialisationDate: 1877,
    avatarPersona: "Dr. Alexander Bell",
    avatarVoiceStyle: "formal Victorian gentleman, precise and enthusiastic about science",
  },
  {
    id: "iphone",
    title: "iPhone",
    year: 2007,
    inventors: ["Steve Jobs", "Apple Inc."],
    location: { lat: 37.3318, lng: -122.0312, label: "Cupertino, CA" },
    country: "United States",
    countryCode: "US",
    category: "consumer-electronics",
    description:
      "Steve Jobs unveiled the iPhone on January 9, 2007, combining a mobile phone, widescreen iPod, and internet communicator into a single revolutionary multi-touch device. Its capacitive glass touchscreen, seamless software, and the subsequent App Store ecosystem redefined what a personal computing device could be. Patent US7966578B2 covers the foundational multi-touch interface that has since been licensed and litigated across the entire smartphone industry.",
    patentNumber: "US7966578B2",
    hasModel: true,
    inventionDate: 2007,
    patentDate: 2011,
    commercialisationDate: 2007,
    avatarPersona: "Jony",
    avatarVoiceStyle: "calm, visionary, minimalist — speaks in terms of simplicity and beauty",
  },
  {
    id: "steam-engine",
    title: "Watt Steam Engine",
    year: 1769,
    inventors: ["James Watt"],
    location: { lat: 52.4862, lng: -1.8904, label: "Birmingham, UK" },
    country: "United Kingdom",
    countryCode: "GB",
    category: "mechanical",
    description:
      "James Watt's critical improvement — the separate condenser — transformed the Newcomen atmospheric engine into a practical, efficient workhorse capable of powering factories, mills, and mines. By keeping the cylinder permanently hot and condensing steam in a separate cool chamber, Watt dramatically cut fuel consumption and made steam power economically viable at scale. Patent GB913A/1769 launched the Industrial Revolution and gave the world its first universal unit of power: the watt.",
    patentNumber: "GB913A/1769",
    hasModel: true,
    inventionDate: 1769,
    patentDate: 1769,
    commercialisationDate: 1776,
    avatarPersona: "Mr. James Watt",
    avatarVoiceStyle: "methodical Scottish engineer, measured and precise, proud of efficiency",
  },
  {
    id: "telescope",
    title: "Refracting Telescope",
    year: 1609,
    inventors: ["Galileo Galilei"],
    location: { lat: 45.4064, lng: 11.8768, label: "Padua, Italy" },
    country: "Italy",
    countryCode: "IT",
    category: "optics",
    description:
      "Galileo Galilei built his improved refracting telescope in 1609 and became the first person to systematically observe the heavens with a scientific instrument, discovering the moons of Jupiter, the phases of Venus, and the cratered surface of the Moon. His design used a convex objective lens to gather light and a concave eyepiece to magnify the image, achieving roughly 20× magnification — far beyond any previous instrument. Although no patent was filed, Galileo's telescope shattered the Aristotelian cosmos and inaugurated the age of observational astronomy.",
    patentNumber: null,
    hasModel: true,
    inventionDate: 1609,
    patentDate: null,
    commercialisationDate: 1610,
    avatarPersona: "Professor Galileo",
    avatarVoiceStyle: "passionate Renaissance scholar, eloquent and defiant, awed by the universe",
  },
];

export function getInventionById(id: string): Invention | undefined {
  return inventions.find((invention) => invention.id === id);
}

export function getInventionsByCategory(category: CategoryId): Invention[] {
  return inventions.filter((invention) => invention.category === category);
}
