import { describe, it, expect } from "vitest";
import { resolveSessionStudent } from "./studentProfiles";

describe("resolveSessionStudent", () => {
  it("prefers the student stored on the session", () => {
    expect(resolveSessionStudent("elena", "sam")).toBe("elena");
    expect(resolveSessionStudent("sam", "elena")).toBe("sam");
  });

  it("falls back to the query param when session has no student", () => {
    expect(resolveSessionStudent(undefined, "elena")).toBe("elena");
    expect(resolveSessionStudent(null, "elena")).toBe("elena");
  });

  it("defaults to sam when neither source is set", () => {
    expect(resolveSessionStudent(undefined, undefined)).toBe("sam");
  });
});
