# API surface — CP0 contract

Frozen at hour 1. Changes after that require all four to agree.

```
POST /api/session            {topic, prior_session_id?} → {session_id, graph, bridging?}
POST /api/session/:id/turn   {user_text}      → SSE stream (see below)
POST /api/session/:id/opening {}               → SSE stream (re-teach bridging line; no user text)
POST /api/session/:id/end    {}               → {gap_map}
GET  /api/session/:id                         → full session state (refresh recovery)

GET  /api/billing/status                      → {billingMock, canCheckout, tipAmounts, defaultTipUsdc}
POST /api/billing/checkout   {amountUsdc?}    → {clientSecret, paymentIntentId} | mock thanks
POST /api/billing/confirm    {paymentIntentId}→ {thanks, pending?}
POST /api/billing/webhook                     → Unifold payment_intent.succeeded (record tip)
```

`prior_session_id` (optional): links a new session to a prior ended session''s gap
map. The server snapshots `reteach_order` and vague moments into
`prior_gap_context` on the new session and sets `pending_directive` to probe
the first gap. The client should call `/opening` once when the classroom loads
with zero utterances.

Tips are voluntary — there is no trial/Pro paywall on session create.

## Turn endpoint SSE event format

SSE is deliberate: C renders tokens as they stream, D feeds the same stream
into ElevenLabs. One transport serves both. C and D sync on this format once,
at hour 4, then diverge again.

```
event: token
data: {"text": "wait, "}

event: token
data: {"text": "so what happens "}

...

event: done
data: {"verdict": <verdict.schema.json>, "session_status": "teaching" | "wrapping" | "ended"}
```

Error mid-stream:

```
event: error
data: {"message": "...", "fallback_line": "sorry, zoned out for a second — say that again?"}
```

## Module contracts (B ships these for A to import)

```ts
generateGraph(topic: string): Promise<ConceptGraph>
evaluate(graph: ConceptGraph, transcript: Utterance[], userText: string): Promise<Verdict>
personaReply(transcript: Utterance[], directive: Directive): AsyncIterable<string>  // token stream
generateGapMap(graph: ConceptGraph, quotes: VagueMoment[], dodged: string[]): Promise<GapMap>
```

TypeScript types for all of the above live in `src/lib/types.ts` — that file
mirrors the JSON schemas in this directory and is the thing you actually import.
