/**
 * Color-coded concept grid for the report page. Owner: C (Block C2 step 9).
 * State colors come from the CSS variables in globals.css.
 */

"use client";

import type { GapMap } from "@/lib/types";

export function GapMapGrid({ gapMap }: { gapMap: GapMap }) {
  // TODO(C): sorted grid, state colors, node names
  return <div>{gapMap.nodes.length} concepts</div>;
}
