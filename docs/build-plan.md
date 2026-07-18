# Professor Me — Parallel Build Plan (4 people, 36 hours)

Companion to the design doc. This plan is built LEGO-style: four independent tracks that only touch at named checkpoints. Between checkpoints, nobody waits on anybody.

The trick that makes independence possible: **contracts before code.** The first hour produces frozen JSON schemas and API shapes, plus hand-written mock fixtures for every contract. Everyone builds against the mocks; checkpoints are where mocks get swapped for the real thing. If your teammate is behind at a checkpoint, you keep the mock and keep moving — that's the whole point.

## Roles

| | Track | Owns |
|---|---|---|
| **A** | Backend / Orchestrator | API server, session state machine, turn policy, MongoDB persistence |
| **B** | LLM / Prompts | Concept-graph generation, Evaluator, Persona, gap-map generation, all prompt quality |
| **C** | Frontend | Session UI, transcript, gap map page, demo polish |
| **D** | Voice / Infra | STT, ElevenLabs pipeline, latency, deploy, env/keys, Auth0 wiring |

Rule of thumb when someone finishes early: A helps B (policy tuning needs both), C helps D (voice UX is frontend-adjacent). Never the reverse pairings — context-switching costs too much.

---

## Checkpoint map

```
Hour:  0    1         4          8            14           20         27      30    36
       |    |         |          |            |            |          |       |     |
       Kick CP0       CP1        CP2          CP3          CP4        CP5     CP6   Submit
            contracts walking    TEXT LOOP    VOICE LOOP   FREEZE     stretch demo
            frozen    skeleton   integrated   integrated   full e2e   merge   lock
```

- **CP0 (hour 1) — Contracts frozen.** 30-minute meeting. Output: schemas committed, mock fixtures committed, endpoint list agreed. After this, schema changes require all four to agree (this rule will save you twice on Saturday night).
- **CP1 (hour 4) — Walking skeleton.** Front end talks to back end (echo mode), real concept graphs exist, voice latency numbers exist. Two decisions get made here (STT choice, Gemini tier split).
- **CP2 (hour 8) — Text loop integrated.** A full teaching session works in text: topic → graph → probing conversation → session end. Ugly is fine.
- **CP3 (hour 14) — Voice loop integrated.** The text loop, but spoken. Gap map exists in v1.
- **CP4 (hour 20) — FREEZE.** Feature-complete MVP, end-to-end, deployed. Nothing new enters main after this except stretch branches at CP5. This is the load-bearing checkpoint; protect it even if stretch dreams die.
- **CP5 (hour 27) — Stretch merge.** Only stretch items that are *done* get merged. Half-done stretch work gets deleted without ceremony.
- **CP6 (hour 30) — Demo lock.** Rehearsals begin. Code changes after this need unanimous agreement and a very good reason.

**Git workflow:** `main` is always demoable after CP2. One branch per person (`a/orchestrator`, `b/prompts`, etc.). Merges to main happen *at checkpoints only*, in order A → B → C → D, with the whole team present for the 15 minutes it takes. Between checkpoints, rebase on main whenever you're about to start something new.

---

## CP0 — The contracts (everyone, hour 0–1)

Kickoff (30 min): agree these five artifacts, then A types them into `/contracts` and everyone thumbs-up the commit.

**1. ConceptGraph schema** (`contracts/concept-graph.schema.json`)
```json
{
  "topic": "TCP congestion control",
  "nodes": [{
    "id": "n1",
    "name": "Slow start",
    "truth": "Window grows exponentially until ssthresh or loss.",
    "difficulty": 1,
    "prereqs": [],
    "probes": ["ask-example", "ask-why", "ask-edge-case"],
    "state": "unvisited",
    "vague_quotes": []
  }]
}
```
Node states: `unvisited | touched | vague | solid | wrong | dodged`.

**2. Evaluator verdict schema** (`contracts/verdict.schema.json`)
```json
{
  "nodes_touched": ["n1", "n3"],
  "verdicts": [{"node_id": "n1", "verdict": "vague", "quote": "it like... speeds up until it doesn't"}],
  "recommended_directive": {"type": "PROBE", "node_id": "n1"}
}
```
Directive types: `PROBE | DEEPEN | ADVANCE | WRAP_UP`. This enum is the only vocabulary A's policy and B's prompts share — that's what keeps them independent.

