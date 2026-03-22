import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "inventra",
  maxDuration: 600, // 10 minutes max per task
  dirs: ["./trigger"],
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 30000,
      factor: 2,
      randomize: true,
    },
  },
  build: {
    external: ["@napi-rs/canvas", "pdfjs-dist"],
  },
});
