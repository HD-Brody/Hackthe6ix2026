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

  it("uses redirect instruction instead of ADVANCE when redirect is set", () => {
    const prompt = personaPrompt([], { type: "ADVANCE" }, "sam", {
      redirect: "off_topic",
      topic: "TCP congestion control",
    });
    expect(prompt).toContain("wandered off the lesson");
    expect(prompt).toContain("TCP congestion control");
    expect(prompt).not.toContain("That part is covered well enough");
    expect(prompt).toContain("clearly off-topic or inappropriate/unsafe");
  });

  it("uses unsafe redirect copy without echoing a normal deepen instruction", () => {
    const prompt = personaPrompt([], { type: "DEEPEN", node_id: "n1" }, "sam", {
      redirect: "unsafe",
      topic: "photosynthesis",
    });
    expect(prompt).toContain("inappropriate or unsafe");
    expect(prompt).toContain("photosynthesis");
    expect(prompt).not.toContain("Push one level deeper");
    expect(prompt).toContain('Whoa, let\'s stick to');
  });

  it("PROBE instruction bans empty echo questions and demands a missing piece", () => {
    const prompt = personaPrompt([], { type: "PROBE", node_id: "n1" });
    expect(prompt).toContain("so they do stuff?");
    expect(prompt).toContain("so nodes do stuff?");
    expect(prompt).toContain("ONE missing piece");
    expect(prompt).toContain("Start with that ask");
    expect(prompt).toContain("Substance floor");
    expect(prompt).not.toContain("Express genuine confusion about");
  });

  it("keeps DEEPEN/ADVANCE substance guidance in the prompt", () => {
    const deepen = personaPrompt([], { type: "DEEPEN", node_id: "n1" });
    expect(deepen).toContain("Not a restatement of what they just said");
    expect(deepen).toContain("what happens after / next");
    const advance = personaPrompt([], { type: "ADVANCE", node_id: "n2" });
    expect(advance).toContain("without opening by echoing");
  });

  it("bans repeating prior student questions", () => {
    const prompt = personaPrompt([], { type: "PROBE", node_id: "n1" });
    expect(prompt).toContain("Never repeat yourself");
    expect(prompt).toContain("do not ask it again");
  });
});
