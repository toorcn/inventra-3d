export type CategoryId =
  | "communications"
  | "optics"
  | "mechanical"
  | "consumer-electronics"
  | "transportation"
  | "medicine"
  | "computing"
  | "materials";

export type InventionImageStyle = "drawing" | "photo";
export type InventionImageType = "patent" | "archival" | "photo";

export interface InventionLocation {
  lat: number;
  lng: number;
  label: string;
}

export interface Invention {
  id: string;
  title: string;
  year: number;
  inventors: string[];
  location: InventionLocation;
  country: string;
  countryCode: string;
  category: CategoryId;
  description: string;
  patentNumber: string | null;
  hasModel: boolean;
  inventionDate: number;
  patentDate: number | null;
  commercialisationDate: number;
  imageSrc: string;
  imageAlt: string;
  imageStyle: InventionImageStyle;
  imageType: InventionImageType;
  imageSourceUrl: string;
  imageCredit?: string;
  sourceUrl: string;
  stateOrProvince?: string;
  avatarPersona: string;
  avatarVoiceStyle: string;
}

export interface GeometryDef {
  type: "box" | "sphere" | "cylinder" | "torus" | "torusKnot" | "plane" | "roundedBox";
  args: number[];
  rotation?: [number, number, number];
}

export interface InventionComponent {
  id: string;
  inventionId: string;
  name: string;
  description: string;
  materials: string[];
  patentText: string | null;
  file: string;
  offset: [number, number, number];
  geometry?: GeometryDef;
  assembledPosition: [number, number, number];
  explodedPosition: [number, number, number];
  color: string;
}

export interface Category {
  id: CategoryId;
  name: string;
  description: string;
  color: string;
  icon: string;
}

export interface Country {
  code: string;
  name: string;
  lat: number;
  lng: number;
}

export interface SearchFilters {
  query?: string;
  categories?: CategoryId[];
  region?: string;
  yearRange?: [number, number];
  country?: string;
}

export interface SearchResult {
  inventions: Invention[];
  filters: SearchFilters;
  explanation: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export interface ChatRequest {
  messages: ChatMessage[];
  inventionId: string;
  componentId?: string;
}

export interface GlobeMarker {
  id: string;
  lat: number;
  lng: number;
  name: string;
  category: CategoryId;
  color: string;
  size: number;
}

export interface GlobeViewState {
  lat: number;
  lng: number;
  altitude: number;
}

export interface ExplodedViewState {
  isExploded: boolean;
  selectedComponentId: string | null;
}

export interface UseInventionsReturn {
  inventions: Invention[];
  filtered: Invention[];
  activeCategories: CategoryId[];
  toggleCategory: (id: CategoryId) => void;
  selectCategory: (id: CategoryId | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  focusedInvention: Invention | null;
  selectFocusedInvention: (id: string | null) => void;
  activeInvention: Invention | null;
  selectActiveInvention: (id: string | null) => void;
  selectedInvention: Invention | null;
  selectInvention: (id: string | null) => void;
  selectedCountry: string | null;
  selectCountry: (code: string | null) => void;
  resetFilters: () => void;
}
