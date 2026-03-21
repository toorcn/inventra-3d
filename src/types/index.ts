export type CategoryId =
  | "technology"
  | "biology"
  | "energy"
  | "materials"
  | "computing"
  | "transportation";

export interface Invention {
  id: string;
  title: string;
  year: number;
  inventors: string[];
  location: { lat: number; lng: number };
  country: string;
  countryCode: string;
  category: CategoryId;
  description: string;
  patentNumber: string | null;
  hasModel: boolean;
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
  geometry: GeometryDef;
  assembledPosition: [number, number, number];
  explodedPosition: [number, number, number];
  color: string;
}

export interface Category {
  id: CategoryId;
  name: string;
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

export type TranscriptDelivery = "typed" | "spoken";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  actions?: ExpertAction[];
  delivery?: TranscriptDelivery;
  timestamp: number;
}

export interface ChatRequest {
  messages: ChatMessage[];
  inventionId: string;
  componentId?: string;
}

export interface ChatResponse {
  content: string;
  actions: ExpertAction[];
}

export interface VoiceTranscribeResponse {
  text: string;
}

export interface VoiceSpeakRequest {
  text: string;
}

export interface AgoraVoicePrepareRequest {
  inventionId: string;
}

export interface AgoraVoicePrepareResponse {
  appId: string;
  channelName: string;
  token: string;
  userRtcUid: number;
  expiresAt: number;
}

export type ExpertAction =
  | {
      type: "highlight";
      componentIds: string[];
      durationMs?: number;
      color?: string;
      mode?: "glow" | "pulse";
    }
  | {
      type: "select";
      componentId: string;
      durationMs?: number;
    }
  | { type: "explode" }
  | { type: "assemble" }
  | { type: "reset" }
  | {
      type: "beam";
      fromComponentId: string;
      toComponentId: string;
      durationMs?: number;
      color?: string;
      thickness?: number;
    };

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
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedInvention: Invention | null;
  selectInvention: (id: string | null) => void;
  selectedCountry: string | null;
  selectCountry: (code: string | null) => void;
  resetFilters: () => void;
}
