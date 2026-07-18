/**
 * Topic picker — `/`. Owner: C (Block C1, step 2).
 *
 * - text input for arbitrary topic
 * - five demo-topic cards (from B's cached graphs in /fixtures/graphs)
 * - student persona intro card: "This is Sam. Sam knows nothing. Teach Sam."
 */

export default function TopicPickerPage() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-3xl font-bold">Professor Me</h1>
      <p className="mt-2 text-gray-500">
        You don&apos;t study with it. You teach it.
      </p>
      {/* TODO(C): <TopicPicker /> */}
    </main>
  );
}
