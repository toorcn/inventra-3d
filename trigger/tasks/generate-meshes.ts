import { task, logger } from "@trigger.dev/sdk/v3";
import { fal } from "@fal-ai/client";

export interface GenerateMeshesPayload {
  imageUrls: string[];
}

export interface MeshResult {
  index: number;
  glbUrl: string;
  glbBuffer: string; // base64-encoded .glb file
}

export interface GenerateMeshesOutput {
  meshes: MeshResult[];
}

export const generateMeshesTask = task({
  id: "generate-meshes",
  retry: { maxAttempts: 1 },
  run: async (payload: GenerateMeshesPayload): Promise<GenerateMeshesOutput> => {
    logger.info("Generating 3D meshes", { count: payload.imageUrls.length });

    const meshes: MeshResult[] = [];

    for (let i = 0; i < payload.imageUrls.length; i++) {
      const imageUrl = payload.imageUrls[i];
      logger.info(`Generating mesh ${i + 1}/${payload.imageUrls.length}`);

      try {
        const result = await fal.subscribe("fal-ai/trellis", {
          input: {
            image_url: imageUrl,
          },
          pollInterval: 2000,
          onQueueUpdate: (update) => {
            if (update.status === "IN_PROGRESS") {
              logger.info(`Mesh ${i + 1}: in progress`);
            }
          },
        });

        const meshData = result.data as { model_mesh?: { url?: string } };
        const glbUrl = meshData.model_mesh?.url;

        if (!glbUrl) {
          logger.warn(`Mesh ${i + 1}: no GLB URL in response`);
          continue;
        }

        // Download the .glb file
        const response = await fetch(glbUrl);
        if (!response.ok) {
          logger.warn(`Mesh ${i + 1}: failed to download GLB`);
          continue;
        }

        const glbArrayBuffer = await response.arrayBuffer();
        const glbBuffer = Buffer.from(glbArrayBuffer).toString("base64");

        meshes.push({ index: i, glbUrl, glbBuffer });
        logger.info(`Mesh ${i + 1}: generated successfully`, { size: glbArrayBuffer.byteLength });
      } catch (error) {
        logger.error(`Mesh ${i + 1}: generation failed`, { error: String(error) });
        // Continue with remaining meshes
      }
    }

    if (meshes.length === 0) {
      throw new Error("No meshes were successfully generated");
    }

    logger.info("Mesh generation complete", { total: meshes.length });
    return { meshes };
  },
});
