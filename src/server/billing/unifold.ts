/**
 * Thin Unifold server client — tip payment intents + webhook verify.
 */

import Unifold from "@unifold/node";
import type { WebhookEvent } from "@unifold/node";
import {
  getUnifoldRecipientAddress,
  getUnifoldSecretKey,
  getUnifoldWebhookSecret,
  tipAmountBaseUnits,
  UNIFOLD_DESTINATION_NETWORK,
} from "@/server/billing/config";

let client: Unifold | null = null;

export function getUnifoldClient(): Unifold {
  const key = getUnifoldSecretKey();
  if (!key) {
    throw new Error("UNIFOLD_SECRET_KEY is not set");
  }
  if (!client) {
    client = new Unifold(key);
  }
  return client;
}

export type CreatedCheckout = {
  paymentIntentId: string;
  clientSecret: string;
};

export async function createTipCheckout(
  externalUserId: string,
  amountUsdc: number
): Promise<CreatedCheckout> {
  const recipient = getUnifoldRecipientAddress();
  if (!recipient) {
    throw new Error("UNIFOLD_RECIPIENT_ADDRESS is not set");
  }

  const unifold = getUnifoldClient();
  const paymentIntent = await unifold.paymentIntents.create({
    destination_amount: tipAmountBaseUnits(amountUsdc),
    destination_currency: "usdc",
    destination_network: UNIFOLD_DESTINATION_NETWORK,
    recipient_address: recipient,
    external_user_id: externalUserId,
    settlement_tolerance_percent: 1,
    stablecoin_parity: true,
    description: `Professor Me tip — ${amountUsdc} USDC`,
    metadata: {
      product: "tip",
      amount_usdc: String(amountUsdc),
      user_id: externalUserId,
    },
  });

  return {
    paymentIntentId: paymentIntent.id,
    clientSecret: paymentIntent.client_secret,
  };
}

export function constructWebhookEvent(
  payload: string | Buffer,
  headers: {
    "unifold-id"?: string;
    "unifold-timestamp"?: string;
    "unifold-signature"?: string;
    [key: string]: string | string[] | undefined;
  }
): WebhookEvent {
  const secret = getUnifoldWebhookSecret();
  if (!secret) {
    throw new Error("UNIFOLD_WEBHOOK_SECRET is not set");
  }
  return getUnifoldClient().webhooks.constructEvent(payload, headers, secret);
}

export function userIdFromPaymentIntentMetadata(
  metadata: Record<string, string> | null | undefined
): string | null {
  const raw = metadata?.user_id?.trim();
  return raw || null;
}

export function tipAmountFromMetadata(
  metadata: Record<string, string> | null | undefined
): number | null {
  const raw = metadata?.amount_usdc?.trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}
