import type { DocxData, Section } from "./types";

// Match markdown headers: ## HEADING, ### Heading, #### Heading
const H2_PATTERN = /^##\s+(.+)$/;
const H3_PATTERN = /^###\s+(.+)$/;
const H4_PATTERN = /^####\s+(.+)$/;

// Match sources section
const SOURCES_PATTERN = /^##\s*QUELLEN\s*$/i;

// Match end section (to stop parsing)
const END_PATTERN = /^##\s*ABSCHLUSS\s*$/i;

type HeadingType = "h2" | "h3" | "h4" | "sources" | "end";

function detectHeading(line: string): { type: HeadingType | null; text: string } {
  const trimmed = line.trim();

  // Check for sources section first
  if (SOURCES_PATTERN.test(trimmed)) {
    return { type: "sources", text: "Quellen" };
  }

  // Check for end section
  if (END_PATTERN.test(trimmed)) {
    return { type: "end", text: "Abschluss" };
  }

  // Check for H4 (####)
  const h4Match = trimmed.match(H4_PATTERN);
  if (h4Match) {
    return { type: "h4", text: h4Match[1].trim() };
  }

  // Check for H3 (###)
  const h3Match = trimmed.match(H3_PATTERN);
  if (h3Match) {
    return { type: "h3", text: h3Match[1].trim() };
  }

  // Check for H2 (##)
  const h2Match = trimmed.match(H2_PATTERN);
  if (h2Match) {
    return { type: "h2", text: h2Match[1].trim() };
  }

  return { type: null, text: "" };
}

export function parseAgentOutput(text: string, threadTitle?: string | null): DocxData {
  const lines = text.split("\n");

  // Find all headings and their positions
  const headings: Array<{ idx: number; type: HeadingType; text: string }> = [];

  for (let i = 0; i < lines.length; i++) {
    const result = detectHeading(lines[i]);
    if (result.type) {
      headings.push({ idx: i, type: result.type, text: result.text });
    }
  }

  // Find first main section (h2) to separate intro from content
  const firstH2Idx = headings.findIndex(h => h.type === "h2");
  const firstSectionLineIdx = firstH2Idx >= 0 ? headings[firstH2Idx].idx : -1;

  // Extract executive summary (everything before first ## section)
  let executiveSummary: string | undefined;
  if (firstSectionLineIdx > 0) {
    const introLines = lines.slice(0, firstSectionLineIdx);
    executiveSummary = cleanMarkdown(introLines.join("\n").trim()) || undefined;
  }

  // Use thread title from ChatKit API, or fall back to default
  const title = threadTitle || "Rechtsgutachten";

  // Parse sections with hierarchy
  const sections: Section[] = [];
  let mainSectionCount = 0;
  let subSectionCount = 0;
  let subSubSectionCount = 0;

  for (let h = 0; h < headings.length; h++) {
    const heading = headings[h];

    // Stop at sources or end
    if (heading.type === "sources" || heading.type === "end") {
      break;
    }

    // Find where this section ends (next heading or sources/end)
    const nextHeadingIdx = h + 1 < headings.length ? headings[h + 1].idx : lines.length;

    // Extract body (lines between this heading and next)
    const bodyLines = lines.slice(heading.idx + 1, nextHeadingIdx);
    const body = cleanMarkdown(bodyLines.join("\n").trim());

    if (heading.type === "h2") {
      // Main section (## AUSGANGSSITUATION)
      mainSectionCount++;
      subSectionCount = 0;
      subSubSectionCount = 0;

      sections.push({
        heading: heading.text,
        body,
        level: String(mainSectionCount),
        style: "Memo1",
      });
    } else if (heading.type === "h3") {
      // Subsection (### Fristlose Kündigung...)
      subSectionCount++;
      subSubSectionCount = 0;

      sections.push({
        heading: heading.text,
        body,
        level: mainSectionCount > 0 ? `${mainSectionCount}.${subSectionCount}` : String(subSectionCount),
        style: "Memo2",
      });
    } else if (heading.type === "h4") {
      // Sub-subsection (#### Tragfähigen...)
      subSubSectionCount++;

      const level = mainSectionCount > 0 && subSectionCount > 0
        ? `${mainSectionCount}.${subSectionCount}.${subSubSectionCount}`
        : subSectionCount > 0
          ? `${subSectionCount}.${subSubSectionCount}`
          : String(subSubSectionCount);

      sections.push({
        heading: heading.text,
        body,
        level,
        style: "Memo3",
      });
    }
  }

  // Extract sources
  let sources: string | undefined;
  const sourcesHeading = headings.find(h => h.type === "sources");
  if (sourcesHeading) {
    // Find end of sources (either ABSCHLUSS or end of file)
    const endHeading = headings.find(h => h.type === "end");
    const endIdx = endHeading ? endHeading.idx : lines.length;
    const sourceLines = lines.slice(sourcesHeading.idx + 1, endIdx);
    sources = cleanMarkdown(sourceLines.join("\n").trim()) || undefined;
  }

  return {
    report_title: title.slice(0, 80),
    date: new Date().toLocaleDateString("de-DE"),
    executiveSummary,
    sections,
    sources,
  };
}

// Remove markdown formatting that should be converted to Word styles
function cleanMarkdown(text: string): string {
  return text
    // Keep **bold** markers - they're handled by the template
    // Remove standalone ## headers that might be in body text
    .replace(/^#{1,4}\s+/gm, "")
    // Clean up extra whitespace
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
