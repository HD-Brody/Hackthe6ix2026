# Professor Me

**You don't study with it. You teach it.**

An AI that plays a bright-but-ignorant student. You explain a topic; it probes
where your explanation is vague. At the end you get a **gap map**: what you
explained well, where you hand-waved, and which questions you dodged.

Full context: [docs/design-doc.md](docs/design-doc.md) · [docs/build-plan.md](docs/build-plan.md)

## Getting started

```bash
npm install
cp .env.example .env.local   # D fills in real keys at CP0
npm run dev                  # http://localhost:3000
npm test                     # turn-policy unit tests
npm run eval                 # B's prompt eval harness
```

## Who owns what

Directory boundaries == track boundaries. Stay in your lane and merges are trivial.

| Track | Person | Directories |
|---|---|---|
| **A** Backend / Orchestrator | | `src/app/api/`, `src/server/` |
| **B** LLM / Prompts | | `src/llm/`, `fixtures/graphs/` |
| **C** Frontend | | `src/app/*` (pages), `src/components/` |
| **D** Voice / Infra | | `src/voice/`, `scripts/`, `.env.example`, deploy config |
| shared (frozen at CP0) | everyone | `contracts/`, `src/lib/types.ts` |

`src/lib/sse.ts` is the one deliberately shared seam: A writes the server half,
C writes the client half — coordinate once at hour 4.

**Changing anything in `contracts/` or `src/lib/types.ts` after CP0 requires
all four to agree.** This rule will save you twice on Saturday night.

## Git workflow

- One branch per person: `a/orchestrator`, `b/prompts`, `c/frontend`, `d/voice`
- Merges to `main` happen **at checkpoints only**, in order A → B → C → D,
  whole team present (~15 min)
- Between checkpoints, rebase on `main` before starting anything new
- `main` is always demoable after CP2

## Checkpoint map

```
Hour:  0    1         4          8            14           20         27      30    36
       |    |         |          |            |            |          |       |     |
       Kick CP0       CP1        CP2          CP3          CP4        CP5     CP6   Submit
            contracts walking    TEXT LOOP    VOICE LOOP   FREEZE     stretch demo
            frozen    skeleton   integrated   integrated   full e2e   merge   lock
```

- **CP0 (h1):** contracts + fixtures committed, keys verified. ✅ (this repo)
- **CP1 (h4):** C's UI talks to A's echo-mode API; B's five vetted graphs in
  `fixtures/graphs/`; D's latency numbers + the two decisions (STT, Gemini tiers)
- **CP2 (h8):** full text loop with real LLM calls
- **CP3 (h14):** the text loop, spoken; gap map v1
- **CP4 (h20):** **FREEZE.** Feature-complete, deployed. Protect this even if
  stretch dreams die. If something's broken at h19, cut the feature, not the freeze.
- **CP5 (h27):** stretch merge — only *done* stretch work
- **CP6 (h30):** demo lock, rehearsals

**Never cut:** the gap map with verbatim quotes. It's the product.
