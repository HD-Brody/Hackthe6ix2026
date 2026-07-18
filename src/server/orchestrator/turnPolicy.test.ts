/**
 * Turn policy unit tests. Owner: A (Block A2, step 8).
 * Run: npm test
 *
 * Test inputs: the fixture verdicts + B's test utterances
 * (src/llm/harness/test-utterances.json once B writes them).
 */

import { describe, it } from "vitest";

describe("turnPolicy", () => {
  it.todo("vague verdict, node probed 0 times → PROBE that node");
  it.todo("vague verdict, node already probed twice → ADVANCE");
  it.todo("solid verdict, not yet deepened → DEEPEN");
  it.todo("solid verdict, already deepened → ADVANCE");
  it.todo("ADVANCE respects prereq order");
  it.todo("all nodes visited → WRAP_UP");
});
