import { task, logger } from "@trigger.dev/sdk/v3";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { PatentAnalysis } from "./analyze-patent";
import type { FigureInfo } from "./identify-figures";
import type { MeshResult } from "./generate-meshes";
import type { ComponentPosition } from "./calculate-positions";

export interface WriteOutputPayload {
  patentAnalysis: PatentAnalysis;
  figures: FigureInfo[];
  meshes: MeshResult[];
  positions: ComponentPosition[];
  projectRoot: string;
}

export interface WriteOutputResult {
  inventionId: string;
  glbPaths: string[];
}

// PROJECT_ROOT is passed via payload since __dirname points to Trigger.dev's build output dir

export const writeOutputTask = task({
  id: "write-output",
  retry: { maxAttempts: 1 },
  run: async (payload: WriteOutputPayload): Promise<WriteOutputResult> => {
    const { patentAnalysis, figures, meshes, positions, projectRoot } = payload;
    const PROJECT_ROOT = projectRoot;
    const inventionId = patentAnalysis.id;

    logger.info("Writing output", { inventionId, meshCount: meshes.length });

    // 1. Save .glb files to public/models/<inventionId>/
    const modelsDir = path.join(PROJECT_ROOT, "public", "models", inventionId);
    await fs.mkdir(modelsDir, { recursive: true });

    const glbPaths: string[] = [];
    for (let i = 0; i < meshes.length; i++) {
      const mesh = meshes[i];
      const figure = figures[mesh.index] ?? figures[i];
      const slug = (figure?.componentName ?? `part-${i}`)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      const glbFileName = `${slug}.glb`;
      const glbPath = path.join(modelsDir, glbFileName);
      const glbBuffer = Buffer.from(mesh.glbBuffer, "base64");
      await fs.writeFile(glbPath, glbBuffer);

      glbPaths.push(`models/${inventionId}/${glbFileName}`);
      logger.info(`Saved GLB: ${glbPath}`, { size: glbBuffer.length });
    }

    // 2. Build invention data
    const invention = {
      id: inventionId,
      title: patentAnalysis.title,
      year: patentAnalysis.year,
      inventors: patentAnalysis.inventors,
      location: patentAnalysis.location,
      country: patentAnalysis.country,
      countryCode: patentAnalysis.countryCode,
      category: patentAnalysis.category,
      description: patentAnalysis.description,
      patentNumber: patentAnalysis.patentNumber,
      hasModel: true,
    };

    // 3. Build component data
    const components = meshes.map((mesh, i) => {
      const figure = figures[mesh.index] ?? figures[i];
      const pos = positions[i] ?? { assembledPosition: [0, 0, 0], explodedPosition: [0, i * 2, 0] };

      return {
        id: `${inventionId}-${(figure?.componentName ?? `part-${i}`).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        inventionId,
        name: figure?.componentName ?? `Part ${i + 1}`,
        description: figure?.description ?? "",
        materials: figure?.materials ?? [],
        patentText: figure?.patentText ?? null,
        geometry: {
          type: "glb" as const,
          args: [] as number[],
          glbUrl: glbPaths[i],
        },
        assembledPosition: pos.assembledPosition,
        explodedPosition: pos.explodedPosition,
        color: figure?.color ?? "#888888",
      };
    });

    // 4. Build model definition
    const modelDefinition = {
      inventionId,
      components: components.map((comp) => ({
        componentId: comp.id,
        geometry: comp.geometry,
        assembledPosition: comp.assembledPosition,
        explodedPosition: comp.explodedPosition,
        color: comp.color,
        metalness: 0.35,
        roughness: 0.45,
      })),
      cameraPosition: [0, 1.5, 5] as [number, number, number],
      cameraTarget: [0, 0, 0] as [number, number, number],
    };

    // 5. Write generated TypeScript files
    const generatedDir = path.join(PROJECT_ROOT, "src", "data", "generated");
    await fs.mkdir(generatedDir, { recursive: true });

    // Read existing, append, and write back
    await appendToGeneratedFile(
      path.join(generatedDir, "inventions-generated.ts"),
      "generatedInventions",
      "Invention",
      "@/types",
      invention,
    );

    await appendToGeneratedFile(
      path.join(generatedDir, "components-generated.ts"),
      "generatedComponents",
      "InventionComponent",
      "@/types",
      components,
    );

    await appendToGeneratedModelFile(
      path.join(generatedDir, "models-generated.ts"),
      modelDefinition,
    );

    logger.info("Output written successfully", {
      inventionId,
      glbCount: glbPaths.length,
    });

    return { inventionId, glbPaths };
  },
});

async function appendToGeneratedFile(
  filePath: string,
  exportName: string,
  typeName: string,
  typeImport: string,
  data: unknown,
) {
  const jsonData = Array.isArray(data) ? data : [data];
  const serialized = JSON.stringify(jsonData, null, 2);

  const content = `import type { ${typeName} } from "${typeImport}";

// Auto-generated by the patent pipeline. Do not edit manually.
export const ${exportName}: ${typeName}[] = ${serialized};
`;

  // Read existing file to check if there's already data
  try {
    const existing = await fs.readFile(filePath, "utf-8");
    const match = existing.match(new RegExp(`export const ${exportName}.*?= \\[([\\s\\S]*?)\\];`));
    if (match && match[1]?.trim()) {
      // Parse existing data and merge
      const existingArrayMatch = existing.match(new RegExp(`export const ${exportName}.*?= (\\[[\\s\\S]*?\\]);`));
      if (existingArrayMatch) {
        try {
          const existingArray = JSON.parse(existingArrayMatch[1]);
          const merged = [...existingArray, ...jsonData];
          const mergedContent = `import type { ${typeName} } from "${typeImport}";

// Auto-generated by the patent pipeline. Do not edit manually.
export const ${exportName}: ${typeName}[] = ${JSON.stringify(merged, null, 2)};
`;
          await fs.writeFile(filePath, mergedContent, "utf-8");
          return;
        } catch {
          // Fall through to overwrite
        }
      }
    }
  } catch {
    // File doesn't exist or can't be parsed
  }

  await fs.writeFile(filePath, content, "utf-8");
}

async function appendToGeneratedModelFile(
  filePath: string,
  modelDefinition: unknown,
) {
  const jsonData = [modelDefinition];
  const serialized = JSON.stringify(jsonData, null, 2);

  const content = `import type { ModelDefinition } from "../models";

// Auto-generated by the patent pipeline. Do not edit manually.
export const generatedModelDefinitions: ModelDefinition[] = ${serialized};
`;

  try {
    const existing = await fs.readFile(filePath, "utf-8");
    const match = existing.match(/export const generatedModelDefinitions.*?= (\[[\s\S]*?\]);/);
    if (match) {
      try {
        const existingArray = JSON.parse(match[1]);
        const merged = [...existingArray, ...jsonData];
        const mergedContent = `import type { ModelDefinition } from "../models";

// Auto-generated by the patent pipeline. Do not edit manually.
export const generatedModelDefinitions: ModelDefinition[] = ${JSON.stringify(merged, null, 2)};
`;
        await fs.writeFile(filePath, mergedContent, "utf-8");
        return;
      } catch {
        // Fall through
      }
    }
  } catch {
    // File doesn't exist
  }

  await fs.writeFile(filePath, content, "utf-8");
}
