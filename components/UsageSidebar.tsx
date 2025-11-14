"use client";

import { useCallback, useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { formatCost, formatTokens } from "@/lib/pricing";

interface DailyStats {
  date: string;
  requests: number;
  tokensInput: number;
  tokensOutput: number;
  tokensTotal: number;
  cost: number;
}

interface CurrentSession {
  sessionId: string;
  tokensInput: number;
  tokensOutput: number;
  tokensTotal: number;
  cost: number;
  requestCount: number;
}

interface SessionHistory {
  sessionId: string;
  userId: string | null;
  startTime: string;
  endTime: string | null;
  requestCount: number;
  tokensInput: number;
  tokensOutput: number;
  tokensTotal: number;
  cost: number;
}

interface UsageSidebarProps {
  isOpen: boolean;
  currentSessionId?: string;
  sessionTokens?: number;
  onSessionUpdate?: (stats: CurrentSession) => void;
}

export default function UsageSidebar({
  isOpen,
  currentSessionId,
  sessionTokens = 0,
}: UsageSidebarProps) {
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [currentSession, setCurrentSession] = useState<CurrentSession | null>(null);
  const [history, setHistory] = useState<SessionHistory[]>([]);
  const [totals, setTotals] = useState({
    totalRequests: 0,
    tokensTotal: 0,
    totalCost: 0,
  });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"7" | "30">("7");

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const url = `/api/usage/stats?period=${period}${
        currentSessionId ? `&sessionId=${currentSessionId}` : ""
      }`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setDailyStats(data.dailyStats);
        setTotals(data.totals);
        setCurrentSession(data.currentSession);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  }, [period, currentSessionId]);

  const fetchHistory = async () => {
    try {
      const response = await fetch("/api/usage/history?limit=10");
      const data = await response.json();

      if (data.success) {
        setHistory(data.history);
      }
    } catch (error) {
      console.error("Error fetching history:", error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStats();
      fetchHistory();
    }
  }, [isOpen, period, currentSessionId, fetchStats]);

  // Auto-refresh every 10 seconds when open
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      void fetchStats();
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [isOpen, fetchStats]);

  if (!isOpen) return null;

  return (
    <div className="h-full w-full bg-white overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
        <h2 className="text-sm font-medium text-gray-900">
          Token-Nutzung
        </h2>
      </div>

        {loading ? (
          <div className="p-4 space-y-4">
            <div className="animate-pulse space-y-3">
              <div className="h-20 bg-gray-100 rounded-md" />
              <div className="h-32 bg-gray-100 rounded-md" />
              <div className="h-24 bg-gray-100 rounded-md" />
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Current Session - Live Tracking */}
            {sessionTokens > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                <h3 className="text-xs font-medium text-gray-600 mb-2">
                  Aktuelle Sitzung
                </h3>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Gesamt Tokens:</span>
                    <span className="font-semibold text-gray-900 text-sm">
                      {formatTokens(sessionTokens)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pt-1.5 border-t border-gray-200">
                    <span className="text-gray-600">Geschätzte Kosten:</span>
                    <span className="font-semibold text-gray-900">
                      {formatCost((sessionTokens / 1_000_000) * 0.375)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Database Session Info (if available) */}
            {currentSession && (
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                <h3 className="text-xs font-medium text-gray-600 mb-2">
                  Sitzungsverlauf
                </h3>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Anfragen:</span>
                    <span className="font-medium text-gray-900">
                      {currentSession.requestCount}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Tokens:</span>
                    <span className="font-medium text-gray-900">
                      {formatTokens(currentSession.tokensTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pt-1.5 border-t border-gray-200">
                    <span className="text-gray-600">Kosten:</span>
                    <span className="font-semibold text-gray-900">
                      {formatCost(currentSession.cost)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Period Selector */}
            <div className="flex gap-1.5">
              <button
                onClick={() => setPeriod("7")}
                className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  period === "7"
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                7 Tage
              </button>
              <button
                onClick={() => setPeriod("30")}
                className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  period === "30"
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                30 Tage
              </button>
            </div>

            {/* Totals */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-50 rounded-md p-2.5">
                <div className="text-xs text-gray-500 mb-0.5">Anfragen</div>
                <div className="text-base font-semibold text-gray-900">
                  {totals.totalRequests}
                </div>
              </div>
              <div className="bg-gray-50 rounded-md p-2.5">
                <div className="text-xs text-gray-500 mb-0.5">Tokens</div>
                <div className="text-base font-semibold text-gray-900">
                  {formatTokens(totals.tokensTotal)}
                </div>
              </div>
              <div className="col-span-2 bg-gray-50 rounded-md p-2.5">
                <div className="text-xs text-gray-500 mb-0.5">Gesamtkosten</div>
                <div className="text-xl font-bold text-gray-900">
                  {formatCost(totals.totalCost)}
                </div>
              </div>
            </div>

            {/* Chart */}
            {dailyStats.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-gray-600 mb-2">
                  Nutzungstrend
                </h3>
                <div className="bg-gray-50 rounded-md p-2">
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={dailyStats}>
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 9, fill: "#6b7280" }}
                        tickFormatter={(date) => new Date(date).toLocaleDateString("de-DE", { month: "short", day: "numeric" })}
                      />
                      <YAxis
                        tick={{ fontSize: 9, fill: "#6b7280" }}
                        tickFormatter={(value) => formatCost(value)}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          border: "1px solid #e5e7eb",
                          borderRadius: "6px",
                          fontSize: "11px",
                        }}
                        labelStyle={{ color: "#374151" }}
                        formatter={(value: number) => [formatCost(value), "Kosten"]}
                        labelFormatter={(date) => new Date(date).toLocaleDateString("de-DE")}
                      />
                      <Line
                        type="monotone"
                        dataKey="cost"
                        stroke="#374151"
                        strokeWidth={1.5}
                        dot={{ fill: "#374151", r: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Recent Sessions */}
            {history.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-gray-600 mb-2">
                  Letzte Sitzungen
                </h3>
                <div className="space-y-1.5">
                  {history.map((session) => (
                    <div
                      key={session.sessionId}
                      className="bg-gray-50 rounded-md p-2.5 text-xs"
                    >
                      <div className="flex justify-between items-start mb-1.5">
                        <div className="text-gray-500 text-[10px]">
                          {new Date(session.startTime).toLocaleDateString("de-DE", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        <div className="font-semibold text-gray-900">
                          {formatCost(session.cost)}
                        </div>
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-500">
                        <span>{session.requestCount} Anfragen</span>
                        <span>{formatTokens(session.tokensTotal)} Tokens</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Refresh Button */}
            <button
              onClick={() => {
                fetchStats();
                fetchHistory();
              }}
              className="w-full px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Aktualisieren
            </button>
          </div>
        )}
    </div>
  );
}
