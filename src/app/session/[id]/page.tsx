/**
 * The classroom — `/session/:id`. Owner: C (Blocks C1–C3).
 *
 * - transcript pane (user right, student left), text input, status header (C1)
 * - SSE token streaming into the transcript (C2 step 6)
 * - refresh recovery: GET /api/session/:id on load, rebuild transcript (C2 step 7)
 * - "wrap up" button → end call → route to report (C2 step 8)
 * - voice UI per D's transport: MicButton, partial transcript, audio state (C3)
 * - interruption UX: user talks over student → stop playback, yield floor (C3 step 12)
 *
 * Where judges spend 3 of the 5 demo minutes — first in the polish order.
 */

export default async function ClassroomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="flex h-screen flex-col p-4">
      {/* TODO(C): header / <Transcript /> / input row with <MicButton /> */}
      <p className="text-gray-500">classroom for session {id} — not built yet</p>
    </main>
  );
}
