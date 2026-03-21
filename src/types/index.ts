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

export interface ViewerState {
  isExploded: boolean;
  highlightedComponentIds: string[];
}

export interface ChatRequest {
  messages: ChatMessage[];
  inventionId: string;
  componentId?: string | null;
  viewerState?: ViewerState | null;
  sessionId?: string;
  clientMessageId?: string;
}

export interface ChatResponse {
  content: string;
  actions: ExpertAction[];
  assistantMessageId?: string;
  sessionId?: string;
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

export type VoiceSessionStatus =
  | "disabled"
  | "idle"
  | "connecting"
  | "connected"
  | "listening"
  | "thinking"
  | "speaking"
  | "disconnecting"
  | "error";

export type VoiceSessionEvent =
  | {
      cursor: number;
      type: "message";
      message: ChatMessage;
    }
  | {
      cursor: number;
      type: "actions";
      actions: ExpertAction[];
    };

export interface VoiceSessionResponse {
  enabled: boolean;
  sessionId?: string;
  appId?: string;
  channelName?: string;
  rtcUid?: number;
  rtcToken?: string | null;
  status: VoiceSessionStatus;
  partialTranscript?: string | null;
  cursor?: number;
  pollIntervalMs?: number;
  error?: string;
}

export interface VoiceSessionPollResponse {
  enabled: boolean;
  sessionId: string;
  status: VoiceSessionStatus;
  partialTranscript: string | null;
  cursor: number;
  events: VoiceSessionEvent[];
}

export interface VoiceAgentInviteRequest {
  sessionId: string;
}

export interface VoiceAgentRemoveRequest {
  sessionId: string;
}

export interface VoiceAgentInviteResponse {
  ok: boolean;
  agentId?: string;
}

export interface VoiceAgentWebhookRequest {
  model?: string;
  stream?: boolean;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
}

export interface VoiceAgentWebhookResponse {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: Array<{
    index: number;
    finish_reason: "stop";
    message: {
      role: "assistant";
      content: string;
    };
  }>;
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

export interface ViewerTransform {
  rotationX: number;
  rotationY: number;
}

export type GestureControlStatus =
  | "idle"
  | "starting"
  | "tracking"
  | "blocked"
  | "unsupported"
  | "error";

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
