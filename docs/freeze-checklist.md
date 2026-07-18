# Freeze checklist — CP4 / hour 19

**Owner at freeze:** Person A drives the merge + tag. Person D owns prod config and “it works on prod” sign-off. Whole team present for the 15-minute merge window.

**Rule:** Nothing new enters `main` after this except stretch branches at CP5. If something is broken at hour 19, **cut the feature, not the freeze.** Ranked cut list (safest first): Auth0 UI → refresh recovery → interruption → DEEPEN policy → persona guardrail #4. **Never cut:** gap map with verbatim quotes.

**Done when:** someone who wasn’t in the room can finish this doc top-to-bottom without Slack.

---

## 0. Who must be present

| Role | Person | Job in this window |
|---|---|---|
| A | Backend / orchestrator | Runs merge order, tags `v1-freeze`, writes demo session IDs |
| B | LLM / prompts | Confirms `PROMPTS_VERSION` committed; no prompt edits after tag |
| C | Frontend | Confirms UI on prod against live API; no new components after tag |
| D | Voice / infra | Confirms Vercel env vars, redeploys if needed, signs off prod |

Meet in one call / one desk. Do not merge solo.

---

## 1. Pre-merge gates (before any merge)

Run locally against a server with **real** Gemini (not echo, not mock):

```bash
# .env.local for local gates
ECHO_MODE=false
LLM_MOCK=false
PARALLEL_EVAL=true

npm test
npm run drill:real          # seam + gap map
npm run drill:wrapup        # WRAP_UP → wrapping → /end
npm run crash-drill         # orphan lock recovery
```

All four must be green (soft flags to B are OK; hard failures are not).

Optional but recommended:

```bash
npm run drill:adversarial   # rambler / confident-wrong / derailer projector gap maps
```

---

## 2. Hour-19 merge order (A → B → C → D)

`main` must stay demoable. Merges happen **only in this order**, with the whole team watching.

### 2.1 Sync

```bash
git fetch origin
git checkout main
git pull origin main
```

### 2.2 Merge Person A (`a/orchestrator`)

```bash
git merge --no-ff origin/a/orchestrator -m "merge(a): orchestrator freeze"
npm test
git push origin main
```

Wait for Vercel production deploy of this commit to finish before continuing.

### 2.3 Merge Person B (`b/prompts`)

```bash
git merge --no-ff origin/b/prompts -m "merge(b): prompts freeze"
# B confirms PROMPTS_VERSION is bumped if any prompt changed this block
npm test
git push origin main
```

Wait for deploy.

### 2.4 Merge Person C (`c/frontend`)

```bash
git merge --no-ff origin/c/frontend -m "merge(c): frontend freeze"
npm test
npm run build
git push origin main
```

Wait for deploy. C opens prod in a browser and confirms topic picker → classroom → report routes load.

### 2.5 Merge Person D (`d/voice`)

```bash
git merge --no-ff origin/d/voice -m "merge(d): voice freeze"
npm test
npm run build
git push origin main
```

Wait for deploy. D confirms mic → STT → turn → TTS path once on prod (or hold-to-talk demo path if that’s what shipped).

### 2.6 If a merge conflicts

- Fix **in the branch being merged**, not with drive-by edits on `main`.
- Re-run `npm test` + the relevant drill before pushing.
- Do **not** skip ahead to the next person.

---

## 3. Tag `v1-freeze`

After D’s merge is on `main` and the matching Vercel production deploy is live:

```bash
git checkout main
git pull origin main
git log -1 --oneline          # note the SHA — this is the freeze commit

git tag -a v1-freeze -m "CP4 freeze — feature-complete MVP"
git push origin v1-freeze
```

Verify:

```bash
git rev-parse v1-freeze
git rev-parse origin/main     # must match (or be the tagged SHA)
```

Paste the tag SHA into the team channel. Post-freeze code changes require unanimous agreement (CP6 rules apply early).

---

## 4. Prod env matches `main`

**Prod URL:** use `PROD_BASE_URL` from `.env.example` / Vercel (currently `https://hackthe6ix2026.vercel.app` — confirm in Vercel dashboard if redirects changed).

**Owner:** D opens Vercel → Project → Settings → Environment Variables → **Production**.

### 4.1 Required production env checklist

Tick every row. Values must be **set** (non-empty) unless noted.

