import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSTTClient, type STTClient } from "./sttClient";

/**
 * Minimal fake of the browser SpeechRecognition API — just enough surface for
 * sttClient.ts to drive: continuous/interimResults/lang property assignment,
 * start()/abort(), and the onresult/onerror/onend handler slots it sets.
 * There's no jsdom dependency in this project, so `window` is stubbed directly
 * on globalThis rather than pulling in a full DOM environment.
 */
class FakeSpeechRecognition {
  continuous = false;
  interimResults = false;
  lang = "";
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  aborted = false;

  constructor() {
    fakeInstances.push(this);
  }

  start() {
    this.aborted = false;
  }

  abort() {
    this.aborted = true;
  }
}

let fakeInstances: FakeSpeechRecognition[] = [];

/**
 * Builds a fake SpeechRecognitionEvent carrying exactly the "new" results
 * starting at resultIndex — matching how the real browser API reports them
 * (event.results is the full cumulative list; event.resultIndex marks where
 * this event's new entries begin). Entries before resultIndex are never read
 * by sttClient.ts, so they're padded with null.
 */
function resultEvent(
  entries: Array<{ transcript: string; isFinal: boolean }>,
  resultIndex: number
) {
  const results: unknown[] = new Array(resultIndex).fill(null);
  for (const entry of entries) {
    results.push({ 0: { transcript: entry.transcript }, isFinal: entry.isFinal, length: 1 });
  }
  return { resultIndex, results };
}

function latestRecognition(): FakeSpeechRecognition {
  const instance = fakeInstances[fakeInstances.length - 1];
  if (!instance) throw new Error("No FakeSpeechRecognition instance was created — did start() run?");
  return instance;
}

describe("createSTTClient — silence-grace debounce", () => {
  let stt: STTClient;

  beforeEach(() => {
    vi.useFakeTimers();
    fakeInstances = [];
    (globalThis as { window?: unknown }).window = { SpeechRecognition: FakeSpeechRecognition };
    stt = createSTTClient();
  });

  afterEach(() => {
    stt.stop();
    vi.useRealTimers();
    delete (globalThis as { window?: unknown }).window;
  });

  it("merges two final segments separated by a short pause into one onFinal call", () => {
    const onFinal = vi.fn();
    stt.onFinal(onFinal);
    stt.start([]);
    const recognition = latestRecognition();

    recognition.onresult?.(resultEvent([{ transcript: "TCP slow start", isFinal: true }], 0));
    vi.advanceTimersByTime(1000); // a normal breathing pause — well under the grace window
    recognition.onresult?.(resultEvent([{ transcript: "doubles cwnd every RTT", isFinal: true }], 1));
    vi.advanceTimersByTime(3500); // now let the full grace window elapse with no more speech

    expect(onFinal).toHaveBeenCalledTimes(1);
    expect(onFinal).toHaveBeenCalledWith("TCP slow start doubles cwnd every RTT");
  });

  it("does not fire onFinal until the silence grace period fully elapses", () => {
    const onFinal = vi.fn();
    stt.onFinal(onFinal);
    stt.start([]);
    const recognition = latestRecognition();

    recognition.onresult?.(resultEvent([{ transcript: "TCP slow start", isFinal: true }], 0));
    vi.advanceTimersByTime(3000); // just under the 3500ms grace window
    expect(onFinal).not.toHaveBeenCalled();

    vi.advanceTimersByTime(600); // now past it
    expect(onFinal).toHaveBeenCalledTimes(1);
  });

  it("resets the grace timer when more speech (even interim) keeps coming in", () => {
    const onFinal = vi.fn();
    stt.onFinal(onFinal);
    stt.start([]);
    const recognition = latestRecognition();

    recognition.onresult?.(resultEvent([{ transcript: "TCP slow start", isFinal: true }], 0));
    vi.advanceTimersByTime(3000);
    // Still talking — an interim result arrives just before the timer would have fired.
    recognition.onresult?.(resultEvent([{ transcript: "and then", isFinal: false }], 1));
    vi.advanceTimersByTime(3000); // would have fired by now if the timer hadn't reset
    expect(onFinal).not.toHaveBeenCalled();

    vi.advanceTimersByTime(600);
    expect(onFinal).toHaveBeenCalledTimes(1);
    // Only the browser-confirmed final text is submitted — the still-interim
    // "and then" was never upgraded to final, so it's intentionally dropped
    // rather than submitted as if it were confirmed transcript.
    expect(onFinal).toHaveBeenCalledWith("TCP slow start");
  });

  it("cancels a pending finalize and discards buffered text on stop()", () => {
    const onFinal = vi.fn();
    stt.onFinal(onFinal);
    stt.start([]);
    const recognition = latestRecognition();

    recognition.onresult?.(resultEvent([{ transcript: "TCP slow start", isFinal: true }], 0));
    stt.stop();
    vi.advanceTimersByTime(5000);

    expect(onFinal).not.toHaveBeenCalled();
  });

  it("reports the growing accumulated caption instead of resetting it per segment", () => {
    const onPartial = vi.fn();
    stt.onPartial(onPartial);
    stt.start([]);
    const recognition = latestRecognition();

    recognition.onresult?.(resultEvent([{ transcript: "TCP slow start", isFinal: true }], 0));
    recognition.onresult?.(resultEvent([{ transcript: "doubles", isFinal: false }], 1));

    expect(onPartial).toHaveBeenLastCalledWith("TCP slow start doubles");
  });
});
