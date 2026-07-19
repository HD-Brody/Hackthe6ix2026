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

  it("PROBE asks for a concrete missing piece, not a hollow what-happens loop", () => {
    const prompt = personaPrompt([], { type: "PROBE", node_id: "n1" });
    expect(prompt).toContain("so they do stuff?");
    expect(prompt).toContain("concrete missing piece");
    expect(prompt).toContain("what happens to it then?");
    expect(prompt).toContain("Hollow follow-ups");
  });

  it("DEEPEN/ADVANCE push fresh specific angles", () => {
    const deepen = personaPrompt([], { type: "DEEPEN", node_id: "n1" });
    expect(deepen).toContain("where does the energy go");
    expect(deepen).toContain("fresh angle");
    const advance = personaPrompt([], { type: "ADVANCE", node_id: "n2" });
    expect(advance).toContain("HASN'T mentioned yet");
  });

  it("bans Wait-so loops and repeating prior student questions", () => {
    const prompt = personaPrompt([], { type: "PROBE", node_id: "n1" });
    expect(prompt).toContain("Wait, so…");
    expect(prompt).toContain("got it");
    expect(prompt).toContain("Never repeat yourself");
    expect(prompt).toContain("Good question flavors");
  });
});
