/**
 * GET /api/billing/status → tip config for the support page
 */

import { NextResponse } from "next/server";
import type { SupportStatus } from "@/lib/billing";
import {
  canCreateLiveCheckout,
  DEFAULT_TIP_USDC,
  isBillingMock,
  TIP_AMOUNTS_USDC,
} from "@/server/billing/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const status: SupportStatus = {
    billingMock: isBillingMock(),
    canCheckout: isBillingMock() || canCreateLiveCheckout(),
    tipAmounts: TIP_AMOUNTS_USDC,
    defaultTipUsdc: DEFAULT_TIP_USDC,
  };
  return NextResponse.json(status);
}
