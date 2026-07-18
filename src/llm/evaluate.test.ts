import { describe, it, expect } from "vitest";
import { dropDuplicateCurrentTurn } from "./evaluate";
import type { Utterance } from "@/lib/types";

describe("dropDuplicateCurrentTurn", () => {
  it("drops the last transcript entry when it duplicates userText", () => {
    const transcript: Utterance[] = [
      { role: "student", text: "So what's a congestion window?", ts: 1 },
      { role: "user", text: "It's how much unacked data can be outstanding.", ts: 2 },
    ];
    const result = dropDuplicateCurrentTurn(
      transcript,
      "It's how much unacked data can be outstanding."
    );
    expect(result).toEqual([transcript[0]]);
  });

  it("leaves the transcript untouched when the last entry is not the user", () => {
    const transcript: Utterance[] = [
      { role: "user", text: "Slow start doubles cwnd each RTT.", ts: 1 },
      { role: "student", text: "Why does it double?", ts: 2 },
    ];
    const result = dropDuplicateCurrentTurn(transcript, "Slow start doubles cwnd each RTT.");
    expect(result).toEqual(transcript);
  });

  it("leaves the transcript untouched when the last user entry doesn't match userText (prior-only transcript)", () => {
    const transcript: Utterance[] = [
      { role: "user", text: "Slow start doubles cwnd each RTT.", ts: 1 },
    ];
    const result = dropDuplicateCurrentTurn(transcript, "This is a totally different utterance.");
    expect(result).toEqual(transcript);
  });

  it("handles an empty transcript", () => {
    expect(dropDuplicateCurrentTurn([], "anything")).toEqual([]);
  });
});
