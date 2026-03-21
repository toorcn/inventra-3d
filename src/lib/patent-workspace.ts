export type PatentAssetKind = "full_product" | "subassembly" | "component";

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
};

export type PatentFigure = {
  id: string;
  filename: string;
  imagePath: string;
  pageNumber: number;
  label: string;
  description: string;
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
};

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
};

export type PatentComponentReviewStatus = "pending" | "approved" | "redundant" | "skipped";

export type PatentComponentGenerationStatus = "idle" | "queued" | "running" | "succeeded" | "failed";

export type PatentGeneratedAsset = {
  outputPath: string;
  outputFilename: string;
  model: string;
  generatedAt: string;
};

export type PatentComponentRecord = {
  id: string;
  canonicalName: string;
  normalizedName: string;
  kind: PatentAssetKind;
  reviewStatus: PatentComponentReviewStatus;
  mergeTargetId: string | null;
  refNumbers: string[];
  summary: string;
  functionDescription: string;
  confidence: number;
  clusterKey: string;
  candidateIds: string[];
  evidence: PatentComponentEvidence[];
  generationStatus: PatentComponentGenerationStatus;
  generationError: string | null;
  generatedAsset: PatentGeneratedAsset | null;
  parentAssemblyId: string | null;
};

export type PatentAssemblyNode = {
  id: string;
  name: string;
  kind: "full_product" | "subassembly";
  parentId: string | null;
  childComponentIds: string[];
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
  paths: PatentWorkspacePaths;
  stats: PatentWorkspaceStats;
  figures: PatentFigure[];
  componentCandidates: PatentComponentCandidate[];
  componentLibrary: PatentComponentRecord[];
  assemblies: PatentAssemblyNode[];
  reviewState: PatentReviewState;
};

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

