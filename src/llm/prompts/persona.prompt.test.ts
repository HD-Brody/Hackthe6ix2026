import { describe, expect, it } from "vitest";
import { personaPrompt } from "./persona.prompt";

describe("personaPrompt", () => {
  it("uses Sam by default", () => {
    const prompt = personaPrompt([], { type: "ADVANCE" });
    expect(prompt).toContain("You are Sam,");
    expect(prompt).toContain("what Sam would say");
  });

  it("uses Elena when requested", () => {
    const prompt = personaPrompt([], { type: "ADVANCE" }, "elena");
    expect(prompt).toContain("You are Elena,");
    expect(prompt).toContain("what Elena would say");
    expect(prompt).not.toContain("You are Sam,");
  });
});
