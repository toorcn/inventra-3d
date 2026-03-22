import { rm, writeFile } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPatentWorkspaceManifest } from "@/lib/patent-workspace";
import {
  getPatentWorkspaceDiskPaths,
  readPatentWorkspaceArtifact,
  readPatentWorkspaceManifest,
  readPatentWorkspaceManifestIfCompatible,
  writePatentWorkspaceManifest,
  writePatentWorkspaceText,
} from "@/lib/patent-workspace-store";

const originalBlobToken = process.env.BLOB_READ_WRITE_TOKEN;

function createTestPatentId(): string {
  return `workspace-store-test-${Date.now()}-${Math.round(Math.random() * 10000)}`;
}

describe("patent workspace store", () => {
  let patentId = "";

  beforeEach(() => {
    patentId = createTestPatentId();
    delete process.env.BLOB_READ_WRITE_TOKEN;
  });

  afterEach(async () => {
    if (originalBlobToken === undefined) {
      delete process.env.BLOB_READ_WRITE_TOKEN;
    } else {
      process.env.BLOB_READ_WRITE_TOKEN = originalBlobToken;
    }
    await rm(getPatentWorkspaceDiskPaths(patentId).rootAbsolute, { recursive: true, force: true });
  });

  it("writes and reads a compatible manifest through local workspace storage", async () => {
    const diskPaths = getPatentWorkspaceDiskPaths(patentId);
    const textPath = await writePatentWorkspaceText(patentId, "sample extracted text");
    const manifest = createPatentWorkspaceManifest({
      patentId,
      sourceFilename: "sample.pdf",
      totalPages: 2,
      processedPages: 2,
      extractedAt: "2026-03-22T00:00:00.000Z",
      extractedText: "sample extracted text",
      warnings: [],
      capabilities: {
        imageGeneration: false,
        threeDGeneration: false,
      },
      paths: {
        ...diskPaths.publicPaths,
        textPath,
      },
      figures: [],
    });

    const storedManifest = await writePatentWorkspaceManifest(manifest);
    const loadedManifest = await readPatentWorkspaceManifest(patentId);
    const cacheHit = await readPatentWorkspaceManifestIfCompatible(patentId);

    expect(storedManifest.schemaVersion).toBeGreaterThan(0);
    expect(loadedManifest.paths.manifestPath).toBe(diskPaths.publicPaths.manifestPath);
    expect(cacheHit?.patentId).toBe(patentId);
  });

  it("rejects incompatible cached manifests", async () => {
    const diskPaths = getPatentWorkspaceDiskPaths(patentId);
    const textPath = await writePatentWorkspaceText(patentId, "sample extracted text");
    const manifest = createPatentWorkspaceManifest({
      patentId,
      sourceFilename: "sample.pdf",
      totalPages: 1,
      processedPages: 1,
      extractedAt: "2026-03-22T00:00:00.000Z",
      extractedText: "sample extracted text",
      warnings: [],
      capabilities: {
        imageGeneration: false,
        threeDGeneration: false,
      },
      paths: {
        ...diskPaths.publicPaths,
        textPath,
      },
      figures: [],
    });

    await writePatentWorkspaceManifest(manifest);
    const incompatible = {
      ...manifest,
      schemaVersion: 1,
    };
    await writeFile(diskPaths.manifestAbsolute, JSON.stringify(incompatible, null, 2), "utf8");

    await expect(readPatentWorkspaceManifestIfCompatible(patentId)).resolves.toBeNull();
  });

  it("reads remote workspace artifacts through fetch for blob-backed assets", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => Buffer.from("remote-artifact"),
    });
    const originalFetch = global.fetch;
    global.fetch = fetchMock as typeof fetch;

    try {
      const buffer = await readPatentWorkspaceArtifact("https://example.com/patents/test/components/generated/hero.png");
      expect(buffer.toString("utf8")).toBe("remote-artifact");
      expect(fetchMock).toHaveBeenCalledWith(
        "https://example.com/patents/test/components/generated/hero.png",
        { cache: "no-store" },
      );
    } finally {
      global.fetch = originalFetch;
    }
  });
});