function inferKind(name: string, summary: string, figureLabel: string): PatentAssetKind {
  const text = `${name} ${summary} ${figureLabel}`.toLowerCase();
  if (/\b(full|overall|complete)\b/.test(text)) {
    return "full_product";
  }
  if (/\b(assembly|housing|body|cartridge|tip|barrel|mechanism|device)\b/.test(text)) {
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

    if (component.generatedAsset) {
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

function buildAssemblies(patentId: string, componentLibrary: PatentComponentRecord[]): PatentAssemblyNode[] {
  const rootAssemblyId = `${patentId}-full-product`;
  const root: PatentAssemblyNode = {
    id: rootAssemblyId,
    name: "Patent Product Assembly",
    kind: "full_product",
    parentId: null,
    childComponentIds: [],
  };

  const subassemblies: PatentAssemblyNode[] = [];

  for (const component of componentLibrary) {
    if (component.reviewStatus === "redundant") {
      continue;
    }

    root.childComponentIds.push(component.id);

    if (component.kind === "subassembly") {
      subassemblies.push({
        id: `${component.id}-assembly`,
        name: component.canonicalName,
        kind: "subassembly",
        parentId: rootAssemblyId,
        childComponentIds: [],
      });
    }
  }

  return [root, ...subassemblies];
}

function attachAssemblyParents(
  componentLibrary: PatentComponentRecord[],
  assemblies: PatentAssemblyNode[],
): PatentComponentRecord[] {
  const rootAssembly = assemblies[0];

  return componentLibrary.map((component) => {
    if (component.reviewStatus === "redundant") {
      return component;
    }

    if (component.kind === "subassembly") {
      return {
        ...component,
        parentAssemblyId: rootAssembly?.id ?? null,
      };
    }

    return {
      ...component,
      parentAssemblyId: rootAssembly?.id ?? null,
    };
  });
}

export function createPatentComponentCandidate(input: Omit<PatentComponentCandidate, "clusterKey">): PatentComponentCandidate {
  return {
    ...input,
    clusterKey: buildClusterKey(input),
  };
}

export function createPatentWorkspaceManifest(
  base: Omit<PatentWorkspaceManifest, "componentCandidates" | "componentLibrary" | "assemblies" | "reviewState" | "stats">,
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
      }),
    ),
  );

  const groups = new Map<string, PatentComponentCandidate[]>();
  for (const candidate of componentCandidates) {
    const current = groups.get(candidate.clusterKey) ?? [];
    current.push(candidate);
    groups.set(candidate.clusterKey, current);
  }

  let componentIndex = 0;
  const componentLibrary: PatentComponentRecord[] = Array.from(groups.values()).map((candidates) => {
    componentIndex += 1;
    const canonicalName = chooseCanonicalName(candidates);
    const normalizedName = normalizeName(canonicalName);
    const primaryKind =
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
    }));

    const componentId = `${base.patentId}-component-${componentIndex}`;

    return {
      id: componentId,
      canonicalName,
      normalizedName,
      kind: primaryKind,
      reviewStatus: "pending",
      mergeTargetId: null,
      refNumbers: uniqueStrings(candidates.map((candidate) => candidate.refNumber)),
      summary: chooseBestDescription(candidates, "summary") || `Patent component derived from ${candidates[0]?.figureLabel ?? "figure"}.`,
      functionDescription:
        chooseBestDescription(candidates, "functionDescription") ||
        "Functional role inferred from figure context.",
      confidence:
        candidates.reduce((sum, candidate) => sum + candidate.confidence, 0) /
          Math.max(1, candidates.length),
      clusterKey: candidates[0]?.clusterKey ?? `component:${componentId}`,
      candidateIds: candidates.map((candidate) => candidate.id),
      evidence,
      generationStatus: "idle",
      generationError: null,
      generatedAsset: null,
      parentAssemblyId: null,
    };
  });

  const initialReviewState = buildReviewState(componentLibrary);
  const initialAssemblies = buildAssemblies(base.patentId, componentLibrary);
  const libraryWithAssemblies = attachAssemblyParents(componentLibrary, initialAssemblies);
  const workspaceWithoutStats: Omit<PatentWorkspaceManifest, "stats"> = {
    ...base,
    componentCandidates,
    componentLibrary: libraryWithAssemblies,
    assemblies: initialAssemblies,
    reviewState: initialReviewState,
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

  const assemblies = buildAssemblies(workspace.patentId, updatedLibrary);
  const componentLibrary = attachAssemblyParents(updatedLibrary, assemblies);
  const reviewState = {
    ...buildReviewState(componentLibrary, workspace.reviewState),
    lastUpdatedAt: new Date().toISOString(),
  };

  const nextWorkspaceWithoutStats: Omit<PatentWorkspaceManifest, "stats"> = {
    ...workspace,
    componentLibrary,
    assemblies,
    reviewState,
  };

  return {
    ...nextWorkspaceWithoutStats,
    stats: buildStats(nextWorkspaceWithoutStats),
  };
}

export function updatePatentComponentGeneration(
  workspace: PatentWorkspaceManifest,
  componentId: string,
  patch: Partial<Pick<PatentComponentRecord, "generationStatus" | "generationError" | "generatedAsset">>,
): PatentWorkspaceManifest {
  const componentLibrary = workspace.componentLibrary.map((component) =>
    component.id === componentId
      ? {
          ...component,
          generationStatus:
            patch.generationStatus === undefined ? component.generationStatus : patch.generationStatus,
          generationError:
            patch.generationError === undefined ? component.generationError : patch.generationError,
          generatedAsset: patch.generatedAsset === undefined ? component.generatedAsset : patch.generatedAsset,
        }
      : component,
  );

  const reviewState = {
    ...buildReviewState(componentLibrary, workspace.reviewState),
    lastUpdatedAt: new Date().toISOString(),
  };

  const nextWorkspaceWithoutStats: Omit<PatentWorkspaceManifest, "stats"> = {
    ...workspace,
    componentLibrary,
    reviewState,
  };

  return {
    ...nextWorkspaceWithoutStats,
    stats: buildStats(nextWorkspaceWithoutStats),
  };
}
