/**
 * Clear tip donations (and leftover entitlements from the old Pro experiment).
 * Usage: npm run billing-reset
 */

import { getDb } from "../src/server/db/mongo";

async function main() {
  const db = await getDb();
  const donations = await db.collection("donations").deleteMany({});
  const entitlements = await db.collection("entitlements").deleteMany({});
  console.log(
    `Cleared donations=${donations.deletedCount}, leftover entitlements=${entitlements.deletedCount}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
