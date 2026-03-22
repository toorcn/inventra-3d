import { task, logger, AbortTaskRunError } from "@trigger.dev/sdk/v3";
import { parsePdfTask } from "./tasks/parse-pdf";
import { analyzePatentTask } from "./tasks/analyze-patent";
import { identifyFiguresTask } from "./tasks/identify-figures";
import { cropFiguresTask } from "./tasks/crop-figures";
import { generateMeshesTask } from "./tasks/generate-meshes";
import { calculatePositionsTask } from "./tasks/calculate-positions";
import { writeOutputTask } from "./tasks/write-output";
import { inventions } from "../src/data/inventions";

export interface PatentPipelinePayload {
  pdfPath: string;
  jobId: string;
  projectRoot: string;
}

export interface PatentPipelineOutput {
  inventionId: string;
  title: string;
  componentCount: number;
}

export const patentPipelineTask = task({
  id: "patent-pipeline",
  retry: { maxAttempts: 1 },
  run: async (payload: PatentPipelinePayload): Promise<PatentPipelineOutput> => {
    logger.info("Starting patent pipeline", { jobId: payload.jobId });

    // Step 1: Parse PDF into pages with text + images
    const parsedPdf = await parsePdfTask
      .triggerAndWait({ pdfPath: payload.pdfPath })
      .unwrap();
    logger.info("PDF parsed", { totalPages: parsedPdf.totalPages });

    // Step 2: Analyze patent metadata
    const patentAnalysis = await analyzePatentTask
      .triggerAndWait({ pages: parsedPdf.pages })
      .unwrap();
    logger.info("Patent analyzed", { title: patentAnalysis.title });

    // Check for duplicate patent
    const existingInvention = inventions.find(
      (inv) => inv.id === patentAnalysis.id || inv.patentNumber === patentAnalysis.patentNumber,
    );
    if (existingInvention) {
      throw new AbortTaskRunError(
        `Patent already exists: "${existingInvention.title}" (${existingInvention.id})`,
      );
    }

    // Step 3: Identify 3D-convertible figures
    const figureAnalysis = await identifyFiguresTask
      .triggerAndWait({ pages: parsedPdf.pages })
      .unwrap();
    logger.info("Figures identified", { count: figureAnalysis.figures.length });

    // Step 4: Crop identified figures from pages
    const croppedFigures = await cropFiguresTask
      .triggerAndWait({
        pages: parsedPdf.pages,
        figures: figureAnalysis.figures,
      })
      .unwrap();
    logger.info("Figures cropped", { count: croppedFigures.imageUrls.length });

    // Step 5: Generate .glb meshes from cropped figures
    const meshes = await generateMeshesTask
      .triggerAndWait({ imageUrls: croppedFigures.imageUrls })
      .unwrap();
    logger.info("Meshes generated", { count: meshes.meshes.length });

    // Step 6: Calculate assembled/exploded positions
    const positions = await calculatePositionsTask
      .triggerAndWait({
        figures: figureAnalysis.figures,
        meshCount: meshes.meshes.length,
      })
      .unwrap();

    // Step 7: Write output files
    const output = await writeOutputTask
      .triggerAndWait({
        patentAnalysis,
        figures: figureAnalysis.figures,
        meshes: meshes.meshes,
        positions: positions.components,
        projectRoot: payload.projectRoot,
      })
      .unwrap();

    logger.info("Patent pipeline complete", {
      inventionId: output.inventionId,
    });

    return {
      inventionId: output.inventionId,
      title: patentAnalysis.title,
      componentCount: meshes.meshes.length,
    };
  },
});
