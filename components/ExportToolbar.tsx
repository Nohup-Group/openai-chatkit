"use client";

import { useState } from "react";
import {
  extractLastAgentResponse,
  parseAgentOutput,
  generateAndDownloadDocx,
  copyRichToClipboard,
} from "@/lib/docxExport";

type Status = "idle" | "loading" | "success" | "error";

export function ExportToolbar() {
  const [status, setStatus] = useState<Status>("idle");

  const handleExport = async (mode: "docx" | "clipboard") => {
    setStatus("loading");

    const response = extractLastAgentResponse();
    if (!response) {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
      return;
    }

    const data = parseAgentOutput(response.text);

    try {
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
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleExport("docx")}
        disabled={status === "loading"}
        className="px-3 py-1.5 bg-[#bb0a30] text-white rounded text-sm font-medium hover:bg-[#9a0828] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {status === "loading" ? "..." : "DOCX"}
      </button>
      <button
        onClick={() => handleExport("clipboard")}
        disabled={status === "loading"}
        className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Kopieren
      </button>
      {status === "success" && (
        <span className="text-green-600 text-sm font-medium">✓</span>
      )}
      {status === "error" && (
        <span className="text-red-600 text-sm font-medium">Fehler</span>
      )}
    </div>
  );
}
