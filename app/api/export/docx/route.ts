import { cookies } from "next/headers";
import {
  fetchLatestThreadContent,
  isThreadContentError,
} from "@/lib/export/threadContent";
import { parseAgentOutput } from "@/lib/docxExport/parseAgentOutput";
import { generateDocxBuffer } from "@/lib/docxExport/serverGenerateDocx";
import {
  buildContentDisposition,
  buildDocxFilename,
} from "@/lib/docxExport/filename";

export const runtime = "nodejs";

const SESSION_COOKIE_NAME = "chatkit_session_id";
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function GET(): Promise<Response> {
  const requestId = createRequestId();
  const openaiApiKey = process.env.OPENAI_API_KEY;
  console.info("[docx-export] request:start", {
    requestId,
    hasApiKey: Boolean(openaiApiKey),
  });

  if (!openaiApiKey) {
    console.warn("[docx-export] request:missing_api_key", { requestId });
    return errorResponse(
      "Missing OPENAI_API_KEY environment variable",
      500,
      requestId
    );
  }

  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  console.info("[docx-export] request:cookie", {
    requestId,
    hasSessionCookie: Boolean(userId),
  });

  if (!userId) {
    return errorResponse("No session found", 400, requestId);
  }

  try {
    const thread = await fetchLatestThreadContent({
      openaiApiKey,
      userId,
      logContext: { requestId, source: "docx-export" },
    });
    const data = parseAgentOutput(thread.text, thread.threadTitle);
    console.info("[docx-export] document:parsed", {
      requestId,
      threadId: maskValue(thread.threadId),
      titleLength: data.report_title.length,
      sectionCount: data.sections.length,
      hasSources: Boolean(data.sources),
    });
    const buffer = await generateDocxBuffer(data);
    const filename = buildDocxFilename(data.report_title, data.date);
    console.info("[docx-export] response:ready", {
      requestId,
      byteLength: buffer.byteLength,
      filename,
    });

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": DOCX_MIME,
        "Content-Disposition": buildContentDisposition(filename),
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Export-Request-Id": requestId,
      },
    });
  } catch (error) {
    console.error("[docx-export] request:failed", { requestId, error });

    if (isThreadContentError(error)) {
      return errorResponse(error.message, error.status, requestId);
    }

    return errorResponse("Unexpected error while creating DOCX", 500, requestId);
  }
}

function errorResponse(message: string, status: number, requestId: string): Response {
  return new Response(
    `Download konnte nicht erstellt werden: ${message}\nFehler-ID: ${requestId}`,
    {
      status,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Export-Request-Id": requestId,
      },
    }
  );
}

function createRequestId(): string {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

function maskValue(value: string): string {
  if (value.length <= 10) return "***";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}
