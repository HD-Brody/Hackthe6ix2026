import { describe, expect, it } from "vitest";
import { graphPrompt } from "./graph.prompt";

describe("graphPrompt", () => {
  it("omits notes section when sourceNotes is absent", () => {
    const prompt = graphPrompt("Photosynthesis");
    expect(prompt).toContain('topic "Photosynthesis"');
    expect(prompt).not.toContain("LECTURE NOTES");
  });

  it("includes notes section when sourceNotes is provided", () => {
    const prompt = graphPrompt("Photosynthesis", "Chlorophyll absorbs light energy.");
    expect(prompt).toContain("Ground your concept graph");
    expect(prompt).toContain("Chlorophyll absorbs light energy.");
    expect(prompt).toContain("--- LECTURE NOTES ---");
  });
});
