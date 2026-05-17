import { cookies } from "next/headers";
import {
  fetchLatestThreadContent,
  isThreadContentError,
} from "@/lib/export/threadContent";

export const runtime = "edge";

const SESSION_COOKIE_NAME = "chatkit_session_id";

export async function GET(): Promise<Response> {
  const requestId = createRequestId();
  const openaiApiKey = process.env.OPENAI_API_KEY;
  console.info("[thread-content] request:start", {
    requestId,
    hasApiKey: Boolean(openaiApiKey),
  });

  if (!openaiApiKey) {
    console.warn("[thread-content] request:missing_api_key", { requestId });
    return Response.json(
      { error: "Missing API key", requestId },
      { status: 500 }
    );
  }

  // Get userId from cookie (set during session creation)
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  console.info("[thread-content] request:cookie", {
    requestId,
    hasSessionCookie: Boolean(userId),
  });

  if (!userId) {
    return Response.json({ error: "No session found", requestId }, { status: 400 });
  }

  try {
    const result = await fetchLatestThreadContent({
      openaiApiKey,
      userId,
      logContext: { requestId, source: "thread-content" },
    });
    console.info("[thread-content] request:ready", {
      requestId,
      threadId: maskValue(result.threadId),
      textLength: result.text.length,
    });

    return Response.json({
      text: result.text,
      threadId: result.threadId,
      threadTitle: result.threadTitle,
      requestId,
    });
  } catch (error) {
    console.error("[thread-content] request:failed", { requestId, error });

    if (isThreadContentError(error)) {
      return Response.json(
        { error: error.message, details: error.details, requestId },
        { status: error.status }
      );
    }

    return Response.json(
      { error: "Unexpected error", details: String(error), requestId },
      { status: 500 }
    );
  }
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
