import type { CuriosityLevel } from "./types";

export type { CuriosityLevel };

export const DEFAULT_CURIOSITY: CuriosityLevel = "medium";

export function parseCuriosityLevel(value: unknown): CuriosityLevel {
  if (value === "low" || value === "high") return value;
  return DEFAULT_CURIOSITY;
}

/** Maps UI curiosity to turnPolicy's max probes per node (vague/wrong). */
export function probeThresholdForCuriosity(
  curiosity: CuriosityLevel = DEFAULT_CURIOSITY
): number {
  switch (curiosity) {
    case "low":
      return 1;
    case "high":
      return 3;
    default:
      return 2;
  }
}
