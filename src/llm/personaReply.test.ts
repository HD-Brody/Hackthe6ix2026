import { describe, expect, it } from "vitest";
import { stripSpokenArtifacts } from "./personaReply";

describe("stripSpokenArtifacts", () => {
  it("removes markdown emphasis wrappers", () => {
    expect(stripSpokenArtifacts("do they actually *make* something?")).toBe(
      "do they actually make something?"
    );
    expect(stripSpokenArtifacts("turns into _food_")).toBe("turns into food");
  });

  it("strips leftover lone asterisks and underscores", () => {
    expect(stripSpokenArtifacts("actually * make")).toBe("actually  make");
    expect(stripSpokenArtifacts("plain text")).toBe("plain text");
  });
});
