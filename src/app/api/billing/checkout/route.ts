/**
 * POST /api/billing/checkout { amountUsdc? } → Unifold client_secret or mock thanks
 */

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getUserId } from "@/lib/auth0";
import {
  canCreateLiveCheckout,
  DEFAULT_TIP_USDC,
  isBillingMock,
  isTipAmount,
} from "@/server/billing/config";
import { createTipCheckout } from "@/server/billing/unifold";
import { recordDonation } from "@/server/db/donations";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { amountUsdc?: number } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const amountUsdc = isTipAmount(body.amountUsdc)
    ? body.amountUsdc
    : DEFAULT_TIP_USDC;

  const userId = await getUserId();

  if (isBillingMock()) {
    const paymentIntentId = `mock_tip_${randomUUID()}`;
    await recordDonation({
      paymentIntentId,
      userId,
      amountUsdc,
      mock: true,
    });
    return NextResponse.json({
      mock: true,
      thanks: true,
      paymentIntentId,
      amountUsdc,
      message: `Thanks — mock tip of ${amountUsdc} USDC recorded.`,
    });
  }

  if (!canCreateLiveCheckout()) {
    return NextResponse.json(
      {
        error: "billing_not_configured",
        message:
          "Unifold tips need UNIFOLD_SECRET_KEY and UNIFOLD_RECIPIENT_ADDRESS (or set BILLING_MOCK=true).",
      },
      { status: 503 }
    );
  }

  try {
    const checkout = await createTipCheckout(userId, amountUsdc);
    return NextResponse.json({
      mock: false,
      paymentIntentId: checkout.paymentIntentId,
      clientSecret: checkout.clientSecret,
      amountUsdc,
    });
  } catch (err) {
    console.error("[billing/checkout]", err);
    return NextResponse.json(
      {
        error: "checkout_failed",
        message:
          err instanceof Error
            ? err.message
            : "Could not start Unifold checkout.",
      },
      { status: 502 }
    );
  }
}