**3. API surface** (`contracts/api.md`)
```
POST /api/session            {topic}          → {session_id, graph}
POST /api/session/:id/turn   {user_text}      → SSE stream: persona text tokens,
                                                then one final JSON event {verdict, session_status}
POST /api/session/:id/end    {}               → {gap_map}
GET  /api/session/:id                         → full session state (for refresh recovery)
```
SSE for the turn endpoint is deliberate: C renders tokens as they stream, D feeds the same stream into ElevenLabs. One transport serves both.

**4. GapMap schema** (`contracts/gap-map.schema.json`) — nodes with final states, `vaguest_moments: [{quote, node_id}]`, `dodged_questions: [string]`, `reteach_order: [node_id]`, `one_liner: string`.

**5. Mock fixtures** (`/fixtures`) — A hand-writes these during the meeting's second half, badly is fine: `graph-tcp.json`, `verdict-vague.json`, `verdict-solid.json`, `gapmap-tcp.json`, plus `persona-replies.json` (ten canned confused-student lines). These mocks are load-bearing: C and D build against them for the next 7 hours.

Also at CP0: D hands everyone `.env.example` and confirms all API keys work (Gemini, ElevenLabs, Atlas, Auth0). Nothing kills hour 3 like discovering the ElevenLabs key was free-tier.

---

## Person A — Backend / Orchestrator

