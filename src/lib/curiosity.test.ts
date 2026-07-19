import { describe, it, expect } from "vitest";
import {
  parseCuriosityLevel,
  probeThresholdForCuriosity,
} from "./curiosity";

describe("parseCuriosityLevel", () => {
  it("accepts low, medium, and high", () => {
    expect(parseCuriosityLevel("low")).toBe("low");
    expect(parseCuriosityLevel("medium")).toBe("medium");
    expect(parseCuriosityLevel("high")).toBe("high");
  });

  it("defaults unknown values to medium", () => {
    expect(parseCuriosityLevel(undefined)).toBe("medium");
    expect(parseCuriosityLevel("extreme")).toBe("medium");
  });
});

describe("probeThresholdForCuriosity", () => {
  it("maps curiosity to probe caps", () => {
    expect(probeThresholdForCuriosity("low")).toBe(1);
    expect(probeThresholdForCuriosity("medium")).toBe(2);
    expect(probeThresholdForCuriosity("high")).toBe(3);
  });
});
