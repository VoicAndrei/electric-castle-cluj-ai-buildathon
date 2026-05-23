// Mock sharp to avoid native binary requirement in test environment
// @xenova/transformers pulls in sharp for image processing, but we only
// need text feature extraction — sharp is never exercised during embed().
import { vi } from "vitest";

vi.mock("sharp", () => {
  return { default: null };
});
