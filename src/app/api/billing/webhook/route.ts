/**
 * POST /api/billing/webhook — Unifold payment_intent.succeeded → record tip
 */

import { NextRequest, NextResponse } from "next/server";
import { UnifoldSignatureVerificationError } from "@unifold/node";
import { DEFAULT_TIP_USDC } from "@/server/billing/config";
import {
  constructWebhookEvent,
  tipAmountFromMetadata,
  userIdFromPaymentIntentMetadata,
} from "@/server/billing/unifold";
import { recordDonation } from "@/server/db/donations";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const headers = {
    "unifold-id": req.headers.get("unifold-id") ?? undefined,
    "unifold-timestamp": req.headers.get("unifold-timestamp") ?? undefined,
    "unifold-signature": req.headers.get("unifold-signature") ?? undefined,
  };

  let event;
  try {
    event = constructWebhookEvent(rawBody, headers);
  } catch (err) {
    if (err instanceof UnifoldSignatureVerificationError) {
      console.error("[billing/webhook] signature failed:", err.message);
      return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
    }
    console.error("[billing/webhook] construct failed:", err);
    return NextResponse.json(
      {
        error: "webhook_error",
        message: err instanceof Error ? err.message : "webhook verify failed",
      },
      { status: 400 }
    );
  }

  if (event.type !== "payment_intent.succeeded") {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const pi = event.data.object;
  const meta = pi.metadata as Record<string, string> | null;
  if (meta?.product && meta.product !== "tip") {
    return NextResponse.json({ received: true, ignored: "non_tip_product" });
  }

  const userId = userIdFromPaymentIntentMetadata(meta);
  if (!userId) {
    console.error(
      "[billing/webhook] payment_intent.succeeded missing metadata.user_id",
      pi.id
    );
    return NextResponse.json({ error: "missing_user_id" }, { status: 422 });
  }

  const amountUsdc = tipAmountFromMetadata(meta) ?? DEFAULT_TIP_USDC;
  const { recorded } = await recordDonation({
    paymentIntentId: pi.id,
    userId,
    amountUsdc,
    mock: false,
  });

  return NextResponse.json({
    received: true,
    recorded,
    user_id: userId,
    amount_usdc: amountUsdc,
  });
}
