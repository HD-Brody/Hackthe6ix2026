/**
 * Demo seed script. Owner: D (Block D2 step 8).
 *
 * Pre-loads the 5 demo concept graphs from fixtures/graphs/ into MongoDB Atlas
 * as ready-to-use topics. This means the live demo never has to call Gemini to
 * generate a graph — it just looks up a pre-seeded one.
 *
 * Safe to run multiple times — uses upsert logic to skip topics that already
 * exist in the "demo_topics" collection.
 *
 * Usage:
 *   npm run seed-demo
 *   (or directly: npx tsx scripts/seed-demo.ts)
 *
 * Requires MONGODB_URI and MONGODB_DB to be set in .env.local.
 */

import path from "path";
import fs from "fs";
import { MongoClient } from "mongodb";
import type { ConceptGraph } from "@/lib/types";

// ── Load .env.local ──────────────────────────────────────────────────────────
// Next.js loads this automatically during `npm run dev`, but this script runs
// outside Next.js so we parse it ourselves.

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    console.warn("⚠️  .env.local not found — relying on existing environment variables.");
    return;
  }
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    const [, key, raw] = match;
    // Strip surrounding quotes if present
    const value = /^["'].*["']$/.test(raw) ? raw.slice(1, -1) : raw;
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

// ── Graph fixture paths ──────────────────────────────────────────────────────

const GRAPHS_DIR = path.resolve(process.cwd(), "fixtures/graphs");

const FIXTURE_FILES = [
  "graph-tcp-congestion-control.json",
  "graph-how-https-works.json",
  "graph-photosynthesis.json",
  "graph-inflation.json",
  "graph-binary-search-trees.json",
];

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB ?? "professor_me";

  if (!uri) {
    console.error("❌ MONGODB_URI is not set. Add it to .env.local and try again.");
    process.exit(1);
  }

  console.log(`Connecting to MongoDB (db: ${dbName})...`);
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);

    // Store demo graphs in a dedicated collection separate from live sessions.
    // This keeps demo state stable even as real sessions are created/deleted.
    const collection = db.collection<{ _id: string; graph: ConceptGraph }>("demo_topics");

    let seeded = 0;
    let skipped = 0;

    for (const filename of FIXTURE_FILES) {
      const filepath = path.join(GRAPHS_DIR, filename);

      // Guard: skip missing files rather than crashing the whole run
      if (!fs.existsSync(filepath)) {
        console.warn(`⚠️  File not found, skipping: ${filepath}`);
        continue;
      }

      const graph: ConceptGraph = JSON.parse(fs.readFileSync(filepath, "utf8"));
      const topic = graph.topic;

      // Use topic as the stable unique key — safe to run multiple times.
      const existing = await collection.findOne({ _id: topic });

      if (existing) {
        console.log(`⏭️  Skipped (already exists): ${topic}`);
        skipped++;
        continue;
      }

      await collection.insertOne({ _id: topic, graph });
      console.log(`✅ Seeded: ${topic}  (${graph.nodes.length} nodes)`);
      seeded++;
    }

    console.log(`\nDone. ${seeded} seeded, ${skipped} already existed.`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("❌ Seed script failed:", err.message ?? err);
  process.exit(1);
});
