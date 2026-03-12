import type { DocxData, Section } from "./types";

// Match markdown headers: # HEADING, ## Heading, ### Heading, #### Heading
const H1_PATTERN = /^#\s+(.+)$/;
const H2_PATTERN = /^##\s+(.+)$/;
const H3_PATTERN = /^###\s+(.+)$/;
const H4_PATTERN = /^####\s+(.+)$/;

// Match sources section (# or ## level)
const SOURCES_PATTERN = /^#{1,2}\s*QUELLEN\s*$/i;

// Match end section (to stop parsing)
const END_PATTERN = /^#{1,2}\s*ABSCHLUSS\s*$/i;

type HeadingType = "h1" | "h2" | "h3" | "h4" | "sources" | "end";

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

  // Check from most specific (####) to least specific (#)
  const h4Match = trimmed.match(H4_PATTERN);
  if (h4Match) {
    return { type: "h4", text: h4Match[1].trim() };
  }

  const h3Match = trimmed.match(H3_PATTERN);
  if (h3Match) {
    return { type: "h3", text: h3Match[1].trim() };
  }

  const h2Match = trimmed.match(H2_PATTERN);
  if (h2Match) {
    return { type: "h2", text: h2Match[1].trim() };
  }

  const h1Match = trimmed.match(H1_PATTERN);
  if (h1Match) {
    return { type: "h1", text: h1Match[1].trim() };
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

  // Determine the top-level heading type used by the agent (# or ##)
  const hasH1 = headings.some(h => h.type === "h1");

  // Find first content section to separate intro from content
  const firstSectionType = hasH1 ? "h1" : "h2";
  const firstSectionIdx = headings.findIndex(h => h.type === firstSectionType);
  const firstSectionLineIdx = firstSectionIdx >= 0 ? headings[firstSectionIdx].idx : -1;

  // Extract executive summary (everything before first section heading)
  let executiveSummary: string | undefined;
  if (firstSectionLineIdx > 0) {
    const introLines = lines.slice(0, firstSectionLineIdx);
    executiveSummary = cleanMarkdown(introLines.join("\n").trim()) || undefined;
  }

  // Use thread title from ChatKit API, or fall back to default
  const title = threadTitle || "Rechtsgutachten";

  // Parse sections with hierarchy
  // When agent uses #/##/###: # → H1RP, ## → H2RP, ### → H3RP
  // When agent uses only ##/###/####: ## → H1RP, ### → H2RP, #### → H3RP
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

    // Map heading types to styles based on whether agent uses h1
    const isMainSection = hasH1 ? heading.type === "h1" : heading.type === "h2";
    const isSubSection = hasH1 ? heading.type === "h2" : heading.type === "h3";
    const isSubSubSection = hasH1 ? heading.type === "h3" || heading.type === "h4" : heading.type === "h4";

    if (isMainSection) {
      mainSectionCount++;
      subSectionCount = 0;
      subSubSectionCount = 0;

      sections.push({
        heading: heading.text,
        body,
        level: String(mainSectionCount),
        style: "H1RP",
      });
    } else if (isSubSection) {
      subSectionCount++;
      subSubSectionCount = 0;

      sections.push({
        heading: heading.text,
        body,
        level: mainSectionCount > 0 ? `${mainSectionCount}.${subSectionCount}` : String(subSectionCount),
        style: "H2RP",
      });
    } else if (isSubSubSection) {
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
        style: "H3RP",
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
    date: new Date().toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" }),
    executiveSummary,
    sections,
    sources,
  };
}

// Remove markdown formatting that should be converted to Word styles
function cleanMarkdown(text: string): string {
  return text
    // Keep **bold** markers - they're handled by the template
    // Remove standalone # headers that might be in body text
    .replace(/^#{1,4}\s+/gm, "")
    // Clean up extra whitespace
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
