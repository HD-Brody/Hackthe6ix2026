/**
 * Client-safe tip / support types (no server imports).
 */

export const TIP_AMOUNTS_USDC = [3, 5, 10] as const;
export type TipAmountUsdc = (typeof TIP_AMOUNTS_USDC)[number];
export const DEFAULT_TIP_USDC: TipAmountUsdc = 5;

export function isTipAmount(value: unknown): value is TipAmountUsdc {
  return (
    typeof value === "number" &&
    (TIP_AMOUNTS_USDC as readonly number[]).includes(value)
  );
}

export type SupportStatus = {
  billingMock: boolean;
  canCheckout: boolean;
  tipAmounts: readonly TipAmountUsdc[];
  defaultTipUsdc: TipAmountUsdc;
};