| Variable | Freeze value / notes |
|---|---|
| `MONGODB_URI` | Atlas URI (same cluster the team has been using) |
| `MONGODB_DB` | `professor_me` |
| `GEMINI_API_KEY` | Live key **or** Vertex path below |
| `GEMINI_MODEL_FAST` | e.g. `gemini-2.5-flash` / `flash-lite` (match what drills used) |
| `GEMINI_MODEL_STRONG` | e.g. `gemini-2.5-flash` or `pro` |
| `GOOGLE_GENAI_USE_VERTEXAI` | `true` if billing via GCP; else `false` |
| `GOOGLE_CLOUD_PROJECT` | Required if Vertex = true |
| `GOOGLE_CLOUD_LOCATION` | e.g. `us-central1` if Vertex = true |
| `ELEVENLABS_API_KEY` | Server TTS key |
| `ELEVENLABS_VOICE_ID` | Chosen student voice |
| `NEXT_PUBLIC_ELEVENLABS_TTS_KEY` | Browser restricted TTS key (if C/D wired client TTS) |
| `APP_BASE_URL` | Production site URL (https, no trailing slash) |
| `AUTH0_*` | Set if Auth0 shipped; else leave empty and confirm login is not required for demo |
| `ECHO_MODE` | **`false`** for real demo (see kill switches to flip) |
| `LLM_MOCK` | **`false`** |
| `PARALLEL_EVAL` | **`true`** (shipped decision 2026-07-18) |
| `BROWSER_TTS_FALLBACK` | `false` until ElevenLabs dies (see kill switches) |
| `MAX_TURNS_PER_SESSION` | `40` |
| `MAX_SESSIONS_PER_USER` | Raise for demo day if many rehearsal sessions under `user_id=dev` (e.g. `200`) |
| `MOCK_*` | Irrelevant when `LLM_MOCK=false`; leave defaults |

After any env change: **Redeploy** production (Vercel → Deployments → Redeploy) so serverless functions pick up new values.

### 4.2 Automated prod SSE check

```bash
# From repo root; override URL if needed
PROD_BASE_URL=https://hackthe6ix2026.vercel.app npm run prod-sse-drill
PROD_BASE_URL=https://hackthe6ix2026.vercel.app npm run prod-sse-drill -- --curl
```

Expect: `PASS`, `text/event-stream`, ≥2 token events, `done` event present.

If this fails: **stop the freeze**. Do not tag until SSE streams on prod. (A owns the turn route; D owns the Vercel project.)

### 4.3 One manual prod session (human, 5 minutes)

1. Open `PROD_BASE_URL` in Chrome.
2. Create a session for **TCP congestion control** (demo card or exact topic string).
3. Send **2–3** teaching turns (text is enough if voice is flaky).
4. Confirm: student tokens stream; no 500/409 loop; `done` eventually arrives.
5. Click wrap-up / call `POST /api/session/:id/end`.
6. Confirm gap map page shows **one_liner** + at least one quote or node state.

Record:

```
Prod session ID: ________________________________
One-liner: _______________________________________
Verified by: _____________  Time: _______________
```

---

## 5. Demo session pre-creation

### 5.1 Seed fixture topics into Atlas (D’s script)

```bash
npm run seed-demo
```

This upserts the 5 demo graphs into Mongo collection `demo_topics`. Safe to re-run.

**Note:** Live `POST /api/session` resolves graphs from **bundled** `fixtures/graphs/*` (not `demo_topics`). Seeding is still required for D’s demo inventory / any tooling that reads `demo_topics`. Session create below is what the live demo uses.

### 5.2 Pre-create teaching sessions on **production**

Run against prod (not localhost). Save IDs in the table — A or D pastes into the demo runbook / Devpost notes.

```bash
PROD="${PROD_BASE_URL:-https://hackthe6ix2026.vercel.app}"

for TOPIC in \
  "TCP congestion control" \
  "how HTTPS works" \
  "photosynthesis" \
  "inflation" \
  "binary search trees"
do
  echo "=== $TOPIC ==="
  curl -s -X POST "$PROD/api/session" \
    -H "Content-Type: application/json" \
    -d "{\"topic\":\"$TOPIC\"}" | tee /tmp/session.json
  echo
  # macOS: jq optional
  python3 -c "import json; d=json.load(open('/tmp/session.json')); print('session_id=', d.get('session_id')); print('nodes=', len(d.get('graph',{}).get('nodes',[])))"
done
```

### 5.3 Demo session ID card (fill at freeze)

