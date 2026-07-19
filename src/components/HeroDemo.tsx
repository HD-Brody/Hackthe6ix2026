"use client";

/**
 * Self-playing lesson in the hero: a user explanation types itself out, Sam
 * catches the hand-wave, and the moment gets logged to the gap map — on loop.
 * The product demo IS the hero art. Respects prefers-reduced-motion (renders
 * the final frame statically).
 */

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

interface Scene {
  user: string;
  /** Index in `user` where the hand-waving starts (gets red-underlined). */
  waveFrom: number;
  sam: string;
  verdict: string;
}

const SCENES: Scene[] = [
  {
    user: "Chlorophyll absorbs the light and then, you know, energy happens.",
    waveFrom: 36,
    sam: "Wait — “energy happens”? What actually happens?",
    verdict: "hand-wave detected · light reactions",
  },
  {
    user: "TCP just speeds up until the network tells it to stop.",
    waveFrom: 23,
    sam: "How does it know when to stop? Who tells it?",
    verdict: "hand-wave detected · congestion signals",
  },
  {
    user: "Entangled particles communicate instantly across space.",
    waveFrom: 20,
    sam: "Hmm, communicate? Like… sending a message faster than light?",
    verdict: "misconception detected · entanglement",
  },
];

type Phase = "typing-user" | "typing-sam" | "verdict" | "hold";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function HeroDemo() {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [userChars, setUserChars] = useState(0);
  const [samChars, setSamChars] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing-user");
  const [reduced, setReduced] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const scene = SCENES[sceneIndex];

  useEffect(() => {
    if (prefersReducedMotion()) {
      setReduced(true);
      setUserChars(SCENES[0].user.length);
      setSamChars(SCENES[0].sam.length);
      setPhase("hold");
      return;
    }
  }, []);

  useEffect(() => {
    if (reduced) return;
    const later = (fn: () => void, ms: number) => {
      const t = setTimeout(fn, ms);
      timers.current.push(t);
    };

    if (phase === "typing-user") {
      if (userChars < scene.user.length) {
        later(() => setUserChars((c) => c + 1), 34);
      } else {
        later(() => setPhase("typing-sam"), 650);
      }
    } else if (phase === "typing-sam") {
      if (samChars < scene.sam.length) {
        later(() => setSamChars((c) => c + 1), 26);
      } else {
        later(() => setPhase("verdict"), 450);
      }
    } else if (phase === "verdict") {
      later(() => setPhase("hold"), 2400);
    } else if (phase === "hold") {
      later(() => {
        setSceneIndex((i) => (i + 1) % SCENES.length);
        setUserChars(0);
        setSamChars(0);
        setPhase("typing-user");
      }, 900);
    }

    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [phase, userChars, samChars, scene, reduced]);

  const typedUser = scene.user.slice(0, userChars);
  const solidPart = typedUser.slice(0, Math.min(userChars, scene.waveFrom));
  const wavePart = typedUser.slice(Math.min(userChars, scene.waveFrom));
  const showVerdict = phase === "verdict" || phase === "hold";

  return (
    <aside
      className="index-card tilt-2 relative mx-auto w-full max-w-md border border-[var(--border)] p-5 pl-10 shadow-[0_18px_40px_-18px_var(--shadow-color)]"
      aria-label="Live demo of a teaching session"
    >
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
          Live lesson — field notes
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-stamp)]">
          <span className="size-1.5 animate-pulse rounded-full bg-[var(--ink-stamp)]" aria-hidden />
          rec
        </span>
      </div>

      <div className="mt-4 min-h-[72px]">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">You</p>
        <p className={`mt-1 text-sm leading-6 text-[var(--text-primary)] ${phase === "typing-user" && !reduced ? "type-caret" : ""}`}>
          {solidPart}
          <span className="underline decoration-[var(--ink-stamp)] decoration-wavy decoration-1 underline-offset-4">
            {wavePart}
          </span>
        </p>
      </div>

      <div className="mt-3 min-h-[64px]">
        {phase !== "typing-user" || reduced ? (
          <div className="flex items-start gap-2.5">
            <Image src="/students/sam.png" alt="" width={28} height={28} className="mt-0.5 size-7 shrink-0 rounded-full object-cover" />
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">Sam</p>
              <p className={`font-display mt-1 text-sm italic leading-6 text-[var(--text-secondary)] ${phase === "typing-sam" && !reduced ? "type-caret" : ""}`}>
                {scene.sam.slice(0, samChars)}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-3 min-h-[30px]">
        {showVerdict || reduced ? (
          <p className="inline-flex items-center gap-2 rounded-full border border-[var(--ink-stamp)]/40 bg-[var(--danger-surface)] px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--danger-text)]">
            ✕ {scene.verdict} → gap map
          </p>
        ) : null}
      </div>
    </aside>
  );
}
