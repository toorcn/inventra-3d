import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { BlobNotFoundError, head, put } from "@vercel/blob";
import {
  PATENT_WORKSPACE_SCHEMA_VERSION,
  type PatentComponentRecord,
  type PatentImageVariantState,
  type PatentWorkspaceManifest,
  type PatentWorkspacePaths,
} from "@/lib/patent-workspace";

type PatentWorkspaceDiskPaths = {
  rootRelative: string;
  manifestRelative: string;
  textRelative: string;
  candidateDirectoryRelative: string;
  generatedDirectoryRelative: string;
  threeDDirectoryRelative: string;
  rootAbsolute: string;
  manifestAbsolute: string;
  textAbsolute: string;
  candidateAbsoluteDirectory: string;
  generatedAbsoluteDirectory: string;
  threeDAbsoluteDirectory: string;
  publicPaths: PatentWorkspacePaths;
};

type StoredArtifact = {
  pathname: string;
  publicUrl: string;
};

type NormalizeManifestOptions = {
  manifestPath?: string;
  textPath?: string;
};

const MANIFEST_CACHE_MAX_AGE_SECONDS = 60;
const TEXT_CACHE_MAX_AGE_SECONDS = 60 * 60;
const BINARY_CACHE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function hasPatentWorkspaceBlobStore(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

function isRemoteUrl(value: string | null | undefined): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

function stripLeadingSlashes(value: string): string {
  return value.replace(/^\/+/, "");
}

function toPublicLocalPath(relativePath: string): string {
  return `/${stripLeadingSlashes(relativePath)}`;
}

function toPublicAbsolutePath(relativePath: string): string {
  return path.join(process.cwd(), "public", stripLeadingSlashes(relativePath));
}

function deriveRemoteDirectoryUrl(fileUrl: string, relativeDirectory: string): string {
  return new URL(`/${stripLeadingSlashes(relativeDirectory)}`, fileUrl).toString();
}

function buildRemoteWorkspacePaths(patentId: string, manifestPath: string, textPath: string): PatentWorkspacePaths {
  const diskPaths = getPatentWorkspaceDiskPaths(patentId);

  return {
    outputDirectory: deriveRemoteDirectoryUrl(manifestPath, diskPaths.rootRelative),
    manifestPath,
    textPath,
    candidateDirectory: deriveRemoteDirectoryUrl(manifestPath, diskPaths.candidateDirectoryRelative),
    generatedDirectory: deriveRemoteDirectoryUrl(manifestPath, diskPaths.generatedDirectoryRelative),
    threeDDirectory: deriveRemoteDirectoryUrl(manifestPath, diskPaths.threeDDirectoryRelative),
  };
}

function buildWorkspacePaths(
  patentId: string,
  options?: {
    manifestPath?: string;
    textPath?: string;
  },
): PatentWorkspacePaths {
  const diskPaths = getPatentWorkspaceDiskPaths(patentId);
  const manifestPath = options?.manifestPath ?? diskPaths.publicPaths.manifestPath;
  const textPath = options?.textPath ?? diskPaths.publicPaths.textPath;

  if (isRemoteUrl(manifestPath)) {
    return buildRemoteWorkspacePaths(patentId, manifestPath, textPath);
  }

  return {
    ...diskPaths.publicPaths,
    manifestPath,
    textPath,
  };
}

export function getPatentWorkspaceDiskPaths(patentId: string): PatentWorkspaceDiskPaths {
  const rootRelative = path.posix.join("patents", patentId);
  const manifestRelative = path.posix.join(rootRelative, "manifest.json");
  const textRelative = path.posix.join(rootRelative, "full-text.txt");
  const candidateDirectoryRelative = path.posix.join(rootRelative, "components", "candidates");
  const generatedDirectoryRelative = path.posix.join(rootRelative, "components", "generated");
  const threeDDirectoryRelative = path.posix.join(rootRelative, "components", "3d");
  const rootAbsolute = path.join(process.cwd(), "public", rootRelative);

  return {
    rootRelative,
    manifestRelative,
    textRelative,
    candidateDirectoryRelative,
    generatedDirectoryRelative,
    threeDDirectoryRelative,
    rootAbsolute,
    manifestAbsolute: path.join(process.cwd(), "public", manifestRelative),
    textAbsolute: path.join(process.cwd(), "public", textRelative),
    candidateAbsoluteDirectory: path.join(process.cwd(), "public", candidateDirectoryRelative),
    generatedAbsoluteDirectory: path.join(process.cwd(), "public", generatedDirectoryRelative),
    threeDAbsoluteDirectory: path.join(process.cwd(), "public", threeDDirectoryRelative),
    publicPaths: {
      outputDirectory: toPublicLocalPath(rootRelative),
      manifestPath: toPublicLocalPath(manifestRelative),
      textPath: toPublicLocalPath(textRelative),
      candidateDirectory: toPublicLocalPath(candidateDirectoryRelative),
      generatedDirectory: toPublicLocalPath(generatedDirectoryRelative),
      threeDDirectory: toPublicLocalPath(threeDDirectoryRelative),
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

async function writePatentWorkspaceArtifact(
  relativePath: string,
  contents: Buffer | string,
  options: {
    contentType: string;
    cacheControlMaxAge: number;
  },
): Promise<StoredArtifact> {
  const pathname = stripLeadingSlashes(relativePath);

  if (hasPatentWorkspaceBlobStore()) {
    const result = await put(pathname, contents, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: options.contentType,
      cacheControlMaxAge: options.cacheControlMaxAge,
    });

    return {
      pathname: result.pathname,
      publicUrl: result.url,
    };
  }

  const absolutePath = toPublicAbsolutePath(pathname);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, contents);

  return {
    pathname,
    publicUrl: toPublicLocalPath(pathname),
  };
}

async function readPatentWorkspaceManifestContents(patentId: string): Promise<{ contents: string; manifestPath: string } | null> {
  const diskPaths = getPatentWorkspaceDiskPaths(patentId);

  if (hasPatentWorkspaceBlobStore()) {
    try {
      const metadata = await head(diskPaths.manifestRelative);
      const response = await fetch(metadata.url, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch patent workspace manifest: ${response.status}`);
      }

      return {
        contents: await response.text(),
        manifestPath: metadata.url,
      };
    } catch (error) {
      if (error instanceof BlobNotFoundError) {
        return null;
      }
      throw error;
    }
  }

  try {
    await access(diskPaths.manifestAbsolute);
  } catch {
    return null;
  }

  return {
    contents: await readFile(diskPaths.manifestAbsolute, "utf8"),
    manifestPath: diskPaths.publicPaths.manifestPath,
  };
}

function createFallbackVariantState(
  component: Partial<PatentComponentRecord>,
  variant: "realistic_display" | "three_d_source",
): PatentImageVariantState {
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

function normalizeWorkspaceManifest(
  payload: PatentWorkspaceManifest,
  options?: NormalizeManifestOptions,
): PatentWorkspaceManifest {
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

  const paths = buildWorkspacePaths(payload.patentId, {
    manifestPath: options?.manifestPath ?? payload.paths?.manifestPath,
    textPath: options?.textPath ?? payload.paths?.textPath,
  });

  return {
    ...payload,
    schemaVersion: payload.schemaVersion ?? PATENT_WORKSPACE_SCHEMA_VERSION,
    capabilities: payload.capabilities ?? {
      imageGeneration: Boolean(process.env.OPENROUTER_API_KEY?.trim()),
      threeDGeneration: Boolean(process.env.FAL_KEY ?? process.env.FAL_API_KEY),
    },
    paths,
    componentLibrary,
  };
}

export async function writePatentWorkspaceText(patentId: string, contents: string): Promise<string> {
  const diskPaths = getPatentWorkspaceDiskPaths(patentId);
  const stored = await writePatentWorkspaceArtifact(diskPaths.textRelative, contents, {
    contentType: "text/plain; charset=utf-8",
    cacheControlMaxAge: TEXT_CACHE_MAX_AGE_SECONDS,
  });

  return stored.publicUrl;
}

export async function writePatentWorkspaceBinary(
  relativePath: string,
  contents: Buffer,
  options: {
    contentType: string;
    cacheControlMaxAge?: number;
  },
): Promise<string> {
  const stored = await writePatentWorkspaceArtifact(relativePath, contents, {
    contentType: options.contentType,
    cacheControlMaxAge: options.cacheControlMaxAge ?? BINARY_CACHE_MAX_AGE_SECONDS,
  });

  return stored.publicUrl;
}

export async function readPatentWorkspaceArtifact(assetPath: string): Promise<Buffer> {
  if (isRemoteUrl(assetPath)) {
    const response = await fetch(assetPath, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch workspace artifact: ${response.status}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }

  return readFile(toPublicAbsolutePath(assetPath));
}

export async function writePatentWorkspaceManifest(workspace: PatentWorkspaceManifest): Promise<PatentWorkspaceManifest> {
  const normalizedWorkspace = normalizeWorkspaceManifest(workspace);
  const diskPaths = getPatentWorkspaceDiskPaths(normalizedWorkspace.patentId);

  const firstWrite = await writePatentWorkspaceArtifact(
    diskPaths.manifestRelative,
    JSON.stringify(normalizedWorkspace, null, 2),
    {
      contentType: "application/json; charset=utf-8",
      cacheControlMaxAge: MANIFEST_CACHE_MAX_AGE_SECONDS,
    },
  );

  const finalizedWorkspace = normalizeWorkspaceManifest(normalizedWorkspace, {
    manifestPath: firstWrite.publicUrl,
  });

  await writePatentWorkspaceArtifact(
    diskPaths.manifestRelative,
    JSON.stringify(finalizedWorkspace, null, 2),
    {
      contentType: "application/json; charset=utf-8",
      cacheControlMaxAge: MANIFEST_CACHE_MAX_AGE_SECONDS,
    },
  );

  return finalizedWorkspace;
}

export async function readPatentWorkspaceManifest(patentId: string): Promise<PatentWorkspaceManifest> {
  const result = await readPatentWorkspaceManifestContents(patentId);
  if (!result) {
    throw new Error("Patent workspace manifest not found.");
  }

  return normalizeWorkspaceManifest(JSON.parse(result.contents) as PatentWorkspaceManifest, {
    manifestPath: result.manifestPath,
  });
}

export async function readPatentWorkspaceManifestIfCompatible(
  patentId: string,
): Promise<PatentWorkspaceManifest | null> {
  const result = await readPatentWorkspaceManifestContents(patentId);
  if (!result) {
    return null;
  }

  const payload = JSON.parse(result.contents) as Partial<PatentWorkspaceManifest>;
  if (payload.schemaVersion !== PATENT_WORKSPACE_SCHEMA_VERSION) {
    return null;
  }

  return normalizeWorkspaceManifest(payload as PatentWorkspaceManifest, {
    manifestPath: result.manifestPath,
  });
}
