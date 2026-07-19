/**
 * Unifold tip / support knobs (server).
 */

import {
  DEFAULT_TIP_USDC,
  TIP_AMOUNTS_USDC,
  isTipAmount,
  type TipAmountUsdc,
} from "@/lib/billing";

export {
  DEFAULT_TIP_USDC,
  TIP_AMOUNTS_USDC,
  isTipAmount,
  type TipAmountUsdc,
};

/** USDC uses 6 decimals — 5 USDC → "5000000". */
export function tipAmountBaseUnits(amountUsdc: number): string {
  return String(Math.round(amountUsdc * 1_000_000));
}

export const UNIFOLD_DESTINATION_NETWORK =
  process.env.UNIFOLD_DESTINATION_NETWORK ?? "base";

export function isBillingMock(): boolean {
  return process.env.BILLING_MOCK === "true";
}

export function getUnifoldPublishableKey(): string | undefined {
  return process.env.NEXT_PUBLIC_UNIFOLD_PUBLISHABLE_KEY?.trim() || undefined;
}

export function getUnifoldSecretKey(): string | undefined {
  return process.env.UNIFOLD_SECRET_KEY?.trim() || undefined;
}

export function getUnifoldWebhookSecret(): string | undefined {
  return process.env.UNIFOLD_WEBHOOK_SECRET?.trim() || undefined;
}

export function getUnifoldRecipientAddress(): string | undefined {
  return process.env.UNIFOLD_RECIPIENT_ADDRESS?.trim() || undefined;
}

export function canCreateLiveCheckout(): boolean {
  return Boolean(getUnifoldSecretKey() && getUnifoldRecipientAddress());
}
