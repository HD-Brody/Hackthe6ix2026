/**
 * Donations collection — recorded tips (mock or Unifold).
 */

import { getDb } from "./mongo";

export type DonationDoc = {
  payment_intent_id: string;
  user_id: string;
  amount_usdc: number;
  mock: boolean;
  created_at: Date;
};

async function donations() {
  return (await getDb()).collection<DonationDoc>("donations");
}

let indexesReady = false;

async function ensureIndexes(): Promise<void> {
  if (indexesReady) return;
  const col = await donations();
  await col.createIndex({ payment_intent_id: 1 }, { unique: true });
  indexesReady = true;
}

/**
 * Record a tip. Idempotent on payment_intent_id — returns whether inserted.
 */
export async function recordDonation(input: {
  paymentIntentId: string;
  userId: string;
  amountUsdc: number;
  mock?: boolean;
}): Promise<{ recorded: boolean; donation: DonationDoc }> {
  await ensureIndexes();
  const col = await donations();
  const doc: DonationDoc = {
    payment_intent_id: input.paymentIntentId,
    user_id: input.userId,
    amount_usdc: input.amountUsdc,
    mock: Boolean(input.mock),
    created_at: new Date(),
  };

  try {
    await col.insertOne(doc);
    return { recorded: true, donation: doc };
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    if (code === 11000) {
      const existing = await col.findOne({
        payment_intent_id: input.paymentIntentId,
      });
      if (existing) return { recorded: false, donation: existing };
    }
    throw err;
  }
}
