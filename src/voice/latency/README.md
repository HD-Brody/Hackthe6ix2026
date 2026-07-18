# Latency spike — D's CP1 headline (Block D1, steps 2–3)

Standalone scripts, no app. Fill in the numbers, they drive two CP1 decisions.

## Measurements

| Stage | Option | Measured | Notes |
|---|---|---|---|
| STT finalization | Web Speech API (Chrome) | _ms_ | jargon accuracy on: ssthresh, TLS handshake, +3 more |
| STT finalization | Whisper API (10s clip) | _ms_ | |
| TTS first-audio | ElevenLabs websocket, token-by-token | _ms_ | |
| TTS first-audio | ElevenLabs plain streaming, full sentence | _ms_ | |
| Gemini fast tier | first-token on Evaluator-sized prompt | _ms_ | |

## The one-slide budget

STT-final → eval → persona-first-token → first-audio = **projected total: _ms_**
(target: first audio within ~1.5s of the user stopping)

## CP1 decisions (made from this table, not vibes)

- [ ] STT choice: __________
- [ ] Gemini tier split: fast = __________, strong = __________

## Voice choice (Block D2 step 6)

Voice ID: __________  stability: ___  similarity: ___
Auditioned against fixtures/persona-replies.json. Runners-up: __________
