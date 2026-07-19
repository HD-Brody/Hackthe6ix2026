"use client";

import { UnifoldProvider } from "@unifold/connect-react";
import "@unifold/connect-react/styles.css";
import type { ReactNode } from "react";

type Props = {
  publishableKey: string | undefined;
  children: ReactNode;
};

/**
 * Client-only Unifold wrapper. When the publishable key is missing
 * (mock-only demos), children still render without the provider.
 */
export function UnifoldClientProvider({ publishableKey, children }: Props) {
  if (!publishableKey) {
    return <>{children}</>;
  }

  return (
    <UnifoldProvider
      publishableKey={publishableKey}
      config={{
        modalTitle: "Support Professor Me",
        appearance: "auto",
        accentColor: "#4648d4",
        hideDepositTracker: true,
      }}
    >
      {children}
    </UnifoldProvider>
  );
}
