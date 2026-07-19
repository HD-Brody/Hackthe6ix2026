import { describe, expect, it } from "vitest";
import {
  DEFAULT_TIP_USDC,
  TIP_AMOUNTS_USDC,
  isTipAmount,
} from "@/lib/billing";
import { tipAmountBaseUnits } from "@/server/billing/config";

describe("tip amounts", () => {
  it("exposes 3 / 5 / 10 USDC presets", () => {
    expect(TIP_AMOUNTS_USDC).toEqual([3, 5, 10]);
    expect(DEFAULT_TIP_USDC).toBe(5);
  });

  it("validates tip amounts", () => {
    expect(isTipAmount(5)).toBe(true);
    expect(isTipAmount(7)).toBe(false);
    expect(isTipAmount("5")).toBe(false);
  });

  it("encodes USDC base units", () => {
    expect(tipAmountBaseUnits(5)).toBe("5000000");
    expect(tipAmountBaseUnits(3)).toBe("3000000");
  });
});