| Topic | `session_id` | Nodes | Open URL |
|---|---|---|---|
| TCP congestion control | | | `$PROD/session/<id>` |
| how HTTPS works | | | |
| photosynthesis | | | |
| inflation | | | |
| binary search trees | | | |

**Rehearsal tip:** Prefer opening a **pre-created** TCP session during the live demo so graph resolve is instant and cold-start risk is lower. Create a **fresh** spare TCP session as backup.

### 5.4 Confirm cached graphs (no Gemini on topic pick)

```bash
PROD="${PROD_BASE_URL:-https://hackthe6ix2026.vercel.app}"
curl -s -X POST "$PROD/api/session" \
  -H "Content-Type: application/json" \
  -d '{"topic":"TCP congestion control"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); assert len(d['graph']['nodes'])>=8; print('ok', d['session_id'], len(d['graph']['nodes']), 'nodes')"
```

Should return quickly with ≥8 nodes. If it hangs or returns 500, check Gemini/Vertex env — demo topics should not need a live generate call.

---

## 6. Kill switches (demo day)

Flip these on **Vercel Production** env, then **Redeploy** (or wait for the next deploy). Say the switch out loud so A/C/D stay aligned.

### 6.1 `ECHO_MODE=true` — Gemini is on fire / quota / persona broken

**What it does:** Turn route streams canned persona lines + fixture verdict. No `evaluate` / `personaReply` Gemini calls.

**Procedure:**

1. Vercel → Production env → set `ECHO_MODE` = `true`.
2. Redeploy production.
3. Smoke: `npm run prod-sse-drill` (tokens still stream).
4. Tell the presenter: “Sam is on rails — conversation is canned; still show the gap map path if `/end` works with fixtures.”
5. After the crisis: set `ECHO_MODE=false`, redeploy, run one manual prod turn.

### 6.2 `BROWSER_TTS_FALLBACK=true` — ElevenLabs credits / TTS down

**What it does:** Client uses browser speech synthesis instead of ElevenLabs (D/C wiring). Ugly but audible.

**Procedure:**

1. Set `BROWSER_TTS_FALLBACK` = `true` on Production (and ensure the client reads this flag / `NEXT_PUBLIC_` equivalent if that’s how D shipped it).
2. Redeploy.
3. C verifies student audio still plays in Chrome.
4. Presenter line: “Voice is on device fallback — content is what matters.”

### 6.3 Sequential fallback — `PARALLEL_EVAL=false` or per-turn `parallel_eval: false`

**What it does:** Disables one-turn-lag parallel eval. Persona waits for evaluate → policy → reply. Higher perceived latency; safer if parallel feels “one beat behind” on stage.

**Server-wide:**

1. Set `PARALLEL_EVAL` = `false` on Production.
2. Redeploy.

**Per request (no redeploy)** — if C can toggle or you curl:

```bash
curl -sN -X POST "$PROD/api/session/$SESSION_ID/turn" \
  -H "Content-Type: application/json" \
  -d '{"user_text":"Slow start doubles the window each RTT.","parallel_eval":false}'
```

**Presenter line:** “We’re on sequential mode for stability.”

### 6.4 Kill-switch decision tree (30 seconds)

```
Gemini / persona melting down?     → ECHO_MODE=true
ElevenLabs silent / out of credit? → BROWSER_TTS_FALLBACK=true
Sam feels one-turn behind / lag?   → PARALLEL_EVAL=false
Everything fine?                   → leave ECHO_MODE=false, LLM_MOCK=false, PARALLEL_EVAL=true
```

---

## 7. Freeze sign-off (all four initial)

| Check | Owner | Initials / time |
|---|---|---|
| Merges A→B→C→D complete on `main` | A | |
| Tag `v1-freeze` pushed | A | |
| Vercel Production env checklist complete | D | |
| `prod-sse-drill` PASS | A/D | |
| Manual prod session OK (ID recorded) | C/D | |
| `seed-demo` run + 5 session IDs filled | A/D | |
| Kill-switch owners know the three flips | All | |
| B: prompts frozen (`PROMPTS_VERSION`) | B | |
| C: no new UI after this | C | |

**Freeze declared by:** _______________ **at:** _______________

---

## 8. After freeze

- Stretch only on branches; merge at CP5 only if **done**.
- Bugfixes: unanimous agreement; prefer revert over clever patches.
- A is bug-triage owner — every integration bug goes to A first.
- Rehearse both demo branches: judge-teaches and teammate-teaches, using a **pre-created** TCP session ID from §5.3.
