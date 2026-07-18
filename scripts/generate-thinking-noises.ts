/**
 * Generate pre-rendered thinking noise clips. Owner: D (Block D3 step 12).
 *
 * Saves 4 short filler audio files to public/audio/ using our existing ElevenLabs
 * voice (Jessica). These are played during AI response latency so the conversation
 * doesn't feel like it froze.
 *
 * Why low stability (0.3)?
 *   Lower stability = more expressive variation between takes. For one-word filler
 *   sounds ("hmm", "oh—", "wait—") this reads as natural hesitation rather than a
 *   flat, robotic tone. Compare to our normal 0.5 for full sentences.
 *
 * Usage:
 *   npx tsx scripts/generate-thinking-noises.ts
 *
 * Requires ELEVENLABS_API_KEY (and optionally ELEVENLABS_VOICE_ID) in .env.local.
 * Output: public/audio/{confused-hmm,curious-oh,thinking-wait,thinking-um}.mp3
 */

import path from "path";
import fs from "fs";
import { textToSpeech } from "@/voice/ttsServer";

// ── Load .env.local ──────────────────────────────────────────────────────────

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
    const value = /^["'].*["']$/.test(raw) ? raw.slice(1, -1) : raw;
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

// ── Clip definitions ─────────────────────────────────────────────────────────
//
// Each entry maps to one .mp3 file. The text is what ElevenLabs will synthesize.
// Keep these very short — one syllable or a short phrase — so they feel like
// natural verbal filler rather than a sentence.
//
// Punctuation matters for prosody:
//   "hmm?"       → rising intonation (confused/questioning)
//   "oh—"        → cut-off breath (sudden curiosity/realization)
//   "wait—"      → abrupt pause (general thinking)
//   "um..."      → trailing hesitation (general thinking)

const CLIPS = [
  {
    filename: "confused-hmm.mp3",
    text: "hmmmm...",
    description: "PROBE directive — confused/questioning hesitation",
    // Lower stability → more variation → sounds more uncertain and natural
    stabilityOverride: 0.3,
  },
  {
    filename: "curious-oh.mp3",
    text: "ohhh—",
    description: "DEEPEN directive — sudden curiosity / realization",
    stabilityOverride: 0.3,
  },
  {
    filename: "thinking-wait.mp3",
    text: "waittt—",
    description: "General-purpose thinking pause (ADVANCE / default)",
    stabilityOverride: 0.35,
  },
  {
    filename: "thinking-um.mp3",
    text: "um...?",
    description: "General-purpose soft hesitation (WRAP_UP / default)",
    stabilityOverride: 0.3,
  },
];

const OUTPUT_DIR = path.resolve(process.cwd(), "public/audio");

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Confirm output directory exists (it's committed as an empty folder with .gitkeep)
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created output directory: ${OUTPUT_DIR}`);
  }

  console.log(`Generating ${CLIPS.length} thinking noise clips...\n`);

  for (const clip of CLIPS) {
    const outPath = path.join(OUTPUT_DIR, clip.filename);
    process.stdout.write(`  Generating ${clip.filename} ("${clip.text}") ...`);

    try {
      // ttsServer.ts uses ELEVENLABS_VOICE_ID / Jessica by default.
      // We temporarily override ELEVENLABS_STABILITY via a hacky env override
      // — but ttsServer.ts doesn't read stability from env, it hardcodes 0.5.
      // So we call the API directly here to pass the per-clip stability value.

      const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "cgSgspJ2msm6clMCkdW9";
      const apiKey = process.env.ELEVENLABS_API_KEY;
      if (!apiKey) throw new Error("ELEVENLABS_API_KEY not set");

      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: clip.text,
            model_id: "eleven_turbo_v2",
            voice_settings: {
              stability: clip.stabilityOverride,
              similarity_boost: 0.75,
            },
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`ElevenLabs API error (${response.status}): ${errText}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(outPath, buffer);
      console.log(` ✅  Saved (${buffer.length} bytes) — ${clip.description}`);
    } catch (err) {
      console.log(` ❌  FAILED`);
      console.error(`     ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`\n✅ Done. Files saved to: ${OUTPUT_DIR}`);
  console.log("   Serve path: /audio/{filename} (Next.js static from public/)");
}

main().catch((err) => {
  console.error("❌ Script failed:", err.message ?? err);
  process.exit(1);
});
