# Latency spike + measured budget (D1 steps 2–3, A3 step 14)

Numbers from live measurements. Gemini rows measured by `npm run cp2:integration`
(real mode, 2026-07-18). STT/TTS rows still owed by D.

## Measurements

| Stage | Option | Measured | Notes |
|---|---|---|---|
| STT finalization | Web Speech API (Chrome) | _ms_ | **D: still owed.** jargon accuracy on: ssthresh, TLS handshake, +3 more |
| STT finalization | Whisper API (10s clip) | n/a | not spiked — Web Speech chosen (see decisions) |
| TTS first-audio | ElevenLabs websocket, token-by-token | _ms_ | **D: still owed.** browser→ElevenLabs direct WS (ttsClient.ts) |
| Gemini fast tier | evaluate() full call via live API, median of 12 | **1231ms** (avg 1228ms) | cp2-integration, gemini-2.5-flash-lite |
| Persona first token | after policy, sequential, median of 6 | **271ms** | cp2-integration, streamed via gemini-2.5-flash-lite |
| Perceived first token | sequential vs parallel eval, median of 6 each | **1950ms → 748ms** | parallel saves **1202ms/turn** (real Gemini) |

## The budget

With PARALLEL_EVAL=true, eval runs off the perceived path:

```
STT-final → persona-first-token → first-audio
            ~750ms (measured)     + TTS TTFA (D to measure)
```

Projected total: **~750ms + ElevenLabs TTFA**. If TTFA ≤ 700ms we're inside the
~1.5s design-doc budget WITHOUT thinking-noise masks; masks (already rendered in
public/audio/) are the fallback if real-world numbers drift.

## Decisions

- [x] STT choice: **Web Speech API (Chrome)** — no jargon biasing (documented
      no-op in sttClient.ts); text-input fallback is mandatory in the UI
- [x] Gemini tier split: fast = **gemini-2.5-flash-lite** (evaluator, persona),
      strong = **gemini-2.5-flash** (graph generation, gap map)
- [x] PARALLEL_EVAL: **true** — measured 1202ms/turn median savings
      (cp2-integration, 6-turn A/B, real Gemini). One-turn policy lag accepted;
      conversation quality spot-checked in the drill transcript.

## Voice choice (Block D2 step 6)

Voice ID: **cgSgspJ2msm6clMCkdW9 (Jessica — Playful, Bright, Warm)**
stability: **0.5**  similarity: **0.75**  model: **eleven_turbo_v2**
Thinking noises pre-rendered at stability 0.3 (scripts/generate-thinking-noises.ts).
