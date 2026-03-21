import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PatentWorkspaceManifest, PatentWorkspacePaths } from "@/lib/patent-workspace";

type PatentWorkspaceDiskPaths = {
  rootAbsolute: string;
  manifestAbsolute: string;
  textAbsolute: string;
  candidateAbsoluteDirectory: string;
  generatedAbsoluteDirectory: string;
  publicPaths: PatentWorkspacePaths;
};

export function getPatentWorkspaceDiskPaths(patentId: string): PatentWorkspaceDiskPaths {
  const rootRelative = path.posix.join("patents", patentId);
  const rootAbsolute = path.join(process.cwd(), "public", rootRelative);
  const manifestRelative = path.posix.join(rootRelative, "manifest.json");
  const textRelative = path.posix.join(rootRelative, "full-text.txt");
  const candidateDirectory = path.posix.join(rootRelative, "components", "candidates");
  const generatedDirectory = path.posix.join(rootRelative, "components", "generated");

  return {
    rootAbsolute,
    manifestAbsolute: path.join(process.cwd(), "public", manifestRelative),
    textAbsolute: path.join(process.cwd(), "public", textRelative),
    candidateAbsoluteDirectory: path.join(process.cwd(), "public", candidateDirectory),
    generatedAbsoluteDirectory: path.join(process.cwd(), "public", generatedDirectory),
    publicPaths: {
      outputDirectory: `/${rootRelative}`,
      manifestPath: `/${manifestRelative}`,
      textPath: `/${textRelative}`,
      candidateDirectory: `/${candidateDirectory}`,
      generatedDirectory: `/${generatedDirectory}`,
    },
  };
}

export async function ensurePatentWorkspaceDirectories(patentId: string): Promise<PatentWorkspaceDiskPaths> {
  const paths = getPatentWorkspaceDiskPaths(patentId);
  await mkdir(paths.rootAbsolute, { recursive: true });
  await mkdir(paths.candidateAbsoluteDirectory, { recursive: true });
  await mkdir(paths.generatedAbsoluteDirectory, { recursive: true });
  return paths;
}

export async function writePatentWorkspaceManifest(workspace: PatentWorkspaceManifest): Promise<void> {
  const paths = await ensurePatentWorkspaceDirectories(workspace.patentId);
  await writeFile(paths.manifestAbsolute, JSON.stringify(workspace, null, 2), "utf8");
}

export async function readPatentWorkspaceManifest(patentId: string): Promise<PatentWorkspaceManifest> {
  const paths = getPatentWorkspaceDiskPaths(patentId);
  const contents = await readFile(paths.manifestAbsolute, "utf8");
  return JSON.parse(contents) as PatentWorkspaceManifest;
}