### Block A1 (hours 1–4, target: CP1)
1. Scaffold the API server (Next.js API routes or FastAPI — pick in the kickoff, don't debate past minute 5).
2. Implement `POST /api/session` returning the *fixture* graph regardless of topic. Wire MongoDB Atlas (connection string from D) and persist the session doc.
3. Implement `POST /api/session/:id/turn` in **echo mode**: accept user text, stream back a canned persona line from `persona-replies.json` over SSE, append both to the session's utterance log, return a fixture verdict as the final event.
4. Implement `GET /api/session/:id` (session state from Mongo — this is C's refresh-recovery and your own debugging tool).
5. Write the session state machine skeleton: `created → teaching → wrapping → ended`, transitions logged.
6. **CP1 deliverable:** C can create a session and have a (fake) conversation against your API. Definition of done: C demos it from their UI, not from curl.

### Block A2 (hours 4–8, target: CP2)
7. Replace echo mode: on each turn, call B's Evaluator function (B ships it as a plain function/module with signature `evaluate(graph, transcript, user_text) → verdict` — agreed at CP0), apply verdict to node states, persist.
8. Implement the **turn policy** — pure function, no LLM: takes graph state + verdict, returns a directive. v1 rules, in priority order: last verdict `vague` and node not yet probed twice → `PROBE(node)`; `vague` twice already → mark node, `ADVANCE` to next prereq-satisfied unvisited node; `solid` → `DEEPEN(node)` once, then `ADVANCE`; all nodes visited → `WRAP_UP`. Write it with unit tests against fixture verdicts — this function is cheap to test and expensive to debug live.
9. Call B's Persona function with the directive, stream its tokens through the SSE response.
10. Implement `POST /api/session/:id/end` calling B's gap-map function; persist result.
11. Handle the ugly cases now, not at hour 22: user text arrives while a turn is processing (queue it), Gemini call fails (retry once, then canned in-character fallback line: "sorry, zoned out for a second — say that again?"), session not found.
12. **CP2 deliverable:** full text loop with real LLM calls. You and B pair for the last 30 minutes of this block — the seam between your policy and B's evaluator is where the product lives.

### Block A3 (hours 8–14, target: CP3)
13. **Latency work — the parallel-evaluation trick.** Restructure the turn: fire the Persona call using the *previous* verdict's directive immediately when user text arrives, run the Evaluator concurrently, and use its verdict for the *next* turn's directive. One-turn-lag policy in exchange for halving perceived latency. Feature-flag it so you can A/B against sequential at CP3 and pick with real numbers.
14. Add timing instrumentation to every stage (STT-end → first-token, first-token → first-audio). Log to console *and* persist to the session doc — D's latency report at CP4 reads from this.
15. Support D's voice integration: whatever transport D chose for audio (probably: your SSE stays text-only, D's client feeds it to ElevenLabs' websocket). Be on call; this is D's checkpoint but your endpoints.
16. Per-turn persistence hardening: kill the server mid-session, restart, `GET /session/:id`, conversation resumes. Demo insurance.
17. **CP3 deliverable:** turn loop is fast enough (numbers, not vibes) and crash-safe.

### Block A4 (hours 14–20, target: CP4 / FREEZE)
18. Policy tuning with B: run the three adversarial scripts (B is writing them — rambler, confident-wrong, derailer) through the full stack; tune the policy rules where the conversation feels dumb. This pairing is the highest-leverage six hours in the whole plan.
19. Rate limiting / cost sanity: cap turns per session (40), cap sessions per user, so a stuck loop can't drain the Gemini quota overnight.
20. Freeze support: at hour 19 you run the integration merge, tag `v1-freeze`, and confirm the deployed environment (D's) matches main.

### Block A5 (hours 20–30)
21. Bug triage owner — you take every integration bug first and route it.
22. Stretch, only if the bug queue is empty: re-teach memory (load prior session's gap map into the new session's Evaluator context; small, contained, high demo value).
23. Hour 27 (CP5): run the stretch merge. Hour 30 (CP6): you drive the demo environment — pre-create the demo sessions, verify pre-cached graphs load, kill switches for anything flaky.

---

## Person B — LLM / Prompts

You have the least infrastructure and the most iteration. Your workflow all weekend: a scratch notebook/script hitting Gemini directly with fixtures — never wait on the app to test a prompt.

### Block B1 (hours 1–4, target: CP1)
1. Write the concept-graph generation prompt against the CP0 schema. Force JSON output (Gemini structured output / response schema).
2. Test on five topics spanning the demo range: TCP congestion control, how HTTPS works, photosynthesis, inflation, binary search trees. Eyeball every graph: are the nodes *probeable*? A node like "history of TCP" is a bad node — delete-worthy. Aim for 8–15 nodes with real prereq edges.
3. Commit the five generated graphs to `/fixtures/graphs/` — these replace A's hand-written fixture and become the demo cache.
4. Establish your eval harness: a script that runs a prompt against N test inputs and dumps results side by side. Crude is fine; you'll run it fifty times this weekend.
5. **CP1 deliverable:** `generateGraph(topic) → ConceptGraph`, exported as a module A can import, plus five vetted cached graphs.

### Block B2 (hours 4–8, target: CP2)
6. Write the Evaluator scoring prompt: input = graph + rolling transcript + latest user utterance; output = verdict JSON per the contract. Key quality bar: the `quote` field must be *verbatim* from the user — test that it never paraphrases (paraphrased "quotes" would poison the gap map's credibility).
7. Write test utterances (10–15) covering: clean correct explanation, vague hand-wave, confidently wrong, multi-concept ramble, off-topic derail. Save them — they're also A's policy test inputs and your Block B4 scripts.
8. Write the Persona prompt per the design doc sketch, with the four guardrails as hard rules: max 2 sentences; no terminology the user hasn't introduced; never confirm correctness; deflect direct factual questions in character.
9. Adversarially attack your own persona for one hour: try to make it teach you, make it leak a term, make it validate a wrong answer. Every break becomes a rule.
10. **CP2 deliverable:** `evaluate(...) → verdict` and `personaReply(transcript, directive) → token stream`, exported for A. Pair with A for the integration.

### Block B3 (hours 8–14, target: CP3)
11. Write the gap-map generation prompt: input = final graph states + collected quotes + dodged list; output = GapMap JSON. The `one_liner` is the star — iterate until it stings correctly ("You understand TCP until a packet actually gets lost"). Generate ten one-liners per session and pick the best via a scoring call if quality is inconsistent.
12. Tune Evaluator for the fast Gemini tier (A needs it quick): trim the prompt, cut the transcript window to the last ~6 turns plus node-state summary. Verify verdict quality survives the trim using your harness.
13. **Spoken-register pass on the Persona:** with voice landing at CP3, replies must sound like speech — contractions, false starts, occasional "wait—". Listen to D's TTS output and tune against the *audio*, not the text.
14. **CP3 deliverable:** gap map generating end-to-end; persona sounds human out of a speaker.

### Block B4 (hours 14–20, target: CP4)
15. Formalize the three adversarial scripts (rambler / confident-wrong / derailer) as full session scripts and run them through the live stack with A. You own conversation quality; A owns policy mechanics; the tuning is joint.
16. Vague-quote quality audit: run five full sessions, read every gap map, fix the embarrassing verdicts. The gap map is the product's proof — it gets the last quality pass before freeze.
17. Freeze your prompts at hour 19: commit final versions with a `PROMPTS_VERSION` constant so any post-freeze change is visible in diff.

### Block B5 (hours 20–30)
18. Stretch (priority order, only if CP4 held): notes/syllabus upload → topic extraction (Gemini file input; strengthens the MLH Gemini story); persona variants (the pedant, the five-year-old — mostly prompt work, pairs with D's voice variants).
19. Hour 30+: you write the Devpost submission (you know the system's story best) and the architecture slide for the demo.

---

## Person C — Frontend

You are unblocked by everyone until CP2, courtesy of the fixtures. Build the whole UI against mocks.

### Block C1 (hours 1–4, target: CP1)
1. Scaffold Next.js + Tailwind. Three routes: `/` (topic picker), `/session/:id` (the classroom), `/session/:id/report` (gap map).
2. Topic picker: text input + five demo-topic cards (from B's cached graphs), student persona intro card ("This is Sam. Sam knows nothing. Teach Sam.").
3. Classroom v1: transcript pane (user right, student left), text input, session-status header. Wire it to A's echo-mode API — this is the CP1 demo.
4. Build the three "student state" indicators you'll need all weekend: *listening*, *thinking* (animated), *speaking*. Fake the transitions for now.
5. **CP1 deliverable:** create session → chat with the fake student, from the browser, deployed on D's environment.

### Block C2 (hours 4–8, target: CP2)
6. SSE consumption: render persona tokens as they stream (this is also D's audio feed later — coordinate the event format with D once, at hour 4, then diverge again).
7. Refresh recovery: on load, `GET /session/:id` and rebuild the transcript. Costs 30 minutes now; saves the demo later.
8. Session-end flow: "wrap up" button → end call → route to report page.
9. Gap map page v1 against the fixture: concept nodes as a color-coded grid (skip fancy graph layouts for v1 — a sorted grid with state colors reads better on a projector anyway), vaguest-moments quote cards, dodged-questions list, the one-liner huge at the top.
10. **CP2 deliverable:** full text-mode session, real backend, ugly-but-complete.

### Block C3 (hours 8–14, target: CP3)
11. Voice UI, built to D's transport: mic button with hold-to-talk *and* auto-VAD toggle (decide with D at CP3 which ships; hold-to-talk is the reliable demo default), live partial-transcript display so the user sees the STT hearing them, audio-playing state on the student avatar.
12. Interruption handling UX: if the user starts talking while the student is speaking, stop playback (D provides the hook), visually yield the floor. Judges will interrupt the student; plan for it.
13. Gap map page v2: the version that goes on the projector. Test it at projector resolution (1280×720, big fonts, high contrast). Screenshot it — this is the Devpost hero image.
14. **CP3 deliverable:** voice session works in the browser end-to-end.

### Block C4 (hours 14–20, target: CP4)
15. Polish pass, strictly in this order: classroom (where judges spend 3 of the 5 minutes) → gap map → topic picker. Empty states, error toasts with in-character copy ("Sam spaced out — try again"), mobile-usable but not mobile-perfect.
16. Auth0 integration with D: login gate, session list per user ("My past students"). Keep it thin — it's an MLH checkbox, not a feature.
17. Freeze: no new components after hour 19; the last hour of the block is bug-fixing only.

### Block C5 (hours 20–30)
18. Stretch: gap map PNG export (html-to-image; it's the shareability story for judges); persona-variant selector UI if B+D ship variants.
19. Hour 30 (CP6): you own the demo *visuals* — projector test in the actual judging room if allowed, font-size pass, and you drive the screen during the pitch while the presenter talks.

---

## Person D — Voice / Infra

You carry the biggest technical risk (latency) and it's front-loaded on purpose.

### Block D1 (hours 1–4, target: CP1)
1. First 30 minutes: keys, `.env.example`, Atlas cluster, Auth0 tenant, and a deployed skeleton (Vercel/Railway/Render — whatever the team knows best; deploy on day one, not day two).
2. **The latency spike — your CP1 headline.** Standalone script, no app: (a) STT paths — Web Speech API in Chrome vs Whisper API on a 10-second clip; measure finalization delay and jargon accuracy on five technical terms ("ssthresh", "TLS handshake"). (b) ElevenLabs — time-to-first-audio via the websocket streaming input endpoint fed token-by-token, vs the plain streaming endpoint fed a full sentence. (c) Gemini fast tier — time-to-first-token on the Evaluator-sized prompt.
3. Produce the one-slide latency budget: STT-final → eval → persona-first-token → first-audio, with measured numbers and the projected total. CP1's two decisions (STT choice, Gemini tier split) get made from this slide.
4. **CP1 deliverable:** the numbers, the decisions, and a deployed hello-world the team pushes to all weekend.

### Block D2 (hours 4–8, target: CP2)
5. Build the TTS client module: takes a text-token stream (A's SSE), feeds ElevenLabs websocket, emits playable audio chunks; exposes `stop()` (interruption hook for C). Test it standalone against fixture persona lines.
6. Pick and configure *the* student voice: audition ~10 ElevenLabs voices against B's persona lines, pick for warmth + slight uncertainty; set stability/similarity settings and document them.
7. STT client module per the CP1 decision, with the jargon-hint mechanism if the chosen path supports it (feed the concept graph's node names as biasing hints).
8. CI/deploy hygiene while you're between voice tasks: main auto-deploys, envs documented, a `make demo` script that seeds the demo sessions. You're the only person allowed to touch prod config — say so out loud at CP2.
9. **CP2 deliverable:** voice modules working standalone (not yet integrated — that's CP3), demo of mic → transcript → canned reply → speaker on your machine.

### Block D3 (hours 8–14, target: CP3)
10. **The integration you own:** wire STT client → A's turn endpoint → SSE → TTS client inside C's session page. You write the glue; C styles around it; A adjusts the endpoint if the seam demands it. Budget the whole block — this is the hardest merge of the weekend.
11. Interruption: user speech during playback → `stop()` + flush ElevenLabs buffer + send the new utterance. Get it right once, here.
12. Latency masks: if measured stop-of-speech → first-audio exceeds ~1.5s, insert pre-generated thinking noises ("hmm," "wait—", soft keyboard tap) selected to match the directive type (PROBE gets a confused "hmm?", DEEPEN gets a curious "oh—"). Pre-render these as audio files at hour 12, not live TTS.
13. **CP3 deliverable:** a spoken session, measured, on the deployed environment — not localhost.

### Block D4 (hours 14–20, target: CP4)
14. Auth0 end-to-end with C (you: tenant, callback URLs, middleware; C: UI).
15. Reliability drills: kill wifi mid-session, deny mic permission, switch audio output mid-playback, two sessions in two tabs. File everything to A's triage list; fix the voice-side ones yourself.
16. ElevenLabs credit audit: project usage for the demo + rehearsals; confirm headroom or set the fallback (browser TTS behind a flag — ugly but demo-saving).
17. Freeze: deployed env tagged and matching main; you own the "it works on prod" sign-off at CP4.

### Block D5 (hours 20–30)
18. Stretch: persona voice variants (pairs with B's prompt variants — the ElevenLabs "personality" rubric line is yours to win); latency polish round two with A's instrumentation data.
19. Hour 30 (CP6): record the backup demo video (full session, clean take, captions), test the venue's audio out — a voice demo with no speakers is a text demo. Bring a wired speaker as backup; hackathon Bluetooth is a coin flip.

---

## Hours 30–36 (everyone)

- Three full demo rehearsals with role assignments: presenter (whoever tells the story best — decide by rehearsal 1), C on screen, D on audio, A on the demo environment. Rehearse both branches: judge-teaches and teammate-teaches.
- B finalizes Devpost writeup; C supplies the gap-map hero screenshot; D uploads the backup video.
- Sleep in shifts of two. A non-negotiable pair is awake from hour 33 to submission: one person watching the deployed environment, one owning the Devpost form (submissions close *before* judging — check the exact cutoff at kickoff and set three alarms).

## If a checkpoint slips

- **CP1 slips:** absorb it — CP2 has slack. Don't reshuffle.
- **CP2 slips past hour 10:** cut `DEEPEN` from the policy (probe-and-advance only) and cut refresh recovery. The text loop must exist by hour 10 or voice integration compresses dangerously.
- **CP3 slips past hour 16:** ship hold-to-talk only, drop interruption handling, keep thinking-noise masks. A slightly stiff voice demo beats a broken fluid one.
- **CP4 is not allowed to slip.** If hour 19 arrives and something's broken, cut the feature, not the freeze. The ranked cut list, safest first: Auth0 UI (keep backend token check for MLH eligibility), refresh recovery, interruption, DEEPEN policy, persona guardrail #4 (deflection). The one thing that is never cut: the gap map with verbatim quotes — it's the product.
