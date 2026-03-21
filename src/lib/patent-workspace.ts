export type PatentAssetKind = "full_product" | "subassembly" | "component";
export type PatentFigureRole =
  | "full_product_view"
  | "subassembly_view"
  | "component_detail"
  | "auxiliary_view"
  | "irrelevant";
export type PatentAssemblyRole = "product" | "core" | "auxiliary" | "tooling_process";
export type PatentComponentRole = "root_product" | "core" | "auxiliary" | "inferred";
export type PatentEvidenceMode = "direct_crop" | "figure_context" | "contextual_inferred";
export type PatentInferenceStatus = "direct" | "partial" | "inferred";
export type PatentBuildableStatus = "buildable" | "feature_only" | "ambiguous";

export type NormalizedRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string | null;
  confidence?: number;
};

export type PatentFigureComponent = {
  refNumber: string | null;
  name: string;
};

export type PatentFigureComponentDetection = {
  id: string;
  name: string;
  refNumber: string | null;
  summary: string;
  functionDescription: string;
  kind: PatentAssetKind;
  confidence: number;
  region: NormalizedRegion | null;
  imageFilename: string;
  imagePath: string;
  sourceFigureId: string;
  qualityScore?: number;
  qualityIssues?: string[];
  cropValidation?: CropValidation;
  scaleHints?: PatentScaleHints;
};

export type PatentFigure = {
  id: string;
  filename: string;
  imagePath: string;
  pageNumber: number;
  label: string;
  description: string;
  role: PatentFigureRole;
  relationToRootProduct: string;
  assemblyHint: string | null;
  analysisSource: "vision" | "heuristic";
  failureReason: string | null;
  cropRegion: NormalizedRegion | null;
  components: PatentFigureComponent[];
  componentDetections: PatentFigureComponentDetection[];
  pageTextSnippet: string;
};

export type PatentComponentCandidate = {
  id: string;
  figureId: string;
  figureLabel: string;
  pageNumber: number;
  name: string;
  normalizedName: string;
  refNumber: string | null;
  summary: string;
  functionDescription: string;
  kind: PatentAssetKind;
  confidence: number;
  imagePath: string;
  imageFilename: string;
  clusterKey: string;
  qualityScore?: number;
  qualityIssues?: string[];
  cropValidation?: CropValidation;
  scaleHints?: PatentScaleHints;
  region: NormalizedRegion | null;
};

export type PatentScaleHints = {
  normalizedWidth: number;
  normalizedHeight: number;
  relativeArea: number;
};

export interface CropValidation {
  hasGeometry: boolean;
  coverageFraction: number; // 0-1 normalized
  issues: string[];         // e.g., ["label_only", "partial_cutoff", "mostly_whitespace"]
}

export interface SpatialRelationship {
  ref: string;
  relation: 'between' | 'through' | 'attached_to' | 'inside' | 'adjacent' | 'surrounds';
  targets: string[];
  axis?: 'x' | 'y' | 'z';
  side?: 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back';
  offset?: number;
}

export type PatentComponentEvidence = {
  candidateId: string;
  figureId: string;
  figureLabel: string;
  pageNumber: number;
  imagePath: string;
  imageFilename: string;
  refNumber: string | null;
  summary: string;
  functionDescription: string;
  confidence: number;
  qualityScore?: number;
  qualityIssues?: string[];
  cropValidation?: CropValidation;
  scaleHints?: PatentScaleHints;
  region: NormalizedRegion | null;
};

export type PatentAnchorRegion = {
  figureId: string;
  figureLabel: string;
  pageNumber: number;
  region: NormalizedRegion | null;
};

export type PatentComponentReviewStatus = "pending" | "approved" | "redundant" | "skipped";

export type PatentComponentGenerationStatus = "idle" | "queued" | "running" | "succeeded" | "failed";

export type PatentImageVariant = "realistic_display" | "three_d_source";

export type PatentGeneratedImageAsset = {
  outputPath: string;
  outputFilename: string;
  model: string;
  generatedAt: string;
  variant: PatentImageVariant;
};

export type PatentImageVariantState = {
  status: PatentComponentGenerationStatus;
  error: string | null;
  asset: PatentGeneratedImageAsset | null;
};

export type PatentMeshBounds = {
  min: [number, number, number];
  max: [number, number, number];
  size: [number, number, number];
  center: [number, number, number];
  longestAxis: number;
};

export type PatentOrientationBasis = {
  right: [number, number, number];
  up: [number, number, number];
  front: [number, number, number];
};

export type PatentThreeDAsset = {
  outputPath: string;
  outputFilename: string;
  provider: "fal";
  model: "fal-ai/trellis-2";
  requestId: string;
  sourceImageVariant: "three_d_source";
  generatedAt: string;
};

export type PatentAssemblyFitStatus = "pass" | "warn" | "fail";

export type PatentAssemblyContract = {
  componentId: string;
  role: "hero" | "subassembly";
  parentAssemblyId: string | null;
  nativeBounds: PatentMeshBounds;
  normalizedBounds: PatentMeshBounds;
  normalizedScale: number;
  expectedLinearScale: number;
  assembledPosition: [number, number, number];
  explodedOffset: [number, number, number];
  fitStatus: PatentAssemblyFitStatus;
  fitWarnings: string[];
  placementTier: 1 | 2 | 3;
  orientationBasis: PatentOrientationBasis;
};

export type PatentComponentRecord = {
  id: string;
  canonicalName: string;
  canonicalLabel: string;
  canonicalRefNumber: string | null;
  normalizedName: string;
  kind: PatentAssetKind;
  role: PatentComponentRole;
  buildableStatus: PatentBuildableStatus;
  reviewStatus: PatentComponentReviewStatus;
  mergeTargetId: string | null;
  refNumbers: string[];
  summary: string;
  functionDescription: string;
  confidence: number;
  clusterKey: string;
  candidateIds: string[];
  evidence: PatentComponentEvidence[];
  imageVariants: Record<PatentImageVariant, PatentImageVariantState>;
  threeDStatus: PatentComponentGenerationStatus;
  threeDError: string | null;
  threeDAsset: PatentThreeDAsset | null;
  assemblyContract: PatentAssemblyContract | null;
  parentAssemblyId: string | null;
  autoReviewReason?: string;
  scaleHints?: PatentScaleHints;
  evidenceMode: PatentEvidenceMode;
  visualEvidenceStrength: number;
  textEvidenceStrength: number;
  inferenceStatus: PatentInferenceStatus;
  supportingContext: PatentComponentSupportingContext;
  supportingFigureIds: string[];
  supportingTextSnippets: string[];
  anchorRegions: PatentAnchorRegion[];
};

export type PatentAssemblyNode = {
  id: string;
  name: string;
  kind: "full_product" | "subassembly";
  role: PatentAssemblyRole;
  summary: string;
  parentId: string | null;
  representativeComponentId: string | null;
  childComponentIds: string[];
  childRefNumbers: string[];
  groupedFigureIds: string[];
};

export type PatentReferenceEntry = {
  refNumber: string;
  canonicalLabel: string;
  normalizedLabel: string;
  summary: string;
  functionDescription: string;
  buildableStatus: PatentBuildableStatus;
  componentId: string | null;
  parentComponentId: string | null;
  supportingFigureIds: string[];
  supportingFigureLabels: string[];
  supportingTextSnippets: string[];
  candidateIds: string[];
  anchorRegions: PatentAnchorRegion[];
};

export type PatentComponentSupportingContext = {
  rootProductName: string;
  rootProductDescription: string;
  parentAssemblyName: string | null;
  supportingFigureIds: string[];
  supportingFigureLabels: string[];
  textSnippets: string[];
  relatedComponentIds: string[];
  relatedComponentNames: string[];
  assemblyChildRefNumbers: string[];
  evidencePolicyNote: string;
};

export type PatentProductModel = {
  rootProductComponentId: string | null;
  rootProductName: string;
  rootProductDescription: string;
  includeNotes: string[];
  excludeNotes: string[];
  candidateAssemblyNames: string[];
};

export type PatentReviewState = {
  pendingComponentIds: string[];
  approvedComponentIds: string[];
  redundantComponentIds: string[];
  skippedComponentIds: string[];
  mergedComponentIds: Record<string, string>;
  generatedComponentIds: string[];
  lastUpdatedAt: string;
};

