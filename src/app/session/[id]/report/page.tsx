/**
 * Gap map — `/session/:id/report`. Owner: C (C2 step 9 v1, C3 step 13 v2).
 *
 * - one-liner HUGE at the top
 * - concept nodes as a color-coded sorted grid (skip fancy graph layouts —
 *   a grid reads better on a projector)
 * - vaguest-moments quote cards, dodged-questions list
 * - v1 builds against fixtures/gapmap-tcp.json
 * - v2: test at projector resolution (1280×720, big fonts, high contrast);
 *   screenshot = Devpost hero image
 * - stretch (C5): PNG export via html-to-image
 */

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="mx-auto max-w-4xl p-8">
      {/* TODO(C): one-liner / <GapMapGrid /> / quote cards / dodged list */}
      <p className="text-gray-500">gap map for session {id} — not built yet</p>
    </main>
  );
}
