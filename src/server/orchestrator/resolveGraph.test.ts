import { describe, expect, it } from "vitest";
import { shouldUseDemoGraphCache } from "./demoGraphCache";

describe("shouldUseDemoGraphCache", () => {
  it("uses demo cache when no notes are provided", () => {
    expect(shouldUseDemoGraphCache()).toBe(true);
    expect(shouldUseDemoGraphCache("")).toBe(true);
    expect(shouldUseDemoGraphCache("   ")).toBe(true);
  });

  it("bypasses demo cache when source notes are present", () => {
    expect(shouldUseDemoGraphCache("Lecture notes about chlorophyll.")).toBe(
      false
    );
  });
});
