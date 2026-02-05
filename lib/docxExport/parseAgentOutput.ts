import type { DocxData, Section } from "./types";

// Match main sections: "## 1)", "## 2)", "# 1.", "1.", "1)"
const MAIN_SECTION_PATTERN = /^#{1,2}\s*(\d+)\)/;

// Match subsections: "### Title" (without number)
const SUBSECTION_PATTERN = /^###\s+(.+)/;

// Match sources section
const SOURCES_PATTERN = /^##?\s*Quellen/i;

export function parseAgentOutput(text: string, threadTitle?: string | null): DocxData {
  const lines = text.split("\n");

  // Find first main section to separate intro from content
  let firstSectionIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (MAIN_SECTION_PATTERN.test(lines[i].trim()) || SOURCES_PATTERN.test(lines[i].trim())) {
      firstSectionIdx = i;
      break;
    }
  }

  // Extract executive summary (everything before first section)
  let executiveSummary: string | undefined;
  if (firstSectionIdx > 0) {
    const introLines = lines.slice(0, firstSectionIdx);
    executiveSummary = introLines.join("\n").trim() || undefined;
  }

  // Use thread title from ChatKit API, or fall back to default
  const title = threadTitle || "Rechtsgutachten";

  // Parse sections
  const sections: Section[] = [];
  let sourcesStartIdx = -1;
  let currentMainLevel = 0;
  let subSectionCount = 0;

  for (let i = firstSectionIdx; i < lines.length && i >= 0; i++) {
    const line = lines[i].trim();

    // Check for sources section
    if (SOURCES_PATTERN.test(line)) {
      sourcesStartIdx = i;
      break;
    }

    // Check for main section (## 1), ## 2), etc.)
    const mainMatch = line.match(MAIN_SECTION_PATTERN);
    if (mainMatch) {
      currentMainLevel = parseInt(mainMatch[1], 10);
      subSectionCount = 0;

      // Find section body (until next section or end)
      const bodyLines: string[] = [];
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j].trim();
        if (MAIN_SECTION_PATTERN.test(nextLine) || SUBSECTION_PATTERN.test(nextLine) || SOURCES_PATTERN.test(nextLine)) {
          break;
        }
        bodyLines.push(lines[j]);
      }

      const heading = line.replace(MAIN_SECTION_PATTERN, "").trim();
      sections.push({
        heading: cleanMarkdown(heading),
        body: cleanMarkdown(bodyLines.join("\n").trim()),
        level: String(currentMainLevel),
        style: "Memo1",
      });
      continue;
    }

    // Check for subsection (### Title)
    const subMatch = line.match(SUBSECTION_PATTERN);
    if (subMatch && currentMainLevel > 0) {
      subSectionCount++;

      // Find subsection body
      const bodyLines: string[] = [];
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j].trim();
        if (MAIN_SECTION_PATTERN.test(nextLine) || SUBSECTION_PATTERN.test(nextLine) || SOURCES_PATTERN.test(nextLine)) {
          break;
        }
        bodyLines.push(lines[j]);
      }

      sections.push({
        heading: cleanMarkdown(subMatch[1]),
        body: cleanMarkdown(bodyLines.join("\n").trim()),
        level: `${currentMainLevel}.${subSectionCount}`,
        style: "Memo2",
      });
    }
  }

  // Extract sources
  let sources: string | undefined;
  if (sourcesStartIdx > 0) {
    const sourceLines = lines.slice(sourcesStartIdx + 1);
    sources = sourceLines.join("\n").trim() || undefined;
  }

  return {
    report_title: title.slice(0, 80), // Limit title length
    date: new Date().toLocaleDateString("de-DE"),
    executiveSummary: executiveSummary ? cleanMarkdown(executiveSummary) : undefined,
    sections,
    sources: sources ? cleanMarkdown(sources) : undefined,
  };
}

// Remove markdown formatting that should be converted to Word styles
function cleanMarkdown(text: string): string {
  return text
    // Keep **bold** markers - they're handled by the template
    // Remove ## headers that might be in body text
    .replace(/^#{1,3}\s*/gm, "")
    // Clean up extra whitespace
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
