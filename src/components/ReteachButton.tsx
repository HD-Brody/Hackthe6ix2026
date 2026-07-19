"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { StudentId } from "@/lib/studentProfiles";

export function ReteachButton({
  sessionId,
  student,
  hasGaps,
  isMock,
}: {
  sessionId: string;
  student: StudentId;
  hasGaps: boolean;
  isMock: boolean;
}) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buttonClass =
    "mt-5 inline-block rounded-lg bg-[#5755d8] px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#4846c5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70";

  if (!hasGaps || isMock) {
    return (
      <Link href="/" className={buttonClass}>
        Teach it again
      </Link>
    );
  }

  async function startReteach() {
    if (isCreating) return;
    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prior_session_id: sessionId }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        session_id?: string;
        error?: string;
        message?: string;
      };

      if (!response.ok || !payload.session_id) {
        throw new Error(payload.message || payload.error || "Unable to start re-teach session.");
      }

      router.push(`/session/${payload.session_id}?student=${student}`);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to start re-teach session."
      );
      setIsCreating(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={startReteach}
        disabled={isCreating}
        className={buttonClass}
      >
        {isCreating ? "Starting re-teach…" : "Teach it again"}
      </button>
      {error ? (
        <p role="alert" className="mt-3 text-sm font-medium text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
