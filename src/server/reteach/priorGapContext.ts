import type { GapMap, PriorGapContext } from "@/lib/types";

export class PriorSessionNotFoundError extends Error {
  readonly code = "prior_session_not_found" as const;
  constructor(id: string) {
    super(`prior session not found: ${id}`);
    this.name = "PriorSessionNotFoundError";
  }
}

export class PriorSessionForbiddenError extends Error {
  readonly code = "prior_session_forbidden" as const;
  constructor() {
    super("prior session belongs to another user");
    this.name = "PriorSessionForbiddenError";
  }
}

export class PriorSessionInvalidError extends Error {
  readonly code = "prior_session_invalid" as const;
  constructor(message: string) {
    super(message);
    this.name = "PriorSessionInvalidError";
  }
}

function nodeName(gapMap: GapMap, nodeId: string): string {
  return gapMap.nodes.find((n) => n.id === nodeId)?.name ?? nodeId;
}

/** Build a compact prior-gap snapshot from an ended session's gap map. */
export function buildPriorGapContext(
  priorSessionId: string,
  gapMap: GapMap
): PriorGapContext {
  if (gapMap.reteach_order.length === 0) {
    throw new PriorSessionInvalidError(
      "prior session has nothing to re-teach"
    );
  }

  const reteach_names = gapMap.reteach_order.map((id) => nodeName(gapMap, id));

  return {
    prior_session_id: priorSessionId,
    topic: gapMap.topic,
    reteach_order: [...gapMap.reteach_order],
    reteach_names,
    vaguest_moments: gapMap.vaguest_moments.slice(0, 2),
    one_liner: gapMap.one_liner,
  };
}
