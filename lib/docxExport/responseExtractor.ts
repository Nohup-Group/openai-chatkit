import type { ExtractedResponse } from "./types";

export function extractLastAgentResponse(): ExtractedResponse | null {
  const chatKit = document.querySelector("openai-chatkit");
  const root = chatKit?.shadowRoot || chatKit;
  if (!root) return null;

  const selectors = [
    '[data-role="assistant"]',
    '[data-testid="assistant-message"]',
    ".assistant-message",
    ".message-content",
  ];

  for (const selector of selectors) {
    const messages = root.querySelectorAll(selector);
    if (messages.length > 0) {
      const last = messages[messages.length - 1];
      const html = last.innerHTML || "";
      const text = htmlToTextWithBold(html);
      return { text, html };
    }
  }

  return null;
}

function htmlToTextWithBold(html: string): string {
  return html
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**")
    .replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**")
    .replace(/<em[^>]*>(.*?)<\/em>/gi, "_$1_")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
