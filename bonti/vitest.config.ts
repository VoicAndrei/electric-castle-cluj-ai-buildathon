import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 180000,
    hookTimeout: 180000,
    setupFiles: ["./tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "sharp": path.resolve(__dirname, "./tests/__mocks__/sharp.ts"),
    },
  },
});
