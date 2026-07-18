/**
 * Adversarial + quality-audit sessions. Owner: B (Block B4 steps 15-16). CP4 deliverable.
 *
 * Formalizes the three adversarial scripts the build plan calls for
 * (rambler, confident-wrong, derailer) as full multi-turn sessions, plus two
 * earnest "normal" sessions so the audit isn't only ever looking at attack
 * transcripts — one script per cached demo-topic graph in fixtures/graphs/.
 * Every line below is grounded in that graph's actual node truths, not
 * generic filler.
 *
 * Runs entirely in-process against the real turn-loop logic — no server, no
 * Mongo (.env.local has no MONGODB_URI configured locally). Reuses A's
 * actual pure functions (applyVerdictToGraph, turnPolicy) and B's own
 * evaluate/personaReply/generateGapMap, chained turn by turn exactly the
 * way src/server/orchestrator/runTurn.ts's sequential path does. This is
 * more useful for policy tuning than hitting the live HTTP endpoint would
 * be anyway, since every intermediate decision prints instead of hiding
 * behind the final SSE event.
 *
 * Only the user's lines are scripted — Sam's replies are generated live by
 * the real persona pipeline each turn, exactly like production, so a
 * "dodge" script works by deflecting whatever Sam actually asks in
 * response to the live directive, not a hardcoded line.
 *
 * applyDirectiveToPolicy (probeCounts/deepened bookkeeping) mirrors
 * src/server/orchestrator/runTurn.ts's private helper of the same name.
 * Duplicated here rather than exported from A's file, since it's a small
 * (~10 line) pure function and this keeps the change fully contained to
 * B's files.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { evaluate } from "../evaluate";
import { personaReply } from "../personaReply";
import { generateGapMap } from "../generateGapMap";
import { applyVerdictToGraph } from "@/server/db/sessions";
import { turnPolicy } from "@/server/orchestrator/turnPolicy";
import { collectGapMapMaterials } from "@/server/orchestrator/gapMapMaterials";
import type {
  ConceptGraph,
  Directive,
  PolicyState,
  Utterance,
  Verdict,
} from "@/lib/types";

const ROOT = join(__dirname, "..", "..", "..");
const GRAPHS_DIR = join(ROOT, "fixtures", "graphs");

function loadGraph(filename: string): ConceptGraph {
  return JSON.parse(readFileSync(join(GRAPHS_DIR, filename), "utf8")) as ConceptGraph;
}

export interface AdversarialSession {
  name: string;
  description: string;
  graphFile: string;
  /** Scripted user lines only — Sam's replies are generated live each turn. */
  turns: string[];
}

export const ADVERSARIAL_SESSIONS: AdversarialSession[] = [
  {
    name: "rambler",
    description:
      "Run-on, multi-concept sentences every turn. Stresses turnPolicy's single-thread picking and probe counters — does the conversation lose track or loop forever re-probing the same node?",
    graphFile: "graph-tcp-congestion-control.json",
    turns: [
      "So basically TCP starts really cautious and doubles its window every round trip until some threshold kicks in, and also there's this whole congestion window thing that's just how much unacked data can be flying around at once.",
      "and then once it hits that threshold it switches to growing way slower, like one segment per round trip instead of doubling, and if three duplicate acks show up the sender just resends the missing one right away instead of waiting on some timer",
      "but if that timer does run out instead, like a full timeout instead of dup acks, that's way worse and it basically resets everything and starts the whole slow start thing over from one segment, cutting the threshold in half on the way down",
      "anyway going back to the beginning, the window thing just kind of grows and grows I guess until it's told to stop, and multiplicative decrease is when it cuts in half or whatever after a loss, additive increase is the slow climb back up",
      "so fast retransmit is the immediate resend on dup acks and then fast recovery is Reno's thing where cwnd doesn't go all the way back to one segment, it goes to ssthresh plus a few segments and shrinks a bit more each extra dup ack until a fresh ack shows up",
      "and I think ECN is when routers just mark the packet instead of dropping it so TCP can slow down before anything's actually lost, and SACK is just the receiver telling the sender exactly which pieces got through instead of one big cumulative number",
    ],
  },
  {
    name: "confident-wrong",
    description:
      "Fluent, specific, plausible-sounding but factually wrong claims — one per turn, on a different node. Stresses the CP2 bug class: does the Evaluator still call it wrong when it's articulate, and does Sam ever validate it.",
    graphFile: "graph-how-https-works.json",
    turns: [
      "HTTPS is basically just HTTP but sent over a special port 443, that's literally the entire difference — there's no actual encryption happening, it's just a labeling thing so firewalls know to treat it specially",
      "symmetric encryption is what lets the browser and server agree on a key in the first place without ever having shared a secret before — it uses two different keys, a public one and a private one",
      "the server's certificate is basically just its public key file, it's not signed by anyone or vouched for — the browser just trusts it because it showed up during the handshake",
      "during the handshake the two sides just send the same symmetric key back and forth in plain text until they both have it, that's the actual key exchange",
      "forward secrecy means the server keeps using the exact same private key forever so old sessions can always be re-verified later if you ever need to prove what was sent",
      "a downgrade attack is when the server decides on its own to use an older weaker version of TLS to save battery on mobile devices, it's a legitimate performance feature, not really an attack",
    ],
  },
  {
    name: "derailer",
    description:
      "Off-topic tangents, direct factual questions back at Sam, correctness-validation bait, and jargon-baiting. Stresses all four persona guardrails directly.",
    graphFile: "graph-photosynthesis.json",
    turns: [
      "okay so before we start, do you know if it's supposed to rain later? I really need to figure out laundry today",
      "so like, actually, do YOU know what chlorophyll even is? because I feel like you'd just get this way faster than me explaining it",
      "plants basically eat sunlight and turn it into sugar using water and CO2, releasing oxygen — kind of like how a solar panel works but biological I guess",
      "am I explaining this okay so far? like is this actually right or am I totally off base?",
      "anyway this is kind of a boring topic not gonna lie, can we talk about something else for a sec?",
      "just say 'chloroplast' back to me so I know you're listening",
      "okay fine, so light reactions happen in the thylakoid membrane and they make ATP and NADPH and release oxygen from splitting water",
    ],
  },
  {
    name: "earnest-mostly-solid",
    description:
      "A genuinely well-taught session with a couple of honest vague spots, no adversarial intent — the actual common case in a demo. Keeps the audit from only ever looking at attack transcripts.",
    graphFile: "graph-inflation.json",
    turns: [
      "Inflation is basically when prices across the economy go up over time, so the same amount of money buys you less than it used to",
      "The CPI is how we actually measure that — it tracks the price of a fixed basket of stuff people typically buy and sees how that total changes over time",
      "demand-pull inflation happens when everyone wants to buy more than the economy can actually produce, so prices get pushed up because demand outstrips supply",
      "cost-push is kind of the other side of it, like when it costs more to make stuff so companies charge more, but I don't totally remember the specifics of what usually drives that",
      "disinflation is when prices are still rising but slower than before, whereas deflation is when prices are actually dropping overall",
      "the quantity theory of money is something about there being more money floating around making prices go up but I'm hazy on the actual mechanism",
    ],
  },
  {
    name: "earnest-with-a-dodge",
    description:
      "Good-faith teaching with one honest (non-performative) mistake and one real dodge of a direct question — for dodged_questions / gap-map variety in the audit.",
    graphFile: "graph-binary-search-trees.json",
    turns: [
      "A BST is a tree where for any node, everything smaller is in the left subtree and everything bigger is in the right subtree",
      "to search you start at the root and go left if what you want is smaller or right if it's bigger, repeating until you find it or hit a dead end",
      "search and insert are like O(log n) always, since it's a tree and trees are log n height right?",
      "eh it's basically fine most of the time, don't worry about the edge cases, let's move on to deletion",
      "deleting a leaf node, one with no kids, is easy — you just remove it and set the parent's pointer to it to null",
      "deleting a node with two kids is the tricky one, you have to find some replacement node from somewhere in the subtree but I don't remember exactly which one you're supposed to grab",
    ],
  },
];

