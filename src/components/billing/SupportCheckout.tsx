"use client";

import { useEffect, useState } from "react";
import { useUnifold } from "@unifold/connect-react";
import {
  DEFAULT_TIP_USDC,
  TIP_AMOUNTS_USDC,
  type TipAmountUsdc,
} from "@/lib/billing";
import { useSupportTip } from "@/hooks/useSupportTip";

function TipForm({
  beginCheckout,
}: {
  beginCheckout?: (config: { clientSecret: string }) => Promise<unknown>;
}) {
  const {
    status,
    loading,
    error,
    busy,
    thanks,
    lastAmount,
    sendTip,
    clearThanks,
    refresh,
  } = useSupportTip();
  const [amount, setAmount] = useState<TipAmountUsdc>(DEFAULT_TIP_USDC);

  useEffect(() => {
    if (status?.defaultTipUsdc) setAmount(status.defaultTipUsdc);
  }, [status?.defaultTipUsdc]);

  const amounts = status?.tipAmounts ?? TIP_AMOUNTS_USDC;

  if (thanks) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="font-display text-2xl font-semibold text-[var(--text-primary)]">
          Thank you.
        </p>
        <p className="max-w-md text-sm leading-6 text-[var(--text-secondary)]">
          Your {lastAmount} USDC tip keeps the classroom lights on — Gemini
          tokens, voices, and late-night debugging.
        </p>
        <button
          type="button"
          onClick={() => clearThanks()}
          className="text-sm font-semibold text-[var(--nav-active)] underline-offset-2 hover:underline"
        >
          Send another tip
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-5">
      <fieldset>
        <legend className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
          Tip amount
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {amounts.map((value) => {
            const selected = amount === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setAmount(value)}
                className={`min-w-[4.5rem] rounded-lg border px-4 py-2.5 font-mono text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] ${
                  selected
                    ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--nav-active)]"
                    : "border-[var(--card-border)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-[var(--brand)]"
                }`}
              >
                {value} USDC
              </button>
            );
          })}
        </div>
      </fieldset>

      <button
        type="button"
        disabled={busy || loading || (status !== null && !status.canCheckout)}
        onClick={() => {
          void sendTip(amount, beginCheckout).catch(() => {});
        }}
        className="font-heading rounded-xl bg-[var(--chat-user)] px-8 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-[var(--brand-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] disabled:cursor-wait disabled:opacity-70"
      >
        {busy ? "Opening checkout…" : `Buy us a coffee — ${amount} USDC`}
      </button>

      {status?.billingMock ? (
        <p className="text-xs text-[var(--text-muted)]">
          Mock mode is on — the button records a tip without moving crypto.
        </p>
      ) : null}
      {status && !status.canCheckout ? (
        <p className="text-sm text-[var(--danger-text)]">
          Tips aren&apos;t configured yet. Add Unifold keys + recipient, or set{" "}
          <code className="font-mono text-xs">BILLING_MOCK=true</code>.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm font-medium text-[var(--danger-text)]">
          {error}{" "}
          <button
            type="button"
            className="underline"
            onClick={() => {
              void refresh().catch(() => {});
            }}
          >
            Retry
          </button>
        </p>
      ) : null}
    </div>
  );
}

function TipWithUnifold() {
  const { beginCheckout } = useUnifold();
  return <TipForm beginCheckout={beginCheckout} />;
}

export function SupportCheckout() {
  const publishableKey = process.env.NEXT_PUBLIC_UNIFOLD_PUBLISHABLE_KEY;
  if (publishableKey) return <TipWithUnifold />;
  return <TipForm />;
}
