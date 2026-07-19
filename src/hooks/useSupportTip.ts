"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_TIP_USDC,
  type SupportStatus,
  type TipAmountUsdc,
} from "@/lib/billing";

type CheckoutResponse = {
  mock?: boolean;
  thanks?: boolean;
  clientSecret?: string;
  paymentIntentId?: string;
  amountUsdc?: number;
  message?: string;
  error?: string;
};

async function fetchStatus(): Promise<SupportStatus> {
  const res = await fetch("/api/billing/status");
  if (!res.ok) throw new Error("Could not load support status.");
  return res.json() as Promise<SupportStatus>;
}

export function useSupportTip() {
  const [status, setStatus] = useState<SupportStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [thanks, setThanks] = useState(false);
  const [lastAmount, setLastAmount] = useState<TipAmountUsdc | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const next = await fetchStatus();
      setStatus(next);
      return next;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Support status unavailable.";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh().catch(() => {});
  }, [refresh]);

  const confirmPayment = useCallback(async (paymentIntentId: string) => {
    const res = await fetch("/api/billing/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentIntentId }),
    });
    const payload = (await res.json().catch(() => ({}))) as {
      thanks?: boolean;
      pending?: boolean;
      error?: string;
      message?: string;
    };
    if (!res.ok) {
      throw new Error(payload.message || payload.error || "Confirm failed.");
    }
    return payload;
  }, []);

  const sendTip = useCallback(
    async (
      amountUsdc: TipAmountUsdc,
      beginCheckout?: (config: { clientSecret: string }) => Promise<unknown>
    ) => {
      setBusy(true);
      setError(null);
      setThanks(false);
      try {
        const res = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amountUsdc }),
        });
        const payload = (await res.json().catch(() => ({}))) as CheckoutResponse;

        if (!res.ok) {
          throw new Error(
            payload.message || payload.error || "Checkout failed."
          );
        }

        if (payload.mock && payload.thanks) {
          setLastAmount(amountUsdc);
          setThanks(true);
          return;
        }

        if (!payload.clientSecret || !payload.paymentIntentId) {
          throw new Error("Checkout did not return a client secret.");
        }

        if (!beginCheckout) {
          throw new Error(
            "Unifold is not configured. Set NEXT_PUBLIC_UNIFOLD_PUBLISHABLE_KEY."
          );
        }

        await beginCheckout({ clientSecret: payload.clientSecret });

        let confirmed = await confirmPayment(payload.paymentIntentId);
        for (let i = 0; i < 8 && confirmed.pending; i++) {
          await new Promise((r) => setTimeout(r, 1500));
          confirmed = await confirmPayment(payload.paymentIntentId);
        }

        if (confirmed.thanks) {
          setLastAmount(amountUsdc);
          setThanks(true);
          return;
        }
        throw new Error("Payment is still pending — try confirm again shortly.");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Tip failed.";
        if (/cancel/i.test(message) || /DEPOSIT_CANCELLED/i.test(message)) {
          setError(null);
          return;
        }
        setError(message);
        throw err;
      } finally {
        setBusy(false);
      }
    },
    [confirmPayment]
  );

  return {
    status,
    loading,
    error,
    busy,
    thanks,
    lastAmount: lastAmount ?? status?.defaultTipUsdc ?? DEFAULT_TIP_USDC,
    refresh,
    sendTip,
    clearThanks: () => setThanks(false),
  };
}
