/**
 * Generate pre-rendered voice preview clips for each student. Owner: D.
 *
 * Saves two short MP3 files to public/audio/ using each student's ElevenLabs
 * voice. These are played when the user clicks "Preview Voice" on the student
 * selector screen.
 *
 * Why pre-render instead of calling ElevenLabs on click?
 *   - Zero latency: the audio is already on disk, no API round-trip on click.
 *   - No client-side API key exposure for this non-streaming call.
 *   - Credits consumed once at build/generation time, not on every demo click.
 *
 * Usage:
 *   npx tsx scripts/generate-voice-previews.ts
 *   (or: npm run generate:previews)
 *
 * Requires ELEVENLABS_API_KEY in .env.local.
 * Output: public/audio/sam-preview.mp3
 *         public/audio/elena-preview.mp3
 */

import path from "path";
import fs from "fs";

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

// ── Voice definitions ────────────────────────────────────────────────────────
//
// Each student has their own ElevenLabs voice ID and a short preview sentence
// that showcases their personality. Keep these to 1-2 sentences — long enough
// to hear the voice clearly, short enough that it plays quickly.
//
// Sam  → Jessica (cgSgspJ2msm6clMCkdW9): Playful, Bright, Warm — same voice
//         used for actual Sam sessions.
// Elena → Bella (EXAVITQu4vr4xnSDxMaL): Thoughtful, Calm, Articulate —
//          a distinct voice to give Elena her own identity.

const PREVIEWS = [
  {
    filename: "sam-preview.mp3",
    voiceId: "bIHbv24MWmeRgasZH58o", // Will — Relaxed Optimist (Sam's voice)
    text: "Hey, I'm Sam — sharp, curious, and I know absolutely nothing about whatever you're teaching. You decide how relentless I get.",
    description: "Sam — curious, analogy-driven learner",
    stability: 0.45,
    similarity_boost: 0.75,
  },
  {
    filename: "elena-preview.mp3",
    voiceId: "cgSgspJ2msm6clMCkdW9", // Jessica — Playful, Bright, Warm (Elena's voice)
    text: "I'm Elena — thoughtful, curious, and I know nothing about your topic until you teach me. You decide how hard I push back.",
    description: "Elena — thoughtful, example-driven learner",
    stability: 0.55,
    similarity_boost: 0.75,
  },
];

const OUTPUT_DIR = path.resolve(process.cwd(), "public/audio");

// ── Main ─────────────────────────────────────────────────────────────────────

async function generateClip(clip: (typeof PREVIEWS)[number]) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY not set in environment.");

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${clip.voiceId}`,
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
          stability: clip.stability,
          similarity_boost: clip.similarity_boost,
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`ElevenLabs API error (${response.status}): ${errText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created output directory: ${OUTPUT_DIR}`);
  }

  console.log(`Generating ${PREVIEWS.length} voice preview clips...\n`);

  for (const clip of PREVIEWS) {
    const outPath = path.join(OUTPUT_DIR, clip.filename);
    process.stdout.write(`  Generating ${clip.filename} ...\n    "${clip.text.slice(0, 60)}..."\n`);

    try {
      const buffer = await generateClip(clip);
      fs.writeFileSync(outPath, buffer);
      console.log(`  ✅  Saved ${clip.filename} (${buffer.length} bytes) — ${clip.description}\n`);
    } catch (err) {
      console.log(`  ❌  FAILED: ${clip.filename}`);
      console.error(`     ${err instanceof Error ? err.message : err}\n`);
    }
  }

  console.log("✅ Done. Files saved to: " + OUTPUT_DIR);
  console.log("   Serve paths:");
  for (const clip of PREVIEWS) {
    console.log(`     /audio/${clip.filename}`);
  }
}

main().catch((err) => {
  console.error("❌ Script failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
