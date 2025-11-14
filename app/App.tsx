"use client";

import { useCallback, useEffect } from "react";
import {
  ChatKitPanel,
  type FactAction,
  type ResponseUsage,
} from "@/components/ChatKitPanel";
import type { ColorScheme } from "@/hooks/useColorScheme";

const FORCED_SCHEME: ColorScheme = "light";

export default function App() {

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const root = document.documentElement;
    root.dataset.colorScheme = FORCED_SCHEME;
    root.classList.remove("dark");
    root.style.colorScheme = FORCED_SCHEME;
  }, []);

  const handleWidgetAction = useCallback(async (action: FactAction) => {
    if (process.env.NODE_ENV !== "production") {
      console.info("[ChatKitPanel] widget action", action);
    }
  }, []);

  const handleResponseEnd = useCallback(
    async (sessionId?: string, usage?: ResponseUsage, threadId?: string | null) => {
      if (process.env.NODE_ENV !== "production") {
        console.debug("[ChatKitPanel] response end", sessionId, usage, threadId);
      }
      if (!sessionId || !usage) return;
      try {
        await fetch("/api/usage/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            threadId,
            model: usage.model,
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            totalTokens: usage.totalTokens,
          }),
        });
      } catch (error) {
        console.error("Failed to report usage:", error);
      }
    },
    []
  );

  const handleInsertPrompt = useCallback(async (text: string) => {
    // This will be passed to ChatKitPanel to handle prompt insertion
    console.log("Insert prompt:", text);
  }, []);

  return (
    <main className="flex min-h-screen bg-white">
      <div className="flex flex-1 flex-col px-4 py-6 lg:px-8">
        <ChatKitPanel
          theme={FORCED_SCHEME}
          onWidgetAction={handleWidgetAction}
          onResponseEnd={handleResponseEnd}
          onThemeRequest={() => {}}
          onInsertPrompt={handleInsertPrompt}
        />
      </div>
    </main>
  );
}