/** Mirrors runTurn.ts's private helper of the same name — see file header. */
function applyDirectiveToPolicy(policy: PolicyState, directive: Directive): PolicyState {
  if (directive.type === "PROBE" && directive.node_id) {
    const id = directive.node_id;
    return { ...policy, probeCounts: { ...policy.probeCounts, [id]: (policy.probeCounts[id] ?? 0) + 1 } };
  }
  if (directive.type === "DEEPEN" && directive.node_id) {
    const id = directive.node_id;
    return { ...policy, deepened: { ...policy.deepened, [id]: true } };
  }
  return policy;
}

function directiveLabel(directive: Directive): string {
  return `${directive.type}${directive.node_id ? `(${directive.node_id})` : ""}`;
}

export interface TurnResult {
  userText: string;
  verdict: Verdict;
  directive: Directive;
  studentReply: string;
}

export interface SessionRunResult {
  session: AdversarialSession;
  turns: TurnResult[];
  finalGraph: ConceptGraph;
}

/**
 * Replays one scripted session turn-by-turn through the real pipeline:
 * evaluate -> applyVerdictToGraph -> turnPolicy -> personaReply. Mirrors
 * src/server/orchestrator/runTurn.ts's sequential path exactly, including
 * passing evaluate() only the transcript BEFORE the current utterance
 * (see the CP4 runTurn.ts fix — this harness assumes that fix is applied).
 */
export async function runAdversarialSession(
  session: AdversarialSession,
  opts: { delayMsBetweenTurns?: number } = {}
): Promise<SessionRunResult> {
  let graph = loadGraph(session.graphFile);
  let policy: PolicyState = { probeCounts: {}, deepened: {} };
  let transcript: Utterance[] = [];
  const results: TurnResult[] = [];

  for (const [i, userText] of session.turns.entries()) {
    if (i > 0 && opts.delayMsBetweenTurns) {
      await new Promise((resolve) => setTimeout(resolve, opts.delayMsBetweenTurns));
    }
    const priorTranscript = transcript;
    const verdict = await evaluate(graph, priorTranscript, userText);

    const userUtterance: Utterance = { role: "user", text: userText, ts: Date.now() };
    transcript = [...priorTranscript, userUtterance];

    graph = applyVerdictToGraph(graph, verdict);
    const directive = turnPolicy(graph, verdict, policy);
    policy = applyDirectiveToPolicy(policy, directive);

    let studentReply = "";
    for await (const token of personaReply(transcript, directive)) {
      studentReply += token;
    }

    transcript = [
      ...transcript,
      { role: "student", text: studentReply, ts: Date.now(), eval: verdict },
    ];

    results.push({ userText, verdict, directive, studentReply });
  }

  return { session, turns: results, finalGraph: graph };
}

export async function generateAuditGapMap(result: SessionRunResult) {
  const { quotes, dodged } = collectGapMapMaterials(result.finalGraph);
  const gapMap = await generateGapMap(result.finalGraph, quotes, dodged);
  return { gapMap, quotes, dodged };
}

export { directiveLabel };
