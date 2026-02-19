"use client";

import { useState, useRef, useEffect } from "react";
import {
  parseAgentOutput,
  generateAndDownloadDocx,
  copyRichToClipboard,
} from "@/lib/docxExport";

type Status = "idle" | "loading" | "success" | "error";

export function ExportToolbar() {
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

  const handleExport = async (mode: "docx" | "clipboard") => {
    setOpen(false);
    setStatus("loading");

    try {
      const res = await fetch("/api/export/thread-content");
      const result = await res.json();

      if (!res.ok || !result.text) {
        console.error("Failed to get thread content:", result.error);
        setStatus("error");
        setTimeout(() => setStatus("idle"), 2000);
        return;
      }

      const data = parseAgentOutput(result.text, result.threadTitle);

      if (mode === "docx") {
        await generateAndDownloadDocx(data);
      } else {
        await copyRichToClipboard(data.sections);
      }
      setStatus("success");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err) {
      console.error("Export error:", err);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
    }
  };

  return (
    <div ref={menuRef} className="relative">
      {/* Floating action button */}
      <button
        onClick={() => setOpen(!open)}
        className="w-9 h-9 flex items-center justify-center rounded-full bg-[#bb0a30] text-white shadow-lg hover:bg-[#9a0828] transition-colors"
        aria-label="Export"
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
          <button
            onClick={() => handleExport("docx")}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded transition-colors text-left"
          >
            DOCX Download
          </button>
          <button
            onClick={() => handleExport("clipboard")}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded transition-colors text-left"
          >
            Kopieren
          </button>
        </div>
      )}
    </div>
  );
}
