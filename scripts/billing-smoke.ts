/**
 * Smoke-test tip donation recording (Mongo).
 * Usage: npx tsx --env-file=.env.local scripts/billing-smoke.ts
 */

import { randomUUID } from "crypto";
import { recordDonation } from "../src/server/db/donations";

async function main() {
  const paymentIntentId = `mock_tip_${randomUUID()}`;
  const userId = `smoke:tip:${randomUUID()}`;

  const first = await recordDonation({
    paymentIntentId,
    userId,
    amountUsdc: 5,
    mock: true,
  });
  if (!first.recorded) throw new Error("expected first tip to insert");

  const second = await recordDonation({
    paymentIntentId,
    userId,
    amountUsdc: 5,
    mock: true,
  });
  if (second.recorded) throw new Error("duplicate tip should be idempotent");

  console.log("billing-smoke ok", {
    paymentIntentId,
    amount_usdc: first.donation.amount_usdc,
  });
  process.exit(0);
}

main().catch((err) => {
  console.error("billing-smoke failed", err);
  process.exit(1);
});
