import type { DocxData, Section } from "./types";

const SECTION_PATTERN = /^(\d+(?:\.\d+)*)\.\s+/;
const SOURCES_PATTERN = /^Quellen\s*$/i;
const RESULT_PATTERN = /^Ergebnis:?\s*/i;

export function parseAgentOutput(text: string): DocxData {
  const lines = text.split("\n");

  // 1. EXTRACT TITLE / INTRO
  const titleLineIdx = lines.findIndex((l) => l.trim().length > 0);
  let title = lines[titleLineIdx]?.trim() || "Rechtsgutachten";

  if (RESULT_PATTERN.test(title)) {
    title = title.replace(RESULT_PATTERN, "").trim() || "Rechtsgutachten";
  }

  // 2. FIND SECTION BOUNDARIES
  const sectionStarts: { idx: number; level: string }[] = [];
  let sourcesStartIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].trim().match(SECTION_PATTERN);
    if (match) {
      sectionStarts.push({ idx: i, level: match[1] });
    }
    if (SOURCES_PATTERN.test(lines[i].trim())) {
      sourcesStartIdx = i;
    }
  }

  // 3. EXTRACT EXECUTIVE SUMMARY
  const firstSectionIdx = sectionStarts[0]?.idx ?? lines.length;
  const summaryLines = lines.slice(titleLineIdx + 1, firstSectionIdx);
  const executiveSummary = summaryLines.join("\n").trim() || undefined;

  // 4. EXTRACT SECTIONS
  const sections: Section[] = [];
  const lastSectionEnd = sourcesStartIdx > 0 ? sourcesStartIdx : lines.length;

  for (let i = 0; i < sectionStarts.length; i++) {
    const { idx: startIdx, level } = sectionStarts[i];
    const endIdx = sectionStarts[i + 1]?.idx ?? lastSectionEnd;

    const sectionLines = lines.slice(startIdx, endIdx);
    const firstLine = sectionLines[0].replace(SECTION_PATTERN, "").trim();
    const bodyLines = sectionLines.slice(1);

    const depth = level.split(".").length;
    const style: Section["style"] =
      depth === 1 ? "Memo1" : depth === 2 ? "Memo2" : "Memo3";

    sections.push({
      heading: firstLine,
      body: bodyLines.join("\n").trim(),
      level,
      style,
    });
  }

  // 5. EXTRACT SOURCES
  let sources: string | undefined;
  if (sourcesStartIdx > 0) {
    const sourceLines = lines.slice(sourcesStartIdx + 1);
    sources = sourceLines.join("\n").trim() || undefined;
  }

  return {
    report_title: title,
    date: new Date().toLocaleDateString("de-DE"),
    executiveSummary,
    sections,
    sources,
  };
}