export type PatentWorkspacePaths = {
  outputDirectory: string;
  manifestPath: string;
  textPath: string;
  candidateDirectory: string;
  generatedDirectory: string;
  threeDDirectory: string;
};

export type PatentWorkspaceStats = {
  figureCount: number;
  rawCandidateCount: number;
  libraryCount: number;
  pendingCount: number;
  approvedCount: number;
  redundantCount: number;
  skippedCount: number;
  generatedCount: number;
};

export type PatentWorkspaceManifest = {
  patentId: string;
  sourceFilename: string;
  totalPages: number;
  processedPages: number;
  extractedAt: string;
  extractedText: string;
  warnings: string[];
  capabilities: PatentWorkspaceCapabilities;
  paths: PatentWorkspacePaths;
  stats: PatentWorkspaceStats;
  figures: PatentFigure[];
  componentCandidates: PatentComponentCandidate[];
  componentLibrary: PatentComponentRecord[];
  referenceIndex: PatentReferenceEntry[];
  productModel: PatentProductModel;
  assemblies: PatentAssemblyNode[];
  reviewState: PatentReviewState;
  featured: PatentWorkspaceFeatured;
};

export type PatentWorkspaceCapabilities = {
  imageGeneration: boolean;
  threeDGeneration: boolean;
};

export type PatentWorkspaceFeatured = {
  rootAssemblyId: string | null;
  heroComponentId: string | null;
  subassemblyComponentIds: string[];
  subassemblyAssemblyIds: string[];
};

export function getPatentComponentImageState(
  component: PatentComponentRecord,
  variant: PatentImageVariant = "realistic_display",
): PatentImageVariantState {
  return component.imageVariants[variant];
}

export function getPatentComponentImageAsset(
  component: PatentComponentRecord,
  variant: PatentImageVariant = "realistic_display",
): PatentGeneratedImageAsset | null {
  return getPatentComponentImageState(component, variant).asset;
}

export type PatentExtractionResult = {
  outputDirectory: string;
  manifestPath: string;
  textPath: string;
  manifest: PatentWorkspaceManifest;
};

export type PatentReviewAction =
  | {
      type: "approve";
      componentId: string;
    }
  | {
      type: "skip";
      componentId: string;
    }
  | {
      type: "mark_redundant";
      componentId: string;
    }
  | {
      type: "mark_subassembly";
      componentId: string;
    }
  | {
      type: "merge";
      componentId: string;
      targetComponentId: string;
    };

