"use client";

import { useState, useRef, useEffect } from "react";
import { parseAgentOutput } from "@/lib/docxExport/parseAgentOutput";
import { copyRichToClipboard } from "@/lib/docxExport/clipboardExport";

type Status = "idle" | "loading" | "success" | "error";

const DOCX_EXPORT_URL = "/api/export/docx";

type ExportToolbarProps = {
  canExport: boolean;
  disabledReason?: string;
};

export function ExportToolbar({ canExport, disabledReason }: ExportToolbarProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const resetStatusSoon = (delayMs = 2000) => {
    setTimeout(() => setStatus("idle"), delayMs);
  };

  const isBusy = status === "loading";
  const actionsEnabled = canExport && !isBusy;
  const menuMessage =
    status === "error"
      ? "Export fehlgeschlagen"
      : status === "loading"
        ? "Download wird vorbereitet"
        : disabledReason;

  const handleDocxDownload = () => {
    console.info("[ExportToolbar] DOCX download requested", {
      canExport,
      disabledReason: disabledReason ?? null,
    });
    setOpen(false);
    setStatus("loading");
    resetStatusSoon(3000);
  };

  const handleClipboardExport = async () => {
    console.info("[ExportToolbar] Clipboard export requested", {
      canExport,
      disabledReason: disabledReason ?? null,
    });

    if (!actionsEnabled) {
      setStatus("error");
      resetStatusSoon();
      return;
    }

    setOpen(false);
    setStatus("loading");

    try {
      const res = await fetch("/api/export/thread-content");
      const result = await res.json();

      if (!res.ok || !result.text) {
        console.error("Failed to get thread content:", result.error);
        setStatus("error");
        resetStatusSoon();
        return;
      }

      const data = parseAgentOutput(result.text, result.threadTitle);

      await copyRichToClipboard(data.sections);
      console.info("[ExportToolbar] Clipboard export completed", {
        sectionCount: data.sections.length,
      });
      setStatus("success");
      resetStatusSoon();
    } catch (err) {
      console.error("Export error:", err);
      setStatus("error");
      resetStatusSoon();
    }
  };

  return (
    <div ref={menuRef} className="relative">
      {/* Invisible backdrop to close menu on outside click */}
      {open && (
        <div
          className="fixed inset-0 z-[-1]"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Floating action button */}
      <button
        onClick={() => setOpen(!open)}
        className={`w-9 h-9 flex items-center justify-center rounded-full text-white shadow-lg transition-colors ${
          actionsEnabled
            ? "bg-[#bb0a30] hover:bg-[#9a0828]"
            : "bg-gray-400 hover:bg-gray-500"
        }`}
        aria-label="Export"
        title={disabledReason ?? "Export"}
      >
        {status === "loading" ? (
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : status === "success" ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : status === "error" ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}
      </button>

      {/* Dropdown menu */}
      {open && (
        <div className="absolute bottom-full right-0 mb-2 flex flex-col gap-1 bg-white rounded-lg shadow-xl border border-gray-200 p-1.5 min-w-[130px]">
          {actionsEnabled ? (
            <a
              href={DOCX_EXPORT_URL}
              onClick={handleDocxDownload}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded transition-colors text-left"
            >
              DOCX Download
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="px-3 py-1.5 text-sm font-medium text-gray-400 rounded text-left cursor-not-allowed"
            >
              DOCX Download
            </button>
          )}
          <button
            onClick={handleClipboardExport}
            disabled={!actionsEnabled}
            className={`px-3 py-1.5 text-sm font-medium rounded transition-colors text-left ${
              actionsEnabled
                ? "text-gray-700 hover:bg-gray-100"
                : "text-gray-400 cursor-not-allowed"
            }`}
          >
            Kopieren
          </button>
          {menuMessage && (
            <div className="max-w-[180px] px-3 pb-1 pt-1 text-xs leading-snug text-gray-500">
              {menuMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
