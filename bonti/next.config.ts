import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent @xenova/transformers (and its native deps) from being bundled —
  // they load lazily at runtime in serverless functions.
  serverExternalPackages: ["@xenova/transformers", "sharp", "onnxruntime-node"],

  // Include only the linux-x64 ONNX runtime shared object so that the
  // serverless function can load it at runtime without exceeding 250 MB.
  outputFileTracingIncludes: {
    "/api/chat": [
      "./node_modules/.pnpm/onnxruntime-node@*/node_modules/onnxruntime-node/bin/napi-v3/linux/x64/**",
      "./node_modules/.pnpm/onnxruntime-node@*/node_modules/onnxruntime-node/lib/**",
      "./node_modules/.pnpm/onnxruntime-node@*/node_modules/onnxruntime-node/dist/**",
      "./node_modules/.pnpm/onnxruntime-node@*/node_modules/onnxruntime-node/package.json",
    ],
  },

  // Exclude non-linux-x64 platform binaries to keep function size under 250 MB.
  outputFileTracingExcludes: {
    "/api/chat": [
      "./node_modules/.pnpm/onnxruntime-node@*/node_modules/onnxruntime-node/bin/napi-v3/darwin/**",
      "./node_modules/.pnpm/onnxruntime-node@*/node_modules/onnxruntime-node/bin/napi-v3/linux/arm64/**",
      "./node_modules/.pnpm/onnxruntime-node@*/node_modules/onnxruntime-node/bin/napi-v3/win32/**",
      "./node_modules/.pnpm/onnxruntime-web@*/node_modules/onnxruntime-web/dist/*.wasm",
      "./node_modules/.pnpm/sharp@*/node_modules/sharp/build/Release/sharp-darwin-*",
      "./node_modules/.pnpm/sharp@*/node_modules/sharp/build/Release/sharp-linux-arm*",
    ],
  },
};

export default nextConfig;