function slugifyToken(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function isGenericPatentName(name: string): boolean {
  return new Set([
    "component",
    "portion",
    "part",
    "member",
    "section",
    "element",
    "device",
    "assembly",
    "body",
  ]).has(name.trim().toLowerCase());
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    if (!value) {
      continue;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }
    if (seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    result.push(trimmed);
  }

  return result;
}

function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripFileExtension(filename: string): string {
  return filename.replace(/\.[a-z0-9]+$/i, "").trim();
}

function tokenizeText(value: string): string[] {
  return normalizeName(value)
    .split(" ")
    .filter((token) => token.length > 1);
}

function countTokenOverlap(a: string, b: string): number {
  const bTokens = new Set(tokenizeText(b));
  return tokenizeText(a).filter((token) => bTokens.has(token)).length;
}

function includesAnyKeyword(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function isSectionLikeName(name: string): boolean {
  return /\b(section|portion|surface|left|right|top|bottom|inner|outer|base)\b/.test(normalizeName(name));
}

function isAuxiliaryLikeText(text: string): boolean {
  return includesAnyKeyword(normalizeName(text), [
    "fixture",
    "tool",
    "manufactur",
    "process",
    "method",
    "forming",
    "mold",
    "die",
    "actuator",
    "demonstrat",
    "test",
    "example",
  ]);
}

function inferKind(name: string, summary: string, figureLabel: string): PatentAssetKind {
  const text = `${name} ${summary} ${figureLabel}`.toLowerCase();
  if (/\b(full|overall|complete)\b/.test(text)) {
    return "full_product";
  }
  if (/\b(assembly|housing|body|cartridge|tip|barrel|mechanism|device|instrument)\b/.test(text)) {
    return "subassembly";
  }
  return "component";
}

function chooseCanonicalName(candidates: PatentComponentCandidate[]): string {
  const sorted = [...candidates].sort((a, b) => {
    const genericA = isGenericPatentName(a.name) ? 1 : 0;
    const genericB = isGenericPatentName(b.name) ? 1 : 0;
    if (genericA !== genericB) {
      return genericA - genericB;
    }
    if (Math.abs(a.confidence - b.confidence) > 0.001) {
      return b.confidence - a.confidence;
    }
    return b.name.length - a.name.length;
  });

  return sorted[0]?.name ?? "component";
}

function chooseBestDescription(
  candidates: PatentComponentCandidate[],
  field: "summary" | "functionDescription",
): string {
  const sorted = [...candidates]
    .map((candidate) => candidate[field].trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  return sorted[0] ?? "";
}

function chooseCanonicalLabel(candidates: PatentComponentCandidate[]): string {
  return chooseCanonicalName(candidates);
}

function extractSentences(extractedText: string): string[] {
  return extractedText
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function deriveReferenceTextSnippets(
  refNumber: string | null,
  canonicalLabel: string,
  extractedText: string,
  fallbackSnippets: string[],
): string[] {
  if (!extractedText.trim()) {
    return uniqueStrings(fallbackSnippets).slice(0, 3);
  }

  const sentences = extractSentences(extractedText);
  const labelTokens = tokenizeText(canonicalLabel);
  const matched = sentences.filter((sentence) => {
    const normalized = normalizeName(sentence);
    if (refNumber && sentence.includes(refNumber)) {
      return true;
    }

    return labelTokens.some((token) => normalized.includes(token));
  });

  return uniqueStrings([...fallbackSnippets, ...matched]).slice(0, 4);
}

function classifyBuildableStatus(
  canonicalLabel: string,
  summary: string,
  functionDescription: string,
  averageArea: number,
): PatentBuildableStatus {
  const text = normalizeName(`${canonicalLabel} ${summary} ${functionDescription}`);

  if (/\b(section|surface|edge|region|side)\b/.test(text)) {
    return "feature_only";
  }

  if (/\b(portion)\b/.test(text) && averageArea < 0.08) {
    return "feature_only";
  }

  if (/\b(groove|hole|wall|projection|notch|seat)\b/.test(text)) {
    return "ambiguous";
  }

  return "buildable";
}

function extractMentionedRefNumbers(text: string): string[] {
  const matches = text.match(/\b\d+[a-z]?\b/gi) ?? [];
  return uniqueStrings(matches);
}

function inferFeatureParentRefNumber(
  refNumber: string,
  canonicalLabel: string,
  summary: string,
  functionDescription: string,
  knownRefs: Set<string>,
  labelByRef: Map<string, string>,
): string | null {
  const mentionedRefs = extractMentionedRefNumbers(`${summary} ${functionDescription}`).filter((value) => value !== refNumber);
  const matchingMention = mentionedRefs.find((value) => knownRefs.has(value));
  if (matchingMention) {
    return matchingMention;
  }

  const ofMatch = `${summary} ${functionDescription}`.match(/\bof (?:the )?([a-z0-9 -]+)/i);
  const targetPhrase = normalizeName(ofMatch?.[1] ?? "");
  if (!targetPhrase) {
    return null;
  }

  for (const [candidateRef, candidateLabel] of labelByRef.entries()) {
    if (candidateRef === refNumber) {
      continue;
    }
    if (countTokenOverlap(candidateLabel, targetPhrase) > 0 || countTokenOverlap(targetPhrase, candidateLabel) > 0) {
      return candidateRef;
    }
  }

  if (canonicalLabel.toLowerCase().includes("portion")) {
    for (const [candidateRef, candidateLabel] of labelByRef.entries()) {
      if (candidateRef === refNumber) {
        continue;
      }
      if (countTokenOverlap(canonicalLabel.replace(/portion/gi, ""), candidateLabel) > 0) {
        return candidateRef;
      }
    }
  }

  return null;
}

function averageScaleHints(values: Array<PatentScaleHints | undefined>): PatentScaleHints | undefined {
  const valid = values.filter((value): value is PatentScaleHints => Boolean(value));
  if (valid.length === 0) {
    return undefined;
  }

  return {
    normalizedWidth: valid.reduce((sum, value) => sum + value.normalizedWidth, 0) / valid.length,
    normalizedHeight: valid.reduce((sum, value) => sum + value.normalizedHeight, 0) / valid.length,
    relativeArea: valid.reduce((sum, value) => sum + value.relativeArea, 0) / valid.length,
  };
}

function averageQuality(values: Array<number | undefined>): number {
  const valid = values.filter((value): value is number => typeof value === "number");
  if (valid.length === 0) {
    return 0.5;
  }
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function uniqueIssues(values: Array<string[] | undefined>): string[] {
  return uniqueStrings(values.flatMap((value) => value ?? []));
}

function deriveTextSnippets(
  component: PatentComponentRecord,
  figuresById: Map<string, PatentFigure>,
  extractedText: string,
): string[] {
  const figureSnippets = uniqueStrings(
    component.evidence.map((item) => figuresById.get(item.figureId)?.pageTextSnippet ?? "").filter(Boolean),
  ).slice(0, 2);
  if (!extractedText.trim()) {
    return figureSnippets;
  }

  const sentences = extractedText
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const refMatches = new Set(component.refNumbers);
  const nameTokens = tokenizeText(component.canonicalName);

  const matched = sentences.filter((sentence) => {
    const normalized = normalizeName(sentence);
    if (nameTokens.some((token) => normalized.includes(token))) {
      return true;
    }

    return Array.from(refMatches).some((refNumber) => sentence.includes(refNumber));
  });

  return uniqueStrings([...figureSnippets, ...matched]).slice(0, 3);
}

function scoreRootProductCandidate(component: PatentComponentRecord, patentTitle: string): number {
  const patentTitleNormalized = normalizeName(patentTitle);
  const candidateText = `${component.canonicalLabel} ${component.summary} ${component.functionDescription}`;
  const nameOverlap = countTokenOverlap(component.canonicalLabel, patentTitleNormalized);
  const descriptionOverlap = countTokenOverlap(candidateText, patentTitleNormalized);
  const genericPenalty = isGenericPatentName(component.canonicalLabel) ? 3 : 0;
  const sectionPenalty = isSectionLikeName(component.canonicalLabel) ? 2.5 : 0;
  const auxiliaryPenalty = isAuxiliaryLikeText(candidateText) ? 3 : 0;
  const buildablePenalty = component.buildableStatus === "feature_only" ? 6 : component.buildableStatus === "ambiguous" ? 1.5 : 0;

  return (
    (component.kind === "full_product" ? 8 : component.kind === "subassembly" ? 1 : 0) +
    nameOverlap * 4 +
    descriptionOverlap * 1.5 +
    component.evidence.length * 2 +
    component.confidence +
    (component.scaleHints?.relativeArea ?? 0) * 4 -
    genericPenalty -
    sectionPenalty -
    auxiliaryPenalty -
    buildablePenalty -
    (component.kind === "subassembly" && component.evidence.length === 1 ? 1.5 : 0)
  );
}

function pickRootProductComponentId(
  componentLibrary: PatentComponentRecord[],
  sourceFilename: string,
): string | null {
  if (componentLibrary.length === 0) {
    return null;
  }

  const patentTitle = stripFileExtension(sourceFilename);
  const sorted = componentLibrary
    .filter((component) => component.reviewStatus !== "redundant" && component.buildableStatus !== "feature_only")
    .sort(
    (a, b) => scoreRootProductCandidate(b, patentTitle) - scoreRootProductCandidate(a, patentTitle),
    );

  return sorted[0]?.id ?? null;
}

function pickHeroComponentId(
  componentLibrary: PatentComponentRecord[],
  rootProductComponentId: string | null,
): string | null {
  const approvedComponents = componentLibrary.filter(
    (component) => component.reviewStatus === "approved" && component.imageVariants.realistic_display.status !== "failed",
  );
  if (approvedComponents.length === 0) {
    return null;
  }

  if (rootProductComponentId) {
    const rootProduct = approvedComponents.find((component) => component.id === rootProductComponentId);
    if (rootProduct) {
      return rootProduct.id;
    }
  }

  const sorted = [...approvedComponents].sort((a, b) => {
    const tierA = a.role === "root_product" ? 100 : a.kind === "full_product" ? 50 : a.kind === "subassembly" ? 25 : 0;
    const tierB = b.role === "root_product" ? 100 : b.kind === "full_product" ? 50 : b.kind === "subassembly" ? 25 : 0;
    if (tierA !== tierB) {
      return tierB - tierA;
    }

    const scoreA = a.evidence.length * 2 + a.refNumbers.length + a.confidence + (a.scaleHints?.relativeArea ?? 0);
    const scoreB = b.evidence.length * 2 + b.refNumbers.length + b.confidence + (b.scaleHints?.relativeArea ?? 0);
    return scoreB - scoreA;
  });

  return sorted[0]?.id ?? null;
}

function pickHeroCandidateIndex(componentLibrary: PatentComponentRecord[], sourceFilename: string): number {
  const rootProductId = pickRootProductComponentId(componentLibrary, sourceFilename);
  const index = componentLibrary.findIndex((component) => component.id === rootProductId);
  return index >= 0 ? index : 0;
}

function createProductModel(
  sourceFilename: string,
  extractedText: string,
  componentLibrary: PatentComponentRecord[],
  rootProductComponentId: string | null,
): PatentProductModel {
  const rootComponent = componentLibrary.find((component) => component.id === rootProductComponentId) ?? null;
  const patentTitle = stripFileExtension(sourceFilename);
  const rootProductName = rootComponent?.canonicalName || patentTitle || "Patent product";
  const rootProductDescription =
    rootComponent?.summary ||
    extractedText.slice(0, 220) ||
    `Primary product inferred from patent ${patentTitle || "workspace"}.`;

  const assemblyNameSet = new Set<string>();
  for (const component of componentLibrary) {
    const text = `${component.canonicalName} ${component.summary} ${component.functionDescription}`.toLowerCase();
    if (includesAnyKeyword(text, ["ball", "socket", "seat", "projection", "edge"])) {
      assemblyNameSet.add("Ball retention geometry");
    }
    if (includesAnyKeyword(text, ["housing", "pipe", "body", "penholder", "joint member", "tip"])) {
      assemblyNameSet.add("Tip body / housing");
    }
    if (includesAnyKeyword(text, ["ink", "relay", "holding", "impregnation", "reservoir", "air hole", "groove"])) {
      assemblyNameSet.add("Ink feed / relay path");
    }
    if (includesAnyKeyword(text, ["valve", "regulating", "actuator", "wall"])) {
      assemblyNameSet.add("Valve or regulating mechanism");
    }
  }

  return {
    rootProductComponentId,
    rootProductName,
    rootProductDescription,
    includeNotes: [
      "Prioritize the finished patented product and the assemblies needed to understand how it is built.",
      "Keep alternate embodiments and mechanism views only when they add buildable context.",
    ],
    excludeNotes: [
      "Do not let repeated sectional fragments replace the actual root product.",
      "Keep tooling/process-only content visible but separate from the core product build.",
    ],
    candidateAssemblyNames: Array.from(assemblyNameSet),
  };
}

function classifyFigureRole(
  figure: PatentFigure,
  rootProductName: string,
  rootProductComponentId: string | null,
  componentLibrary: PatentComponentRecord[],
): Pick<PatentFigure, "role" | "relationToRootProduct" | "assemblyHint"> {
  const componentByCandidateId = new Map<string, PatentComponentRecord>();
  for (const component of componentLibrary) {
    for (const candidateId of component.candidateIds) {
      componentByCandidateId.set(candidateId, component);
    }
  }

  const supportingComponents = figure.componentDetections
    .map((detection) => componentByCandidateId.get(detection.id))
    .filter((component): component is PatentComponentRecord => Boolean(component));

  const figureText = `${figure.label} ${figure.description} ${supportingComponents.map((component) => component.canonicalName).join(" ")}`;
  const normalizedFigureText = normalizeName(figureText);
  const rootOverlap = countTokenOverlap(figureText, rootProductName);
  const hasRootEvidence = rootProductComponentId
    ? supportingComponents.some((component) => component.id === rootProductComponentId || component.role === "root_product")
    : false;
  const auxiliaryLike = isAuxiliaryLikeText(figureText);

  if (hasRootEvidence || rootOverlap >= 2 || supportingComponents.some((component) => component.kind === "full_product")) {
    return {
      role: "full_product_view",
      relationToRootProduct: `Shows the overall ${rootProductName}.`,
      assemblyHint: "Root product view",
    };
  }

  if (auxiliaryLike) {
    return {
      role: "auxiliary_view",
      relationToRootProduct: `Provides auxiliary or process context around the ${rootProductName}.`,
      assemblyHint: "Auxiliary / tooling context",
    };
  }

  if (supportingComponents.length >= 3 || figure.componentDetections.length >= 4) {
    return {
      role: "subassembly_view",
      relationToRootProduct: `Shows a grouped portion of the ${rootProductName}.`,
      assemblyHint: "Grouped product assembly view",
    };
  }

  if (normalizedFigureText.length === 0) {
    return {
      role: "irrelevant",
      relationToRootProduct: `No reliable relationship to ${rootProductName} could be derived.`,
      assemblyHint: null,
    };
  }

  return {
    role: "component_detail",
    relationToRootProduct: `Shows a detail component of the ${rootProductName}.`,
    assemblyHint: "Component detail",
  };
}

function deriveAssemblyBucket(component: PatentComponentRecord): {
  key: string;
  name: string;
  summary: string;
  role: PatentAssemblyRole;
} {
  const text = `${component.canonicalLabel} ${component.summary} ${component.functionDescription}`.toLowerCase();

  if (component.role === "auxiliary" || isAuxiliaryLikeText(text)) {
    return {
      key: "auxiliary",
      name: "Auxiliary / process context",
      summary: "Mechanisms, process views, or support artifacts that inform the patent but are not the main build path.",
      role: "auxiliary",
    };
  }

  if (includesAnyKeyword(text, ["ball", "seat", "socket", "projection", "edge", "retention"])) {
    return {
      key: "ball-retention",
      name: "Ball retention geometry",
      summary: "Parts that retain, guide, or seat the rolling ball at the tip.",
      role: "core",
    };
  }

  if (includesAnyKeyword(text, ["ink", "relay", "holding", "impregnation", "reservoir", "air hole", "groove"])) {
    return {
      key: "ink-feed",
      name: "Ink feed / relay path",
      summary: "Parts that store, wick, relay, or regulate ink and airflow through the tip.",
      role: "core",
    };
  }

  if (includesAnyKeyword(text, ["valve", "regulating", "actuator", "wall", "notch"])) {
    return {
      key: "valve-regulating",
      name: "Valve or regulating mechanism",
      summary: "Movable or regulating elements that influence ink flow or mechanical operation.",
      role: "tooling_process",
    };
  }

  return {
    key: "tip-body",
    name: "Tip body / housing",
    summary: "Primary structural parts that define the body and interface surfaces of the tip assembly.",
    role: "core",
  };
}

function deriveAssemblyMetadataFromComponents(components: PatentComponentRecord[]): {
  key: string;
  name: string;
  summary: string;
  role: PatentAssemblyRole;
} {
  const bucketCounts = new Map<
    string,
    {
      key: string;
      name: string;
      summary: string;
      role: PatentAssemblyRole;
      count: number;
    }
  >();

  for (const component of components) {
    const bucket = deriveAssemblyBucket(component);
    const current = bucketCounts.get(bucket.key) ?? { ...bucket, count: 0 };
    current.count += 1;
    bucketCounts.set(bucket.key, current);
  }

  return (
    [...bucketCounts.values()].sort((a, b) => b.count - a.count)[0] ?? {
      key: "grouped-assembly",
      name: "Grouped patent assembly",
      summary: "Reference-linked components grouped from shared patent figure evidence.",
      role: "core",
    }
  );
}

function scoreAssemblyRepresentative(component: PatentComponentRecord): number {
  return (
    (component.reviewStatus === "approved" ? 3 : 0) +
    component.evidence.length * 1.5 +
    component.confidence +
    (component.scaleHints?.relativeArea ?? 0)
  );
}

function buildAssemblies(
  patentId: string,
  componentLibrary: PatentComponentRecord[],
  productModel: PatentProductModel,
): PatentAssemblyNode[] {
  const rootAssemblyId = `${patentId}-full-product`;
  const rootChildComponents = componentLibrary.filter((component) => component.reviewStatus !== "redundant");
  const root: PatentAssemblyNode = {
    id: rootAssemblyId,
    name: productModel.rootProductName || "Patent Product Assembly",
    kind: "full_product",
    role: "product",
    summary: productModel.rootProductDescription,
    parentId: null,
    representativeComponentId: productModel.rootProductComponentId,
    childComponentIds: rootChildComponents.map((component) => component.id),
    childRefNumbers: uniqueStrings(rootChildComponents.flatMap((component) => component.refNumbers)),
    groupedFigureIds: uniqueStrings(rootChildComponents.flatMap((component) => component.supportingFigureIds)),
  };

  const eligibleComponents = rootChildComponents.filter(
    (component) => component.role !== "root_product" && component.buildableStatus !== "feature_only",
  );
  const figureGroups = new Map<
    string,
    {
      componentIds: string[];
      groupedFigureIds: string[];
    }
  >();

  const componentById = new Map(componentLibrary.map((component) => [component.id, component]));
  const figureToComponentIds = new Map<string, Set<string>>();

  for (const component of eligibleComponents) {
    for (const figureId of component.supportingFigureIds) {
      const current = figureToComponentIds.get(figureId) ?? new Set<string>();
      current.add(component.id);
      figureToComponentIds.set(figureId, current);
    }
  }

  for (const [figureId, componentIdsSet] of figureToComponentIds.entries()) {
    const componentIds = [...componentIdsSet];
    if (componentIds.length < 2) {
      continue;
    }

    const childRefNumbers = uniqueStrings(
      componentIds.flatMap((componentId) => componentById.get(componentId)?.refNumbers ?? []),
    );
    if (childRefNumbers.length < 2) {
      continue;
    }

    const groupKey = childRefNumbers.sort().join("|");
    const current = figureGroups.get(groupKey) ?? {
      componentIds,
      groupedFigureIds: [],
    };
    current.componentIds = uniqueStrings([...current.componentIds, ...componentIds]);
    current.groupedFigureIds = uniqueStrings([...current.groupedFigureIds, figureId]);
    figureGroups.set(groupKey, current);
  }

  const fallbackBuckets = new Map<
    string,
    {
      componentIds: string[];
      groupedFigureIds: string[];
    }
  >();

  if (figureGroups.size === 0) {
    for (const component of eligibleComponents) {
      const bucket = deriveAssemblyBucket(component);
      const current = fallbackBuckets.get(bucket.key) ?? {
        componentIds: [],
        groupedFigureIds: [],
      };
      current.componentIds.push(component.id);
      current.groupedFigureIds = uniqueStrings([...current.groupedFigureIds, ...component.supportingFigureIds]);
      fallbackBuckets.set(bucket.key, current);
    }
  }

  const assemblySource = figureGroups.size > 0 ? figureGroups : fallbackBuckets;
  const subassemblies: PatentAssemblyNode[] = Array.from(assemblySource.entries())
    .filter(([, bucket]) => bucket.componentIds.length > 0)
    .map(([bucketKey, bucket]) => {
      const bucketComponents = bucket.componentIds
        .map((componentId) => componentById.get(componentId) ?? null)
        .filter((component): component is PatentComponentRecord => Boolean(component));
      const metadata = deriveAssemblyMetadataFromComponents(bucketComponents);
      const representativeComponentId =
        [...bucket.componentIds]
          .map((componentId) => componentById.get(componentId) ?? null)
          .filter((component): component is PatentComponentRecord => Boolean(component))
          .sort((a, b) => scoreAssemblyRepresentative(b) - scoreAssemblyRepresentative(a))[0]?.id ?? null;

      return {
        id: `${patentId}-assembly-${bucketKey}`,
        name: metadata.name,
        kind: "subassembly",
        role: metadata.role,
        summary: metadata.summary,
        parentId: rootAssemblyId,
        representativeComponentId,
        childComponentIds: bucket.componentIds,
        childRefNumbers: uniqueStrings(bucketComponents.flatMap((component) => component.refNumbers)),
        groupedFigureIds: bucket.groupedFigureIds,
      };
    });

  return [root, ...subassemblies];
}

function attachAssemblyParents(
  componentLibrary: PatentComponentRecord[],
  assemblies: PatentAssemblyNode[],
  productModel: PatentProductModel,
  figures: PatentFigure[],
  extractedText: string,
): PatentComponentRecord[] {
  const rootAssembly = assemblies[0];
  const assemblyByComponentId = new Map<string, PatentAssemblyNode>();
  const figuresById = new Map(figures.map((figure) => [figure.id, figure]));

  for (const assembly of assemblies.slice(1)) {
    for (const childComponentId of assembly.childComponentIds) {
      assemblyByComponentId.set(childComponentId, assembly);
    }
  }

  return componentLibrary.map((component) => {
    if (component.reviewStatus === "redundant") {
      return component;
    }

    const parentAssembly = assemblyByComponentId.get(component.id) ?? rootAssembly ?? null;
    const textSnippets = uniqueStrings([
      ...component.supportingTextSnippets,
      ...deriveTextSnippets(component, figuresById, extractedText),
    ]).slice(0, 4);
    const hasDedicatedCandidateCrop = component.evidence.some((item) => item.imagePath.includes("/components/candidates/"));
    const visualEvidenceStrength = Math.max(
      component.confidence,
      averageQuality(component.evidence.map((item) => item.qualityScore)),
    );
    const textEvidenceStrength = textSnippets.length === 0 ? 0 : Math.min(1, 0.35 + textSnippets.length * 0.2);
    let evidenceMode: PatentEvidenceMode = hasDedicatedCandidateCrop
      ? visualEvidenceStrength < 0.55 && textEvidenceStrength > 0
        ? "contextual_inferred"
        : "direct_crop"
      : textEvidenceStrength > 0
        ? "contextual_inferred"
        : "figure_context";

    // After existing evidenceMode derivation, override if crop validation failed
    const bestEvidence = component.evidence[0];
    if (bestEvidence?.cropValidation) {
      const cv = bestEvidence.cropValidation;
      const cropFailed = !cv.hasGeometry || cv.coverageFraction < 0.30 ||
        cv.issues.some(i => ["label_only", "partial_cutoff"].includes(i));
      if (cropFailed && evidenceMode === "direct_crop") {
        evidenceMode = "figure_context";
      }
    }

    const inferenceStatus: PatentInferenceStatus =
      evidenceMode === "direct_crop" ? "direct" : evidenceMode === "figure_context" ? "partial" : "inferred";

    const relatedComponentIds = parentAssembly
      ? parentAssembly.childComponentIds.filter((componentId) => componentId !== component.id)
      : [];
    const relatedComponentNames = relatedComponentIds
      .map((componentId) => componentLibrary.find((item) => item.id === componentId)?.canonicalName ?? null)
      .filter((name): name is string => Boolean(name))
      .slice(0, 6);

    return {
      ...component,
      parentAssemblyId: parentAssembly?.id ?? rootAssembly?.id ?? null,
      visualEvidenceStrength,
      textEvidenceStrength,
      evidenceMode,
      inferenceStatus,
      supportingFigureIds: uniqueStrings(component.evidence.map((item) => item.figureId)),
      supportingTextSnippets: textSnippets,
      supportingContext: {
        rootProductName: productModel.rootProductName,
        rootProductDescription: productModel.rootProductDescription,
        parentAssemblyName: parentAssembly?.name ?? null,
        supportingFigureIds: uniqueStrings(component.evidence.map((item) => item.figureId)),
        supportingFigureLabels: uniqueStrings(component.evidence.map((item) => item.figureLabel)),
        textSnippets,
        relatedComponentIds,
        relatedComponentNames,
        assemblyChildRefNumbers: parentAssembly?.childRefNumbers ?? [],
        evidencePolicyNote:
          evidenceMode === "contextual_inferred"
            ? "No clean standalone figure exists for this part. Reconstruct conservatively from nearby figures and patent context."
            : evidenceMode === "figure_context"
              ? "Use broader figure context because dedicated component crops are limited."
              : "Use direct figure crops as the primary grounding for this component.",
      },
    };
  });
}

function autoReviewComponent(component: PatentComponentRecord): {
  reviewStatus: PatentComponentReviewStatus;
  reason: string;
} {
  const qualityScore = averageQuality(component.evidence.map((evidence) => evidence.qualityScore));
  const issues = uniqueIssues(component.evidence.map((evidence) => evidence.qualityIssues));
  const hasBlankEvidence = issues.includes("blank_crop");
  const hasTextEvidence = issues.includes("text_heavy");
  const genericName = isGenericPatentName(component.canonicalName);

  if (component.kind === "full_product") {
    return {
      reviewStatus: "approved",
      reason: "Auto-approved as the assembled product hero candidate.",
    };
  }

  if (hasBlankEvidence || (hasTextEvidence && qualityScore < 0.42)) {
    return {
      reviewStatus: "skipped",
      reason: "Auto-skipped because the supporting crop looked blank or text-heavy.",
    };
  }

  if (component.kind === "subassembly") {
    return {
      reviewStatus: "approved",
      reason: "Auto-approved as a likely subassembly for the exploded-view pipeline.",
    };
  }

  if (component.evidence.length > 1 && component.confidence >= 0.68 && !genericName) {
    return {
      reviewStatus: "approved",
      reason: "Auto-approved because multiple figure views agreed on the same component.",
    };
  }

  if (component.confidence < 0.44 || (genericName && component.evidence.length === 1 && qualityScore < 0.55)) {
    return {
      reviewStatus: "skipped",
      reason: "Auto-skipped because the candidate looked weak, generic, or low value.",
    };
  }

  return {
    reviewStatus: "pending",
    reason: "Kept for manual review because the extraction remains ambiguous.",
  };
}

function buildClusterKey(candidate: Omit<PatentComponentCandidate, "clusterKey">): string {
  if (candidate.refNumber?.trim()) {
    return `ref:${candidate.refNumber.trim()}`;
  }

  if (candidate.normalizedName && !isGenericPatentName(candidate.name)) {
    return `name:${candidate.normalizedName}`;
  }

  return `figure:${slugifyToken(candidate.figureLabel)}:${slugifyToken(candidate.normalizedName || candidate.summary || candidate.name)}`;
}

function buildStats(workspace: Omit<PatentWorkspaceManifest, "stats">): PatentWorkspaceStats {
  return {
    figureCount: workspace.figures.length,
    rawCandidateCount: workspace.componentCandidates.length,
    libraryCount: workspace.componentLibrary.length,
    pendingCount: workspace.reviewState.pendingComponentIds.length,
    approvedCount: workspace.reviewState.approvedComponentIds.length,
    redundantCount: workspace.reviewState.redundantComponentIds.length,
    skippedCount: workspace.reviewState.skippedComponentIds.length,
    generatedCount: workspace.reviewState.generatedComponentIds.length,
  };
}

function buildReviewState(componentLibrary: PatentComponentRecord[], previous?: PatentReviewState): PatentReviewState {
  const pendingComponentIds: string[] = [];
  const approvedComponentIds: string[] = [];
  const redundantComponentIds: string[] = [];
  const skippedComponentIds: string[] = [];
  const mergedComponentIds: Record<string, string> = {};
  const generatedComponentIds: string[] = [];

  for (const component of componentLibrary) {
    if (component.mergeTargetId) {
      mergedComponentIds[component.id] = component.mergeTargetId;
    }

    if (component.imageVariants.realistic_display.asset) {
      generatedComponentIds.push(component.id);
    }

    if (component.reviewStatus === "approved") {
      approvedComponentIds.push(component.id);
    } else if (component.reviewStatus === "redundant") {
      redundantComponentIds.push(component.id);
    } else if (component.reviewStatus === "skipped") {
      skippedComponentIds.push(component.id);
    } else {
      pendingComponentIds.push(component.id);
    }
  }

  return {
    pendingComponentIds,
    approvedComponentIds,
    redundantComponentIds,
    skippedComponentIds,
    mergedComponentIds,
    generatedComponentIds,
    lastUpdatedAt: previous?.lastUpdatedAt ?? new Date().toISOString(),
  };
}

function buildReferenceIndex(
  componentCandidates: PatentComponentCandidate[],
  figures: PatentFigure[],
  extractedText: string,
): Array<PatentReferenceEntry & { parentRefNumber: string | null }> {
  const figuresById = new Map(figures.map((figure) => [figure.id, figure]));
  const refs = new Map<string, PatentComponentCandidate[]>();

  for (const candidate of componentCandidates) {
    if (!candidate.refNumber) {
      continue;
    }
    const current = refs.get(candidate.refNumber) ?? [];
    current.push(candidate);
    refs.set(candidate.refNumber, current);
  }

  const provisionalEntries = Array.from(refs.entries()).map(([refNumber, candidates]) => {
    const canonicalLabel = chooseCanonicalLabel(candidates);
    const summary =
      chooseBestDescription(candidates, "summary") || `Patent reference ${refNumber} derived from figure evidence.`;
    const functionDescription =
      chooseBestDescription(candidates, "functionDescription") || "Functional role inferred from patent context.";
    const scaleHints = averageScaleHints(candidates.map((candidate) => candidate.scaleHints));
    const supportingFigureIds = uniqueStrings(candidates.map((candidate) => candidate.figureId));
    const supportingFigureLabels = uniqueStrings(candidates.map((candidate) => candidate.figureLabel));
    const fallbackSnippets = uniqueStrings(
      candidates.map((candidate) => figuresById.get(candidate.figureId)?.pageTextSnippet ?? "").filter(Boolean),
    ).slice(0, 2);

    return {
      refNumber,
      canonicalLabel,
      normalizedLabel: normalizeName(canonicalLabel),
      summary,
      functionDescription,
      buildableStatus: classifyBuildableStatus(
        canonicalLabel,
        summary,
        functionDescription,
        scaleHints?.relativeArea ?? 0,
      ),
      componentId: null,
      parentComponentId: null,
      parentRefNumber: null,
      supportingFigureIds,
      supportingFigureLabels,
      supportingTextSnippets: deriveReferenceTextSnippets(refNumber, canonicalLabel, extractedText, fallbackSnippets),
      candidateIds: candidates.map((candidate) => candidate.id),
      anchorRegions: candidates.map((candidate) => ({
        figureId: candidate.figureId,
        figureLabel: candidate.figureLabel,
        pageNumber: candidate.pageNumber,
        region: candidate.region,
      })),
    };
  });

  const knownRefs = new Set(provisionalEntries.map((entry) => entry.refNumber));
  const labelByRef = new Map(provisionalEntries.map((entry) => [entry.refNumber, entry.canonicalLabel]));

  return provisionalEntries.map((entry) => ({
    ...entry,
    parentRefNumber:
      entry.buildableStatus === "feature_only"
        ? inferFeatureParentRefNumber(
            entry.refNumber,
            entry.canonicalLabel,
            entry.summary,
            entry.functionDescription,
            knownRefs,
            labelByRef,
          )
        : null,
  }));
}

function createBaseComponentRecord(
  basePatentId: string,
  componentIndex: number,
  candidates: PatentComponentCandidate[],
  overrides: Partial<
    Pick<
      PatentComponentRecord,
      | "canonicalName"
      | "canonicalLabel"
      | "canonicalRefNumber"
      | "buildableStatus"
      | "kind"
      | "reviewStatus"
      | "mergeTargetId"
      | "autoReviewReason"
      | "supportingTextSnippets"
      | "supportingFigureIds"
      | "anchorRegions"
    >
  > = {},
): PatentComponentRecord {
  const canonicalName = overrides.canonicalName ?? chooseCanonicalName(candidates);
  const canonicalLabel = overrides.canonicalLabel ?? canonicalName;
  const normalizedName = normalizeName(canonicalName);
  const primaryKind =
    overrides.kind ??
    candidates.find((candidate) => candidate.kind === "full_product")?.kind ??
    candidates.find((candidate) => candidate.kind === "subassembly")?.kind ??
    candidates[0]?.kind ??
    "component";
  const evidence: PatentComponentEvidence[] = candidates.map((candidate) => ({
    candidateId: candidate.id,
    figureId: candidate.figureId,
    figureLabel: candidate.figureLabel,
    pageNumber: candidate.pageNumber,
    imagePath: candidate.imagePath,
    imageFilename: candidate.imageFilename,
    refNumber: candidate.refNumber,
    summary: candidate.summary,
    functionDescription: candidate.functionDescription,
    confidence: candidate.confidence,
    qualityScore: candidate.qualityScore,
    qualityIssues: candidate.qualityIssues,
    cropValidation: candidate.cropValidation,
    scaleHints: candidate.scaleHints,
    region: candidate.region,
  }));
  const scaleHints = averageScaleHints(evidence.map((item) => item.scaleHints));
  const supportingFigureIds = overrides.supportingFigureIds ?? uniqueStrings(evidence.map((item) => item.figureId));
  const supportingTextSnippets = overrides.supportingTextSnippets ?? [];
  const anchorRegions =
    overrides.anchorRegions ??
    evidence.map((item) => ({
      figureId: item.figureId,
      figureLabel: item.figureLabel,
      pageNumber: item.pageNumber,
      region: item.region,
    }));

  const provisional: PatentComponentRecord = {
    id: `${basePatentId}-component-${componentIndex}`,
    canonicalName,
    canonicalLabel,
    canonicalRefNumber: overrides.canonicalRefNumber ?? uniqueStrings(candidates.map((candidate) => candidate.refNumber))[0] ?? null,
    normalizedName,
    kind: primaryKind,
    role: "core",
    buildableStatus: overrides.buildableStatus ?? "buildable",
    reviewStatus: overrides.reviewStatus ?? "pending",
    mergeTargetId: overrides.mergeTargetId ?? null,
    refNumbers: uniqueStrings(candidates.map((candidate) => candidate.refNumber)),
    summary: chooseBestDescription(candidates, "summary") || `Patent component derived from ${candidates[0]?.figureLabel ?? "figure"}.`,
    functionDescription:
      chooseBestDescription(candidates, "functionDescription") || "Functional role inferred from figure context.",
    confidence:
      candidates.reduce((sum, candidate) => sum + candidate.confidence, 0) / Math.max(1, candidates.length),
    clusterKey: candidates[0]?.clusterKey ?? `component:${basePatentId}-component-${componentIndex}`,
    candidateIds: candidates.map((candidate) => candidate.id),
    evidence,
    imageVariants: {
      realistic_display: {
        status: "idle",
        error: null,
        asset: null,
      },
      three_d_source: {
        status: "idle",
        error: null,
        asset: null,
      },
    },
    threeDStatus: "idle",
    threeDError: null,
    threeDAsset: null,
    assemblyContract: null,
    parentAssemblyId: null,
    autoReviewReason: overrides.autoReviewReason,
    scaleHints,
    evidenceMode: "figure_context",
    visualEvidenceStrength: 0,
    textEvidenceStrength: 0,
    inferenceStatus: "partial",
    supportingContext: {
      rootProductName: "",
      rootProductDescription: "",
      parentAssemblyName: null,
      supportingFigureIds,
      supportingFigureLabels: uniqueStrings(evidence.map((item) => item.figureLabel)),
      textSnippets: supportingTextSnippets,
      relatedComponentIds: [],
      relatedComponentNames: [],
      assemblyChildRefNumbers: [],
      evidencePolicyNote: "Patent component planning has not been applied yet.",
    },
    supportingFigureIds,
    supportingTextSnippets,
    anchorRegions,
  };

  const autoReview = autoReviewComponent(provisional);
  return {
    ...provisional,
    reviewStatus: overrides.reviewStatus ?? autoReview.reviewStatus,
    autoReviewReason: overrides.autoReviewReason ?? autoReview.reason,
  };
}

function buildInitialComponentLibrary(
  basePatentId: string,
  componentCandidates: PatentComponentCandidate[],
  referenceIndex: Array<PatentReferenceEntry & { parentRefNumber: string | null }>,
): {
  componentLibrary: PatentComponentRecord[];
  referenceIndex: PatentReferenceEntry[];
} {
  const groupsByRef = new Map<string, PatentComponentCandidate[]>();
  const fallbackGroups = new Map<string, PatentComponentCandidate[]>();

  for (const candidate of componentCandidates) {
    if (candidate.refNumber) {
      const current = groupsByRef.get(candidate.refNumber) ?? [];
      current.push(candidate);
      groupsByRef.set(candidate.refNumber, current);
      continue;
    }

    const current = fallbackGroups.get(candidate.clusterKey) ?? [];
    current.push(candidate);
    fallbackGroups.set(candidate.clusterKey, current);
  }

  let componentIndex = 0;
  const componentLibrary: PatentComponentRecord[] = [];
  const componentIdByRef = new Map<string, string>();

  for (const entry of referenceIndex) {
    const candidates = groupsByRef.get(entry.refNumber) ?? [];
    componentIndex += 1;
    const component = createBaseComponentRecord(basePatentId, componentIndex, candidates, {
      canonicalName: entry.canonicalLabel,
      canonicalLabel: entry.canonicalLabel,
      canonicalRefNumber: entry.refNumber,
      buildableStatus: entry.buildableStatus,
      supportingTextSnippets: entry.supportingTextSnippets,
      supportingFigureIds: entry.supportingFigureIds,
      anchorRegions: entry.anchorRegions,
      reviewStatus: entry.buildableStatus === "feature_only" ? "redundant" : undefined,
      autoReviewReason:
        entry.buildableStatus === "feature_only"
          ? "Reference identified as a feature-level callout rather than a standalone buildable part."
          : undefined,
    });
    componentLibrary.push(component);
    componentIdByRef.set(entry.refNumber, component.id);
  }

  for (const candidates of fallbackGroups.values()) {
    componentIndex += 1;
    componentLibrary.push(createBaseComponentRecord(basePatentId, componentIndex, candidates));
  }

  const enrichedReferenceIndex: PatentReferenceEntry[] = referenceIndex.map((entry) => ({
    ...entry,
    componentId: componentIdByRef.get(entry.refNumber) ?? null,
    parentComponentId: entry.parentRefNumber ? (componentIdByRef.get(entry.parentRefNumber) ?? null) : null,
  }));

  const componentLibraryWithFeatureParents: PatentComponentRecord[] = componentLibrary.map((component) => {
    if (component.buildableStatus !== "feature_only" || !component.canonicalRefNumber) {
      return component;
    }

    const referenceEntry = enrichedReferenceIndex.find((entry) => entry.refNumber === component.canonicalRefNumber);
    const provisionalReferenceEntry = referenceIndex.find((entry) => entry.refNumber === component.canonicalRefNumber);
    if (!referenceEntry?.parentComponentId) {
      return {
        ...component,
        reviewStatus: "skipped" as const,
        mergeTargetId: null,
        autoReviewReason:
          "Reference looks like a feature-level callout and is withheld from standalone generation until parentage is clearer.",
      };
    }

    return {
      ...component,
      reviewStatus: "redundant" as const,
      mergeTargetId: referenceEntry.parentComponentId,
      autoReviewReason: `Attached as a feature-level patent callout on parent ref ${provisionalReferenceEntry?.parentRefNumber ?? "parent component"}.`,
    };
  });

  return {
    componentLibrary: componentLibraryWithFeatureParents,
    referenceIndex: enrichedReferenceIndex,
  };
}

export function createPatentComponentCandidate(input: Omit<PatentComponentCandidate, "clusterKey">): PatentComponentCandidate {
  return {
    ...input,
    clusterKey: buildClusterKey(input),
  };
}

function planPatentWorkspaceStructure(
  base: Pick<PatentWorkspaceManifest, "patentId" | "sourceFilename" | "extractedText">,
  figures: PatentFigure[],
  componentLibrary: PatentComponentRecord[],
): {
  productModel: PatentProductModel;
  figures: PatentFigure[];
  componentLibrary: PatentComponentRecord[];
  assemblies: PatentAssemblyNode[];
  featured: PatentWorkspaceFeatured;
} {
  const rootProductComponentId = pickRootProductComponentId(componentLibrary, base.sourceFilename);

  const normalizedLibrary = componentLibrary.map((component) => {
    if (component.id !== rootProductComponentId) {
      return component;
    }

    return {
      ...component,
      kind: "full_product" as const,
      role: "root_product" as const,
      reviewStatus: "approved" as const,
      autoReviewReason:
        "Selected as the patent root product after reconciling figure views, patent title, and cross-figure evidence.",
    };
  });

  const productModel = createProductModel(
    base.sourceFilename,
    base.extractedText,
    normalizedLibrary,
    rootProductComponentId,
  );

  const figuresWithRoles = figures.map((figure) => ({
    ...figure,
    ...classifyFigureRole(figure, productModel.rootProductName, productModel.rootProductComponentId, normalizedLibrary),
  }));

  const figureById = new Map(figuresWithRoles.map((figure) => [figure.id, figure]));
  const roleAwareLibrary = normalizedLibrary.map((component) => {
    if (component.id === rootProductComponentId) {
      return {
        ...component,
        role: "root_product" as const,
      };
    }

    const evidenceFigures = component.evidence
      .map((item) => figureById.get(item.figureId))
      .filter((figure): figure is PatentFigure => Boolean(figure));
    const auxiliaryEvidenceCount = evidenceFigures.filter((figure) => figure.role === "auxiliary_view").length;
    const text = `${component.canonicalName} ${component.summary} ${component.functionDescription}`;
    const role: PatentComponentRole =
      auxiliaryEvidenceCount > 0 || isAuxiliaryLikeText(text)
        ? "auxiliary"
        : component.reviewStatus === "pending" && component.evidence.length === 1 && averageQuality(component.evidence.map((item) => item.qualityScore)) < 0.62
          ? "inferred"
          : "core";

    return {
      ...component,
      role,
    };
  });

  const assemblies = buildAssemblies(base.patentId, roleAwareLibrary, productModel);
  const libraryWithAssemblies = attachAssemblyParents(
    roleAwareLibrary,
    assemblies,
    productModel,
    figuresWithRoles,
    base.extractedText,
  );

  const subassemblyAssemblies = assemblies.filter(
    (assembly) => assembly.parentId && assembly.childComponentIds.length > 0 && assembly.representativeComponentId,
  );

  return {
    productModel,
    figures: figuresWithRoles,
    componentLibrary: libraryWithAssemblies,
    assemblies,
    featured: {
      rootAssemblyId: assemblies[0]?.id ?? null,
      heroComponentId: pickHeroComponentId(libraryWithAssemblies, productModel.rootProductComponentId),
      subassemblyComponentIds: subassemblyAssemblies
        .map((assembly) => assembly.representativeComponentId)
        .filter((componentId): componentId is string => Boolean(componentId)),
      subassemblyAssemblyIds: subassemblyAssemblies.map((assembly) => assembly.id),
    },
  };
}

export function createPatentWorkspaceManifest(
  base: Omit<
    PatentWorkspaceManifest,
    "componentCandidates" | "componentLibrary" | "referenceIndex" | "productModel" | "assemblies" | "reviewState" | "stats" | "featured"
  >,
): PatentWorkspaceManifest {
  const componentCandidates = base.figures.flatMap((figure) =>
    figure.componentDetections.map((detection, index) =>
      createPatentComponentCandidate({
        id: detection.id || `${figure.id}-candidate-${index + 1}`,
        figureId: figure.id,
        figureLabel: figure.label,
        pageNumber: figure.pageNumber,
        name: detection.name,
        normalizedName: normalizeName(detection.name),
        refNumber: detection.refNumber,
        summary: detection.summary,
        functionDescription: detection.functionDescription,
        kind: detection.kind || inferKind(detection.name, detection.summary, figure.label),
        confidence: detection.confidence,
        imagePath: detection.imagePath,
        imageFilename: detection.imageFilename,
        qualityScore: detection.qualityScore,
        qualityIssues: detection.qualityIssues,
        cropValidation: detection.cropValidation,
        scaleHints: detection.scaleHints,
        region: detection.region,
      }),
    ),
  );
  const provisionalReferenceIndex = buildReferenceIndex(componentCandidates, base.figures, base.extractedText);
  const initialBuild = buildInitialComponentLibrary(base.patentId, componentCandidates, provisionalReferenceIndex);
  const componentLibrary = initialBuild.componentLibrary;
  const referenceIndex = initialBuild.referenceIndex;

  if (!componentLibrary.some((component) => component.kind === "full_product") && componentLibrary.length > 0) {
    const heroIndex = pickHeroCandidateIndex(componentLibrary, base.sourceFilename);
    componentLibrary[heroIndex] = {
      ...componentLibrary[heroIndex],
      kind: "full_product",
      reviewStatus: "approved",
      autoReviewReason: "Promoted automatically as the overall assembled product hero candidate.",
    };
  }

  const planned = planPatentWorkspaceStructure(
    {
      patentId: base.patentId,
      sourceFilename: base.sourceFilename,
      extractedText: base.extractedText,
    },
    base.figures,
    componentLibrary,
  );
  const initialReviewState = buildReviewState(planned.componentLibrary);
  const workspaceWithoutStats: Omit<PatentWorkspaceManifest, "stats"> = {
    ...base,
    componentCandidates,
    figures: planned.figures,
    componentLibrary: planned.componentLibrary,
    referenceIndex,
    productModel: planned.productModel,
    assemblies: planned.assemblies,
    reviewState: initialReviewState,
    featured: planned.featured,
  };

  return {
    ...workspaceWithoutStats,
    stats: buildStats(workspaceWithoutStats),
  };
}

function mergeEvidence(
  target: PatentComponentRecord,
  source: PatentComponentRecord,
): PatentComponentRecord {
  const evidenceByCandidateId = new Map<string, PatentComponentEvidence>();

  for (const evidence of [...target.evidence, ...source.evidence]) {
    evidenceByCandidateId.set(evidence.candidateId, evidence);
  }

  return {
    ...target,
    refNumbers: uniqueStrings([...target.refNumbers, ...source.refNumbers]),
    summary: target.summary.length >= source.summary.length ? target.summary : source.summary,
    functionDescription:
      target.functionDescription.length >= source.functionDescription.length
        ? target.functionDescription
        : source.functionDescription,
    confidence: Math.max(target.confidence, source.confidence),
    candidateIds: uniqueStrings([...target.candidateIds, ...source.candidateIds]),
    evidence: Array.from(evidenceByCandidateId.values()).sort((a, b) => a.pageNumber - b.pageNumber),
    scaleHints: averageScaleHints(Array.from(evidenceByCandidateId.values()).map((evidence) => evidence.scaleHints)),
    supportingFigureIds: uniqueStrings([...target.supportingFigureIds, ...source.supportingFigureIds]),
    supportingTextSnippets: uniqueStrings([...target.supportingTextSnippets, ...source.supportingTextSnippets]).slice(0, 6),
    anchorRegions: [...target.anchorRegions, ...source.anchorRegions],
  };
}

export function applyPatentReviewAction(
  workspace: PatentWorkspaceManifest,
  action: PatentReviewAction,
): PatentWorkspaceManifest {
  const updatedLibrary = workspace.componentLibrary.map((component) => ({ ...component }));
  const componentIndex = updatedLibrary.findIndex((component) => component.id === action.componentId);

  if (componentIndex < 0) {
    throw new Error("Component not found");
  }

  if (action.type === "merge") {
    const targetIndex = updatedLibrary.findIndex((component) => component.id === action.targetComponentId);
    if (targetIndex < 0 || action.targetComponentId === action.componentId) {
      throw new Error("Invalid merge target");
    }

    updatedLibrary[targetIndex] = mergeEvidence(updatedLibrary[targetIndex], updatedLibrary[componentIndex]);
    updatedLibrary[componentIndex] = {
      ...updatedLibrary[componentIndex],
      reviewStatus: "redundant",
      mergeTargetId: action.targetComponentId,
    };
  } else if (action.type === "approve") {
    updatedLibrary[componentIndex] = {
      ...updatedLibrary[componentIndex],
      reviewStatus: "approved",
      mergeTargetId: null,
    };
  } else if (action.type === "skip") {
    updatedLibrary[componentIndex] = {
      ...updatedLibrary[componentIndex],
      reviewStatus: "skipped",
      mergeTargetId: null,
    };
  } else if (action.type === "mark_redundant") {
    updatedLibrary[componentIndex] = {
      ...updatedLibrary[componentIndex],
      reviewStatus: "redundant",
    };
  } else if (action.type === "mark_subassembly") {
    updatedLibrary[componentIndex] = {
      ...updatedLibrary[componentIndex],
      kind: "subassembly",
      reviewStatus: "approved",
      mergeTargetId: null,
    };
  }

  const planned = planPatentWorkspaceStructure(
    {
      patentId: workspace.patentId,
      sourceFilename: workspace.sourceFilename,
      extractedText: workspace.extractedText,
    },
    workspace.figures,
    updatedLibrary,
  );
  const reviewState = {
    ...buildReviewState(planned.componentLibrary, workspace.reviewState),
    lastUpdatedAt: new Date().toISOString(),
  };

  const nextWorkspaceWithoutStats: Omit<PatentWorkspaceManifest, "stats"> = {
    ...workspace,
    figures: planned.figures,
    componentLibrary: planned.componentLibrary,
    productModel: planned.productModel,
    assemblies: planned.assemblies,
    reviewState,
    featured: planned.featured,
  };

  return {
    ...nextWorkspaceWithoutStats,
    stats: buildStats(nextWorkspaceWithoutStats),
  };
}

export function updatePatentComponentImageGeneration(
  workspace: PatentWorkspaceManifest,
  componentId: string,
  variant: PatentImageVariant,
  patch: Partial<PatentImageVariantState>,
): PatentWorkspaceManifest {
  const updatedLibrary = workspace.componentLibrary.map((component) =>
    component.id === componentId
      ? {
          ...component,
          imageVariants: {
            ...component.imageVariants,
            [variant]: {
              status: patch.status === undefined ? component.imageVariants[variant].status : patch.status,
              error: patch.error === undefined ? component.imageVariants[variant].error : patch.error,
              asset: patch.asset === undefined ? component.imageVariants[variant].asset : patch.asset,
            },
          },
        }
      : component,
  );
  const planned = planPatentWorkspaceStructure(
    {
      patentId: workspace.patentId,
      sourceFilename: workspace.sourceFilename,
      extractedText: workspace.extractedText,
    },
    workspace.figures,
    updatedLibrary,
  );

  const reviewState = {
    ...buildReviewState(planned.componentLibrary, workspace.reviewState),
    lastUpdatedAt: new Date().toISOString(),
  };

  const nextWorkspaceWithoutStats: Omit<PatentWorkspaceManifest, "stats"> = {
    ...workspace,
    figures: planned.figures,
    componentLibrary: planned.componentLibrary,
    productModel: planned.productModel,
    assemblies: planned.assemblies,
    reviewState,
    featured: planned.featured,
  };

  return {
    ...nextWorkspaceWithoutStats,
    stats: buildStats(nextWorkspaceWithoutStats),
  };
}

export function updatePatentComponentGeneration(
  workspace: PatentWorkspaceManifest,
  componentId: string,
  patch: Partial<{
    generationStatus: PatentComponentGenerationStatus;
    generationError: string | null;
    generatedAsset: PatentGeneratedImageAsset | null;
  }>,
): PatentWorkspaceManifest {
  return updatePatentComponentImageGeneration(workspace, componentId, "realistic_display", {
    status: patch.generationStatus,
    error: patch.generationError,
    asset: patch.generatedAsset,
  });
}

export function updatePatentComponentThreeD(
  workspace: PatentWorkspaceManifest,
  componentId: string,
  patch: Partial<Pick<PatentComponentRecord, "threeDStatus" | "threeDError" | "threeDAsset" | "assemblyContract">>,
): PatentWorkspaceManifest {
  const updatedLibrary = workspace.componentLibrary.map((component) =>
    component.id === componentId
      ? {
          ...component,
          threeDStatus: patch.threeDStatus === undefined ? component.threeDStatus : patch.threeDStatus,
          threeDError: patch.threeDError === undefined ? component.threeDError : patch.threeDError,
          threeDAsset: patch.threeDAsset === undefined ? component.threeDAsset : patch.threeDAsset,
          assemblyContract:
            patch.assemblyContract === undefined ? component.assemblyContract : patch.assemblyContract,
        }
      : component,
  );

  const nextWorkspaceWithoutStats: Omit<PatentWorkspaceManifest, "stats"> = {
    ...workspace,
    componentLibrary: updatedLibrary,
    reviewState: {
      ...workspace.reviewState,
      lastUpdatedAt: new Date().toISOString(),
    },
  };

  return {
    ...nextWorkspaceWithoutStats,
    stats: buildStats(nextWorkspaceWithoutStats),
  };
}
