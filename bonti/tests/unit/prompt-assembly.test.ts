import { describe, it, expect } from "vitest";
import { buildBontiSystemPrompt } from "@/lib/prompts/bonti-system";

describe("buildBontiSystemPrompt", () => {
  it("includes the identity declaration", () => {
    const prompt = buildBontiSystemPrompt({ retrievedChunks: [], lang: "en" });
    expect(prompt).toMatch(/You are Bonți/);
  });

  it("includes voice rules including 'tu/voi'", () => {
    const prompt = buildBontiSystemPrompt({ retrievedChunks: [], lang: "ro" });
    expect(prompt).toMatch(/tu/i);
    expect(prompt).not.toMatch(/dumneavoastră/i);
  });

  it("includes retrieved context when provided", () => {
    const prompt = buildBontiSystemPrompt({
      retrievedChunks: [
        { id: 1, source_doc: "faq.md", text: "Shuttle costs 15 lei round-trip.", lang: "en", tags: [], similarity: 0.9 },
      ],
      lang: "en",
    });
    expect(prompt).toMatch(/Shuttle costs 15 lei/);
  });

  it("forbids anti-vocabulary", () => {
    const prompt = buildBontiSystemPrompt({ retrievedChunks: [], lang: "en" });
    expect(prompt.toLowerCase()).toMatch(/never use/);
    expect(prompt.toLowerCase()).toMatch(/unmissable/);
    expect(prompt.toLowerCase()).toMatch(/epic/);
  });

  it("includes at least 4 few-shot exchanges", () => {
    const prompt = buildBontiSystemPrompt({ retrievedChunks: [], lang: "en" });
    const matches = prompt.match(/USER:/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(4);
  });
});
