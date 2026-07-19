import { describe, it, expect } from "vitest";
import { evaluatorPrompt } from "./evaluator.prompt";

describe("evaluatorPrompt prior context", () => {
  it("includes re-teach block when prior context is provided", () => {
    const prompt = evaluatorPrompt(
      { topic: "TCP", nodes: [] },
      [],
      "hello",
      {
        prior_session_id: "s1",
        topic: "TCP congestion control",
        reteach_order: ["n2"],
        reteach_names: ["Congestion Avoidance"],
        vaguest_moments: [{ node_id: "n2", quote: "it speeds up until it doesn't" }],
        one_liner: "needs work",
      }
    );
    expect(prompt).toContain("re-teach session");
    expect(prompt).toContain("Congestion Avoidance");
    expect(prompt).toContain("it speeds up until it doesn't");
  });
});
