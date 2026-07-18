# Professor Me — Design Doc

**One-liner:** You don't study with it. You teach it.

**Concept:** An AI that plays a bright-but-ignorant student. The user explains a topic; the AI probes exactly where the explanation is vague, demands examples where the user gave abstractions, and pushes "but why?" until the user hits the edge of their understanding. At the end, the user gets a gap map: what they explained well, where they hand-waved, and which questions they dodged.

This inverts every AI study tool on the market. Existing tools make the model the tutor and the student a passive recipient, which is the worst-performing study configuration in the learning literature. The Feynman technique (explain it simply to a naive listener) is the best-performing one, and it has no software because it requires a willing, strategically confused listener. That is the product.

Target event: Hack the 6ix 2026, 36 hours, team of up to 4.

---

## 1. Why this wins (track strategy)

Judging criteria mapping for the HT6 main prizes:

| Criterion | How Professor Me scores |
|---|---|
| Technical difficulty | Real-time gap detection against a generated concept graph, dual-model architecture (persona + evaluator), low-latency voice loop. Not a prompt wrapper — the evaluation engine is genuine work. |
| Uniqueness | Education tools recur at every hackathon (lecture-to-quiz, flashcard generators, tutor chatbots) but all are tutor-forward. The inversion is immediately legible as new. No project in the ~600 scraped from 11 recent hackathons does this. |
| Design | The product is a conversation. If the voice loop feels natural and the gap map is beautiful, design scores itself. |
| Completeness | Scoped so the full loop (pick topic → teach → get gap map) works end to end by hour 24. Everything after is polish. |

Sponsor tracks stacked on the same build:

- **ElevenLabs (Best Project Built with ElevenLabs).** Their rubric: agentic depth beyond TTS, low-latency lifelike dialogue, personality prompt engineering, novel use case. A strategically confused student persona with real-time voice is a direct hit on all four. This is the track we are most likely to win.
- **MLH Best Use of Gemini API.** Gemini powers concept-graph generation, the evaluator, and document ingestion (paste lecture notes → teachable topic list). Low marginal effort.
- **MLH Best Use of MongoDB Atlas + Auth0.** Session storage and login. Checkbox tracks; near-zero extra work; each is a separate prize draw.

Explicitly not competing in: Hardware, Environmental, Beginner (exclusive trio — we qualify for none), QNX, Qualcomm.

---

## 2. User flow

1. **Pick a topic.** Type one ("TCP congestion control") or upload notes/a syllabus and pick from extracted topics.
2. **Meet your student.** Short persona intro sets the tone: eager, sharp, knows nothing about this topic, unafraid to say "wait, I don't get it."
3. **Teach.** Voice-first (mic + ElevenLabs voice out), with a text fallback. The student interrupts naturally: asks for examples, feigns confusion at the weakest point, asks "why?" one level deeper each time the user succeeds.
4. **Session ends** (user ends it, or the student runs out of curiosity after all concepts are probed).
5. **Gap map.** A visual report: concept-by-concept coverage (explained well / hand-waved / dodged / never mentioned), the three hardest questions the user faced, direct quotes of their own vaguest moments, and a suggested re-teach list.
6. **Re-teach loop** (stretch): the student "remembers" the last session and opens with "last time you couldn't explain X — try me again."

---

## 3. System architecture

```
Browser (Next.js + React)
  ├─ Mic capture → STT (Web Speech API primary, Whisper API fallback)
  ├─ Audio playback ← ElevenLabs streaming TTS
  └─ Session UI: transcript, "student is thinking" states, gap map view

API server (Next.js API routes or FastAPI — team's choice)
  ├─ Session Orchestrator (state machine)
  ├─ Concept Graph Service (Gemini)
  ├─ Student Persona Engine (Gemini, persona-prompted)
  ├─ Evaluator (Gemini, separate context)
  └─ Gap Map Generator

MongoDB Atlas
  └─ users, sessions, concept graphs, utterances, scores

Auth0 → login
```

### 3.1 The dual-model design (core decision)

One model cannot credibly do this job alone. A single prompt saying "act confused but probe intelligently" collapses into one of two failure modes: it either reveals knowledge it should not have (breaking the ignorant-student fiction) or it becomes genuinely useless (random confusion instead of strategic confusion).

So the system splits the brain:

- **The Evaluator** knows the truth. At session start it generates a concept graph for the topic (see 3.2). On every user utterance it scores which concepts were addressed and how well: correct, vague, wrong, or skipped. It never talks to the user.
- **The Student Persona** knows nothing about the topic. It receives only: the conversation so far, its persona instructions, and a *directive* from the orchestrator such as "the user just hand-waved the retransmission timer — express confusion about what happens when a packet is lost" or "coverage of concept 4 was solid — advance with a why-question one level deeper." It converts directives into natural, in-character speech.

