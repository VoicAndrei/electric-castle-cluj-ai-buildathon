import { describe, it, expect, vi } from "vitest";
import { rewriteForRetrieval } from "@/lib/retrieval/rewrite";

describe("rewriteForRetrieval", () => {
  it("returns the message unchanged when history is empty", async () => {
    const fakeLLM = vi.fn();
    const out = await rewriteForRetrieval({
      history: [],
      message: "how do I get to Bonțida?",
      generateText: fakeLLM,
    });
    expect(out).toBe("how do I get to Bonțida?");
    expect(fakeLLM).not.toHaveBeenCalled();
  });

  it("resolves pronouns using history", async () => {
    const fakeLLM = vi.fn().mockResolvedValue("Where are the bathrooms at Electric Castle?");
    const out = await rewriteForRetrieval({
      history: [
        { role: "user", content: "tell me about the bathrooms" },
        { role: "assistant", content: "There are bathrooms across the campsite and main grounds." },
      ],
      message: "what about the clean ones?",
      generateText: fakeLLM,
    });
    expect(out).toMatch(/bathroom/i);
    expect(fakeLLM).toHaveBeenCalled();
  });

  it("falls back to the raw message on LLM failure", async () => {
    const fakeLLM = vi.fn().mockRejectedValue(new Error("oops"));
    const out = await rewriteForRetrieval({
      history: [{ role: "user", content: "stuff" }, { role: "assistant", content: "more stuff" }],
      message: "what about it?",
      generateText: fakeLLM,
    });
    expect(out).toBe("what about it?");
  });
});
