import { describe, expect, it } from "vitest";
import { isRedirectCategory, normalizeScreenResult } from "./screenUserTurn";

describe("normalizeScreenResult", () => {
  it("passes through ok / off_topic / unsafe", () => {
    expect(normalizeScreenResult({ category: "ok" })).toEqual({ category: "ok" });
    expect(normalizeScreenResult({ category: "off_topic" })).toEqual({
      category: "off_topic",
    });
    expect(normalizeScreenResult({ category: "unsafe" })).toEqual({
      category: "unsafe",
    });
  });

  it("fails open to ok on missing or unknown category", () => {
    expect(normalizeScreenResult(null)).toEqual({ category: "ok" });
    expect(normalizeScreenResult({})).toEqual({ category: "ok" });
    expect(normalizeScreenResult({ category: "blocked" })).toEqual({
      category: "ok",
    });
    expect(normalizeScreenResult({ category: 3 })).toEqual({ category: "ok" });
  });
});

describe("isRedirectCategory", () => {
  it("is true only for off_topic and unsafe", () => {
    expect(isRedirectCategory("ok")).toBe(false);
    expect(isRedirectCategory("off_topic")).toBe(true);
    expect(isRedirectCategory("unsafe")).toBe(true);
  });
});
