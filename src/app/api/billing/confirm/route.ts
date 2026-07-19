/**
 * POST /api/billing/confirm { paymentIntentId }
 * Verifies Unifold PI succeeded and records the tip (idempotent).
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth0";
import {
  getUnifoldClient,
  tipAmountFromMetadata,
  userIdFromPaymentIntentMetadata,
} from "@/server/billing/unifold";
import { DEFAULT_TIP_USDC } from "@/server/billing/config";
import { recordDonation } from "@/server/db/donations";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const userId = await getUserId();

  let body: { paymentIntentId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const paymentIntentId = body.paymentIntentId?.trim();
  if (!paymentIntentId) {
    return NextResponse.json(
      { error: "paymentIntentId is required" },
      { status: 400 }
    );
  }

  if (paymentIntentId.startsWith("mock_tip_")) {
    return NextResponse.json({ thanks: true, pending: false });
  }

  try {
    const unifold = getUnifoldClient();
    const pi = await unifold.paymentIntents.retrieve(paymentIntentId);
    const meta = pi.metadata as Record<string, string> | null;
    const metaUser = userIdFromPaymentIntentMetadata(meta);

    if (pi.status !== "succeeded") {
      return NextResponse.json({
        pending: true,
        paymentStatus: pi.status,
        thanks: false,
      });
    }

    const amountUsdc =
      tipAmountFromMetadata(meta) ?? DEFAULT_TIP_USDC;
    const owner = metaUser ?? userId;
    const { recorded } = await recordDonation({
      paymentIntentId,
      userId: owner,
      amountUsdc,
      mock: false,
    });

    return NextResponse.json({
      pending: false,
      thanks: true,
      paymentStatus: pi.status,
      recorded,
      amountUsdc,
    });
  } catch (err) {
    console.error("[billing/confirm]", err);
    return NextResponse.json(
      {
        error: "confirm_failed",
        message: err instanceof Error ? err.message : "confirm failed",
      },
      { status: 502 }
    );
  }
}
