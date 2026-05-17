const DEFAULT_CHATKIT_API_BASE = "https://api.openai.com";

type ThreadItemContent = {
  type: string;
  text?: string;
};

type ThreadItem = {
  type: string;
  content?: ThreadItemContent[] | string;
  text?: string;
  [key: string]: unknown;
};

type ThreadsResponse = {
  data?: Array<{ id: string; title?: string | null }>;
};

type ItemsResponse = {
  data?: ThreadItem[];
};

export type LatestThreadContent = {
  text: string;
  threadId: string;
  threadTitle?: string | null;
  itemTypes: string[];
};

type LogContext = {
  requestId: string;
  source: string;
  userId?: string;
};

export class ThreadContentError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ThreadContentError";
    this.status = status;
    this.details = details;
  }
}

export async function fetchLatestThreadContent({
  openaiApiKey,
  userId,
  chatkitApiBase = process.env.CHATKIT_API_BASE ?? DEFAULT_CHATKIT_API_BASE,
  logContext,
}: {
  openaiApiKey: string;
  userId: string;
  chatkitApiBase?: string;
  logContext?: LogContext;
}): Promise<LatestThreadContent> {
  const apiBase = chatkitApiBase.replace(/\/+$/, "");
  const log = createLog(logContext, userId);
  const headers = {
    Authorization: `Bearer ${openaiApiKey}`,
    "OpenAI-Beta": "chatkit_beta=v1",
  };

  log("list_threads:start");
  const threadsRes = await fetch(
    `${apiBase}/v1/chatkit/threads?user=${encodeURIComponent(userId)}&limit=1&order=desc`,
    { headers }
  );
  log("list_threads:response", { status: threadsRes.status, ok: threadsRes.ok });

  if (!threadsRes.ok) {
    const error = await threadsRes.text();
    throw new ThreadContentError("Failed to list threads", threadsRes.status, error);
  }

  const threads = (await threadsRes.json()) as ThreadsResponse;
  const threadId = threads.data?.[0]?.id;
  const threadTitle = threads.data?.[0]?.title;

  if (!threadId) {
    log("list_threads:no_thread");
    throw new ThreadContentError("No thread found for user", 404);
  }

  log("get_items:start", {
    threadId: maskValue(threadId),
    hasThreadTitle: Boolean(threadTitle),
  });
  const itemsRes = await fetch(
    `${apiBase}/v1/chatkit/threads/${threadId}/items?order=desc&limit=50`,
    { headers }
  );
  log("get_items:response", { status: itemsRes.status, ok: itemsRes.ok });

  if (!itemsRes.ok) {
    const error = await itemsRes.text();
    throw new ThreadContentError("Failed to get thread items", itemsRes.status, error);
  }

  const items = (await itemsRes.json()) as ItemsResponse;
  const itemTypes = items.data?.map((item) => item.type) ?? [];
  const assistantMsg = items.data?.find(isAssistantMessage);
  log("get_items:parsed", {
    itemCount: items.data?.length ?? 0,
    itemTypes,
    hasAssistantMessage: Boolean(assistantMsg),
  });

  if (!assistantMsg) {
    throw new ThreadContentError("No assistant message found in thread", 404, {
      availableTypes: itemTypes,
      itemCount: items.data?.length ?? 0,
    });
  }

  const text = extractAssistantText(assistantMsg);
  if (!text) {
    log("assistant_text:missing", {
      messageKeys: Object.keys(assistantMsg),
    });
    throw new ThreadContentError("Assistant message has no text content", 404, {
      messageStructure: Object.keys(assistantMsg),
    });
  }

  log("assistant_text:ready", { textLength: text.length });
  return { text, threadId, threadTitle, itemTypes };
}

export function isThreadContentError(error: unknown): error is ThreadContentError {
  return error instanceof ThreadContentError;
}

function isAssistantMessage(item: ThreadItem): boolean {
  return (
    item.type === "chatkit.assistant_message" ||
    item.type === "assistant_message"
  );
}

function extractAssistantText(item: ThreadItem): string | null {
  if (Array.isArray(item.content)) {
    const text = item.content
      .filter((content) => content.type === "output_text" || content.type === "text")
      .map((content) => content.text)
      .filter(Boolean)
      .join("\n");

    if (text) return text;
  }

  if (typeof item.text === "string" && item.text) {
    return item.text;
  }

  if (typeof item.content === "string" && item.content) {
    return item.content;
  }

  return null;
}

function createLog(context: LogContext | undefined, userId: string) {
  return (event: string, details?: Record<string, unknown>) => {
    if (!context) return;

    console.info(`[${context.source}] ${event}`, {
      requestId: context.requestId,
      user: maskValue(context.userId ?? userId),
      ...details,
    });
  };
}

function maskValue(value: string): string {
  if (value.length <= 10) return "***";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}
