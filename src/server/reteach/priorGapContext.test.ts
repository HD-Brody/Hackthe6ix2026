import { describe, it, expect } from "vitest";
import {
  buildPriorGapContext,
  PriorSessionInvalidError,
} from "./priorGapContext";
import type { GapMap } from "@/lib/types";

const gapMap: GapMap = {
  topic: "TCP congestion control",
  nodes: [
    { id: "n1", name: "Slow Start", state: "solid" },
    { id: "n2", name: "Congestion Avoidance", state: "vague" },
    { id: "n3", name: "Fast Retransmit", state: "wrong" },
  ],
  vaguest_moments: [
    { node_id: "n2", quote: "it speeds up until it doesn't" },
    { node_id: "n3", quote: "three duplicate acks trigger a reset" },
    { node_id: "n1", quote: "extra quote" },
  ],
  dodged_questions: ["What is ssthresh?"],
  reteach_order: ["n3", "n2"],
  one_liner: "You get the big picture but the mechanisms need work.",
};

describe("buildPriorGapContext", () => {
  it("builds a compact snapshot with resolved names", () => {
    const prior = buildPriorGapContext("session-1", gapMap);
    expect(prior).toEqual({
      prior_session_id: "session-1",
      topic: "TCP congestion control",
      reteach_order: ["n3", "n2"],
      reteach_names: ["Fast Retransmit", "Congestion Avoidance"],
      vaguest_moments: gapMap.vaguest_moments.slice(0, 2),
      one_liner: gapMap.one_liner,
    });
  });

  it("rejects empty reteach_order", () => {
    expect(() =>
      buildPriorGapContext("session-1", { ...gapMap, reteach_order: [] })
    ).toThrow(PriorSessionInvalidError);
  });
});
