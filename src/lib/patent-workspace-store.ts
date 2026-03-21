import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  PatentComponentRecord,
  PatentImageVariantState,
  PatentWorkspaceManifest,
  PatentWorkspacePaths,
} from "@/lib/patent-workspace";

type PatentWorkspaceDiskPaths = {
  rootAbsolute: string;
  manifestAbsolute: string;
  textAbsolute: string;
  candidateAbsoluteDirectory: string;
  generatedAbsoluteDirectory: string;
  threeDAbsoluteDirectory: string;
  publicPaths: PatentWorkspacePaths;
};

export function getPatentWorkspaceDiskPaths(patentId: string): PatentWorkspaceDiskPaths {
  const rootRelative = path.posix.join("patents", patentId);
  const rootAbsolute = path.join(process.cwd(), "public", rootRelative);
  const manifestRelative = path.posix.join(rootRelative, "manifest.json");
  const textRelative = path.posix.join(rootRelative, "full-text.txt");
  const candidateDirectory = path.posix.join(rootRelative, "components", "candidates");
  const generatedDirectory = path.posix.join(rootRelative, "components", "generated");
  const threeDDirectory = path.posix.join(rootRelative, "components", "3d");

  return {
    rootAbsolute,
    manifestAbsolute: path.join(process.cwd(), "public", manifestRelative),
    textAbsolute: path.join(process.cwd(), "public", textRelative),
    candidateAbsoluteDirectory: path.join(process.cwd(), "public", candidateDirectory),
    generatedAbsoluteDirectory: path.join(process.cwd(), "public", generatedDirectory),
    threeDAbsoluteDirectory: path.join(process.cwd(), "public", threeDDirectory),
    publicPaths: {
      outputDirectory: `/${rootRelative}`,
      manifestPath: `/${manifestRelative}`,
      textPath: `/${textRelative}`,
      candidateDirectory: `/${candidateDirectory}`,
      generatedDirectory: `/${generatedDirectory}`,
      threeDDirectory: `/${threeDDirectory}`,
    },
  };
}

export async function ensurePatentWorkspaceDirectories(patentId: string): Promise<PatentWorkspaceDiskPaths> {
  const paths = getPatentWorkspaceDiskPaths(patentId);
  await mkdir(paths.rootAbsolute, { recursive: true });
  await mkdir(paths.candidateAbsoluteDirectory, { recursive: true });
  await mkdir(paths.generatedAbsoluteDirectory, { recursive: true });
  await mkdir(paths.threeDAbsoluteDirectory, { recursive: true });
  return paths;
}

export async function writePatentWorkspaceManifest(workspace: PatentWorkspaceManifest): Promise<void> {
  const paths = await ensurePatentWorkspaceDirectories(workspace.patentId);
  await writeFile(paths.manifestAbsolute, JSON.stringify(workspace, null, 2), "utf8");
}

function createFallbackVariantState(component: Partial<PatentComponentRecord>, variant: "realistic_display" | "three_d_source"): PatentImageVariantState {
  const legacyComponent = component as Partial<PatentComponentRecord> & {
    generationStatus?: PatentImageVariantState["status"];
    generationError?: string | null;
    generatedAsset?: { outputPath: string; outputFilename: string; model: string; generatedAt: string } | null;
  };

  if (variant === "realistic_display" && legacyComponent.generatedAsset) {
    return {
      status: legacyComponent.generationStatus ?? "succeeded",
      error: legacyComponent.generationError ?? null,
      asset: {
        ...legacyComponent.generatedAsset,
        variant,
      },
    };
  }

  return {
    status: variant === "realistic_display" ? (legacyComponent.generationStatus ?? "idle") : "idle",
    error: variant === "realistic_display" ? (legacyComponent.generationError ?? null) : null,
    asset: null,
  };
}

function normalizeWorkspaceManifest(payload: PatentWorkspaceManifest): PatentWorkspaceManifest {
  const diskPaths = getPatentWorkspaceDiskPaths(payload.patentId);
  const componentLibrary = (payload.componentLibrary ?? []).map((component) => ({
    ...component,
    imageVariants: {
      realistic_display:
        component.imageVariants?.realistic_display ?? createFallbackVariantState(component, "realistic_display"),
      three_d_source:
        component.imageVariants?.three_d_source ?? createFallbackVariantState(component, "three_d_source"),
    },
    threeDStatus: component.threeDStatus ?? "idle",
    threeDError: component.threeDError ?? null,
    threeDAsset: component.threeDAsset ?? null,
    assemblyContract: component.assemblyContract ?? null,
  }));

  return {
    ...payload,
    capabilities: payload.capabilities ?? {
      imageGeneration: Boolean(process.env.FAL_KEY ?? process.env.FAL_API_KEY),
      threeDGeneration: Boolean(process.env.FAL_KEY ?? process.env.FAL_API_KEY),
    },
    paths: {
      ...payload.paths,
      threeDDirectory: payload.paths?.threeDDirectory ?? diskPaths.publicPaths.threeDDirectory,
    },
    componentLibrary,
  };
}

export async function readPatentWorkspaceManifest(patentId: string): Promise<PatentWorkspaceManifest> {
  const paths = getPatentWorkspaceDiskPaths(patentId);
  const contents = await readFile(paths.manifestAbsolute, "utf8");
  return normalizeWorkspaceManifest(JSON.parse(contents) as PatentWorkspaceManifest);
}
