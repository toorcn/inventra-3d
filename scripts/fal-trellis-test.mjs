/**
 * Quick smoke test for fal.ai Trellis (image → 3D mesh).
 * Docs: https://fal.ai/models/fal-ai/trellis/api
 *
 * Usage:
 *   export FAL_KEY="your_key"
 *   npm run test:fal-trellis
 *
 * Optional:
 *   IMAGE_URL="https://..." npm run test:fal-trellis
 */

import { fal } from "@fal-ai/client";

const DEFAULT_IMAGE =
  "https://storage.googleapis.com/falserverless/web-examples/rodin3d/warriorwoman.png";

const imageUrl = process.env.IMAGE_URL ?? DEFAULT_IMAGE;

if (!process.env.FAL_KEY) {
  console.error(
    "Missing FAL_KEY. Set it in the environment (do not commit it).\n" +
      "See: https://fal.ai/models/fal-ai/trellis/api",
  );
  process.exit(1);
}

fal.config({ credentials: process.env.FAL_KEY });

console.log("Submitting fal-ai/trellis with image:", imageUrl);

const result = await fal.subscribe("fal-ai/trellis", {
  input: {
    image_url: imageUrl,
  },
  logs: true,
  onQueueUpdate: (update) => {
    if (update.status === "IN_PROGRESS" && update.logs?.length) {
      for (const log of update.logs) {
        console.log("[queue]", log.message);
      }
    }
  },
});

console.log("requestId:", result.requestId);
console.log("model_mesh:", result.data?.model_mesh);
if (result.data?.model_mesh?.url) {
  console.log("\nDownload mesh from:", result.data.model_mesh.url);
}