The Evaluator is the strategist; the Persona is the actor. The user only ever meets the actor. This is also the honest answer to the inevitable judge question "isn't this just a system prompt?" — no, and here is the architecture diagram.

### 3.2 Concept graph

On topic selection, the Evaluator generates a graph of 8–15 concept nodes: name, one-line ground truth, difficulty tier, prerequisite edges, and 2–3 canned probe angles per node (ask-for-example, ask-why, ask-edge-case). This graph is the session's single source of truth and the skeleton of the final gap map.

Per-node state during the session: `unvisited → touched → vague | solid | wrong | dodged`. "Dodged" is set when the student asked directly and the user deflected or changed the subject — this is the report's most memorable category.

Generation is one Gemini call with a strict JSON schema. Cache aggressively: pre-generate graphs for the 5 demo topics so the live demo never waits on this call.

### 3.3 Turn loop

Per user utterance:

1. STT finalizes the transcript segment.
2. Evaluator scores it against the concept graph (which nodes touched, quality verdict, notable vague quote if any). Single structured-output call.
3. Orchestrator picks the next move via a simple policy: if the last explanation was vague → probe it (confusion directive); if solid → deepen (why-directive) or advance to the next unvisited prerequisite-satisfied node; if the same node has been vague twice → mark it, move on (don't trap the user in a loop); if all nodes visited → wind down.
4. Persona converts the directive to speech; ElevenLabs streams audio.

Latency budget: the loop is two sequential LLM calls plus TTS. Mitigations: run the Evaluator on the *previous* utterance while the user is still talking (people talk in paragraphs — use that time); stream the Persona's text into ElevenLabs' streaming endpoint so audio starts before the full reply is generated; use a fast Gemini tier for the Evaluator. Target: first audio within ~1.5s of the user stopping. If it degrades, insert thinking noises ("hmm, wait—") as latency masks; for a confused student, hesitation is in character. This is the rare product where latency jank can be costumed as personality, but do not lean on that in the live demo — measure and hit the budget.

### 3.4 Gap map

End-of-session artifact, and half the demo's punch. Contents:

- Concept graph rendered with node states color-coded (solid / vague / wrong / dodged / never reached).
- "Your three vaguest moments" — direct transcript quotes with the concept they failed to nail.
- "Questions you dodged" — verbatim.
- A re-teach list ordered by prerequisite depth.
- A single overall line calibrated to sting productively: "You understand TCP until a packet actually gets lost."

Generated as one Evaluator call over the accumulated node states plus flagged quotes. Rendered as a shareable page (nice-to-have: PNG export — people posting their gap maps is the growth loop, say so to judges).

---

## 4. Data model (MongoDB)

```
users        { _id, auth0_id, name }
sessions     { _id, user_id, topic, concept_graph_id, started_at, ended_at,
               status, gap_map: {...} }
conceptGraphs{ _id, topic, nodes: [{ id, name, truth, difficulty, prereqs[],
               probes[], state, vague_quotes[] }] }
utterances   { _id, session_id, role: user|student, text, ts,
               eval: { nodes_touched[], verdicts[], notable_quote } }
```

Everything else lives in memory during the session; persist per turn so a refresh doesn't kill a demo.

---

## 5. Prompt design sketches

**Evaluator — concept graph generation.** "You are designing an oral-exam blueprint for TOPIC at the level of a strong undergraduate. Produce 8–15 concepts as JSON per this schema… For each concept include the ground truth in one sentence and probe angles a skeptical examiner would use."

**Evaluator — utterance scoring.** "Here is the concept graph with current states, and the user's latest explanation. Return JSON: nodes touched, verdict per node (solid/vague/wrong), the single vaguest sentence quoted verbatim if any, and a recommended next directive from: PROBE(node), DEEPEN(node), ADVANCE(node), WRAP_UP."

**Persona.** "You are Sam, a sharp first-year who has never studied TOPIC. You are being taught by the user. You never explain the topic yourself; you only react, ask, and get confused. You have one instruction from your inner monologue this turn: DIRECTIVE. Express it naturally in 1–2 sentences, spoken register, occasional filler words. Never mention directives, evaluators, or that you are an AI student."

Persona guardrails that matter in practice: hard cap on reply length (a student who monologues is a tutor), a rule against introducing terminology the user hasn't used yet (the #1 way the fiction breaks), and a "never confirm correctness" rule — the student can be satisfied, but only the gap map renders verdicts. That last one also protects against the persona sycophantically validating wrong explanations.

**Anti-derail rule.** If the user asks the student a direct factual question ("wait, do YOU know what a SYN packet is?"), the persona deflects in character: "No idea — that's why you're teaching me. What is it?" This keeps users from flipping the tool back into a tutor.

---

## 6. Scope: MVP vs stretch

**MVP (must exist by hour 24):**
- Text-mode full loop: topic → graph → teach via chat → gap map.
- Voice layer on top: STT in, ElevenLabs streaming out.
- 5 pre-cached demo topics + arbitrary topic support.
- Gap map page with quotes and color-coded graph.
- Auth0 login, sessions in Atlas.

**Stretch (hours 24–33, in priority order):**
1. Latency polish + thinking-noise masks (this is the ElevenLabs judging surface — highest priority stretch).
2. Notes/syllabus upload → topic extraction (Gemini file understanding; strengthens the MLH Gemini entry).
3. Re-teach memory ("last time you couldn't explain X").
4. Persona variety (the pedant, the five-year-old, the hostile TA) — cheap, demo-funny, and directly feeds ElevenLabs' "personality prompt engineering" criterion via distinct voices.
5. Gap map PNG export.

**Explicitly out of scope:** mobile app, multi-user classrooms, spaced-repetition scheduling, any tutor mode. If someone proposes adding a "hint" feature, that is the tutor leaking back in — reject it.

---

## 7. 36-hour build plan (team of 4)

| Hours | Person A (backend/orchestrator) | Person B (LLM/prompts) | Person C (frontend) | Person D (voice/infra) |
|---|---|---|---|---|
| 0–2 | Repo, API skeleton, Atlas + Auth0 | Concept-graph prompt, schema, test on 3 topics | Next.js scaffold, session UI shell | ElevenLabs + STT spike: measure real latency |
| 2–8 | Orchestrator state machine, turn loop | Evaluator scoring prompt, verdict quality iteration | Chat transcript UI, session states | Streaming TTS pipeline, audio player |
| 8–14 | Persist per-turn, session lifecycle | Persona prompt + guardrails, directive vocabulary | Gap map page v1 | Wire voice into turn loop |
| 14–20 | Policy tuning (probe/deepen/advance) | Adversarial testing: ramblers, wrong-but-confident users, derailers | Gap map polish, quotes rendering | Latency: parallel eval, masks |
| 20–24 | **Integration freeze: full loop demo internally** | | | |
| 24–30 | Bug triage | Stretch 2 (notes upload) | Stretch 5 (export), visual polish | Stretch 1 (latency), Stretch 4 (personas/voices) |
| 30–33 | Demo script rehearsal ×3, pre-cache demo topics, record backup video | | | |
| 33–36 | Sleep in shifts; Devpost writeup; freeze | | | |

The hour-20 integration freeze is the plan's load-bearing wall. Every scraped hackathon graveyard is full of projects that integrated at hour 30.

---

## 8. Demo script (5 minutes)

1. **(30s) Frame it:** "Every AI study tool makes the AI the professor. The research says that's backwards. So we made you the professor."
2. **(2m) The hook — a judge teaches.** Offer the judge a topic menu including one thing they plausibly half-know (how HTTPS works, how inflation works). They explain; the student catches the first hand-wave within ~90 seconds. The laugh in the room is the demo.
3. **(1m) The gap map.** Their dodged questions, verbatim, on screen. "You understand HTTPS until the certificate has to be verified."
4. **(1m) Architecture slide:** dual-model design, concept graph, latency numbers. This is where Technical Difficulty points get collected — say the numbers out loud.
5. **(30s) Tracks + growth:** ElevenLabs voice loop, Gemini everywhere, shareable gap maps as the viral loop.

Backup plan: a recorded session video plus one pre-cached topic path in case wifi or a judge's shyness kills the live segment. Rehearse the judge-declines-to-participate branch — a teammate teaches instead, and picks the topic they rehearsed being bad at.

---

## 9. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Voice latency feels broken | Medium | Streaming TTS, parallel evaluation, thinking-noise masks, measured budget from hour 0 (Person D's first task exists precisely to surface this on day one) |
| Persona breaks character (leaks knowledge) | High without work | Guardrail rules in prompt, no-new-terminology rule, adversarial test block at hours 14–20 |
| Evaluator verdicts are wrong → gap map loses credibility | Medium | Keep verdicts coarse (4 states, not scores), quote the user verbatim so evidence is self-validating, human-check on 5 demo topics |
| User rambles across 6 concepts in one breath | Certain | Evaluator scores multi-node per utterance by design; orchestrator picks one thread to pull |
| Judge refuses to participate in demo | Medium | Rehearsed teammate branch |
| "It's just ChatGPT with a prompt" objection | Medium | Architecture slide + the live gap map, which a single prompt demonstrably cannot produce |
| STT mangles technical terms | Medium | Feed the concept graph's vocabulary as STT hints where the API allows; text fallback always visible |

---

## 10. Open questions to settle before hour 0

- Gemini tier split: fast model for the Evaluator's per-turn scoring vs. a stronger one for graph generation and the final gap map. Decide from the hour-0 latency spike, not from vibes.
- Web Speech API vs Whisper for STT: Web Speech is free and instant but Chrome-only and flaky on jargon; spike both in hour 1.
- One ElevenLabs voice or persona-differentiated voices from the start (cost: credits and config time; benefit: track rubric).
