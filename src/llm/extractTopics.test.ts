import { describe, expect, it } from "vitest";
import { truncateNotes, MAX_NOTES_CHARS } from "./extractTopics";
import {
  extractTopicsPrompt,
  extractTopicsTextPrompt,
} from "./prompts/extractTopics.prompt";

describe("truncateNotes", () => {
  it("returns text unchanged when under the limit", () => {
    const text = "short notes";
    expect(truncateNotes(text)).toBe(text);
  });

  it("truncates text at MAX_NOTES_CHARS", () => {
    const text = "a".repeat(MAX_NOTES_CHARS + 100);
    expect(truncateNotes(text)).toHaveLength(MAX_NOTES_CHARS);
  });
});

describe("extractTopics prompts", () => {
  it("includes the notes text in the text prompt", () => {
    const prompt = extractTopicsTextPrompt("Mitochondria are the powerhouse of the cell.");
    expect(prompt).toContain("Mitochondria are the powerhouse of the cell.");
    expect(prompt).toContain("3 to 6");
  });

  it("asks for topics and notes_text in the base prompt", () => {
    const prompt = extractTopicsPrompt();
    expect(prompt).toContain("topics");
    expect(prompt).toContain("notes_text");
  });
});
