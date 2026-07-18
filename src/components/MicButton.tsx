/**
 * Mic button — hold-to-talk AND auto-VAD toggle. Owner: C, transport by D.
 * (Block C3 step 11; decide with D at CP3 which ships — hold-to-talk is the
 * reliable demo default. If CP3 slips past hour 16: hold-to-talk only.)
 * Shows live partial transcript so the user sees the STT hearing them.
 */

"use client";

export function MicButton() {
  // TODO(C+D): wire to src/voice/sttClient.ts
  return null;
}
