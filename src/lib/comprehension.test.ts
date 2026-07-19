import { describe, it, expect } from "vitest";
import {
  computeComprehensionStats,
  formatBreakdown,
} from "./comprehension";
import type { NodeState } from "@/lib/types";

function node(id: string, state: NodeState) {
  return { id, name: id, state };
}

describe("computeComprehensionStats", () => {
  it("returns null score when nothing discussed", () => {
    const stats = computeComprehensionStats([
      node("a", "unvisited"),
      node("b", "unvisited"),
    ]);
    expect(stats.discussed).toBe(0);
    expect(stats.score).toBeNull();
    expect(stats.unexplored).toBe(2);
  });

  it("scores 100 when all discussed nodes are solid", () => {
    const stats = computeComprehensionStats([
      node("a", "solid"),
      node("b", "solid"),
      node("c", "unvisited"),
    ]);
    expect(stats.discussed).toBe(2);
    expect(stats.score).toBe(100);
    expect(stats.coveragePct).toBe(67);
  });

  it("applies weighted scoring for mixed states", () => {
    const stats = computeComprehensionStats([
      node("a", "solid"),   // 100
      node("b", "vague"),   // 50
      node("c", "touched"), // 25
      node("d", "wrong"),   // 0
      node("e", "unvisited"),
    ]);
    // (100 + 50 + 25 + 0) / 4 = 43.75 → 44
    expect(stats.score).toBe(44);
    expect(stats.discussed).toBe(4);
    expect(stats.unexplored).toBe(1);
  });

  it("does not penalize unexplored nodes in score", () => {
    const stats = computeComprehensionStats([
      node("a", "solid"),
      node("b", "solid"),
      node("c", "solid"),
      ...Array.from({ length: 9 }, (_, i) => node(`u${i}`, "unvisited")),
    ]);
    expect(stats.score).toBe(100);
    expect(stats.total).toBe(12);
    expect(stats.discussed).toBe(3);
  });
});

describe("formatBreakdown", () => {
  it("formats mixed counts", () => {
    const stats = computeComprehensionStats([
      node("a", "solid"),
      node("b", "solid"),
      node("c", "solid"),
      node("d", "vague"),
      node("e", "vague"),
      node("f", "wrong"),
    ]);
    expect(formatBreakdown(stats)).toBe("3 solid · 2 shaky · 1 gap");
  });

  it("handles empty discussed set", () => {
    const stats = computeComprehensionStats([node("a", "unvisited")]);
    expect(formatBreakdown(stats)).toBe("no concepts explored yet");
  });
});
