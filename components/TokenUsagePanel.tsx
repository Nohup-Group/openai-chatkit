"use client";

import { calculateCost, formatCost } from "@/lib/pricing";

export type AggregatedModelUsage = {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type TokenUsageSummary = {
  models: AggregatedModelUsage[];
  totalTokens: number;
};

type TokenUsagePanelProps = {
  summary: TokenUsageSummary;
};

export default function TokenUsagePanel({ summary }: TokenUsagePanelProps) {
  const hasData = summary.models.length > 0;
  const totalCost = summary.models.reduce((sum, item) => {
    return (
      sum + calculateCost(item.model, item.promptTokens, item.completionTokens)
    );
  }, 0);

  const formatPlainTokens = (value: number) =>
    value.toLocaleString("de-DE", { maximumFractionDigits: 0 });

  return (
    <section className="flex h-full flex-col bg-white px-5 py-6">
      <header className="mb-6">
        <p className="text-lg font-semibold text-gray-900">
          Token-Nutzung pro Modell
        </p>
      </header>

      {hasData ? (
        <>
          <ul className="flex-1 space-y-4 text-base text-gray-900">
            {summary.models.map((item) => (
              <li key={item.model} className="flex items-center justify-between">
                <span className="font-medium">{item.model}</span>
                <span className="tabular-nums">
                  {formatPlainTokens(item.totalTokens)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-auto pt-6 text-base text-gray-900">
            <div className="flex items-center justify-between font-semibold">
              <span>Geschätzte Kosten</span>
              <span className="tabular-nums">{formatCost(totalCost)}</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Basierend auf offiziellen OpenAI-Preisen.
            </p>
          </div>
        </>
      ) : (
        <div className="rounded-2xl bg-gray-50 px-4 py-6 text-sm text-gray-500">
          Noch keine Token verbraucht. Stelle eine Frage, um die Nutzung zu
          sehen.
        </div>
      )}
    </section>
  );
}
