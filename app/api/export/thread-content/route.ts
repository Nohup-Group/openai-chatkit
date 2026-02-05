import { cookies } from "next/headers";

export const runtime = "edge";

const SESSION_COOKIE_NAME = "chatkit_session_id";
const CHATKIT_API_BASE = "https://api.openai.com";

interface ThreadItem {
  type: string;
  content?: Array<{ type: string; text?: string }>;
}

interface ThreadsResponse {
  data?: Array<{ id: string }>;
}

interface ItemsResponse {
  data?: ThreadItem[];
}

export async function GET(): Promise<Response> {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    return Response.json({ error: "Missing API key" }, { status: 500 });
  }

  // Get userId from cookie (set during session creation)
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!userId) {
    return Response.json({ error: "No session found" }, { status: 400 });
  }

  const headers = {
    Authorization: `Bearer ${openaiApiKey}`,
    "OpenAI-Beta": "chatkit_beta=v1",
  };

  try {
    // 1. Get latest thread for this user
    const threadsRes = await fetch(
      `${CHATKIT_API_BASE}/v1/chatkit/threads?user=${encodeURIComponent(userId)}&limit=1&order=desc`,
      { headers }
    );

    if (!threadsRes.ok) {
      const error = await threadsRes.text();
      console.error("[thread-content] Failed to list threads:", error);
      return Response.json(
        { error: "Failed to list threads", details: error },
        { status: threadsRes.status }
      );
    }

    const threads = (await threadsRes.json()) as ThreadsResponse;
    const threadId = threads.data?.[0]?.id;

    if (!threadId) {
      return Response.json({ error: "No thread found for user" }, { status: 404 });
    }

    // 2. Get items from that thread
    const itemsRes = await fetch(
      `${CHATKIT_API_BASE}/v1/chatkit/threads/${threadId}/items?order=desc&limit=50`,
      { headers }
    );

    if (!itemsRes.ok) {
      const error = await itemsRes.text();
      console.error("[thread-content] Failed to get thread items:", error);
      return Response.json(
        { error: "Failed to get thread items", details: error },
        { status: itemsRes.status }
      );
    }

    const items = (await itemsRes.json()) as ItemsResponse;

    // 3. Find last assistant message
    const assistantMsg = items.data?.find(
      (item) => item.type === "assistant_message"
    );

    if (!assistantMsg) {
      return Response.json(
        { error: "No assistant message found in thread" },
        { status: 404 }
      );
    }

    // 4. Extract text from content array
    const text =
      assistantMsg.content
        ?.filter((c) => c.type === "output_text")
        ?.map((c) => c.text)
        ?.filter(Boolean)
        ?.join("\n") ?? null;

    if (!text) {
      return Response.json(
        { error: "Assistant message has no text content" },
        { status: 404 }
      );
    }

    return Response.json({ text, threadId });
  } catch (error) {
    console.error("[thread-content] Unexpected error:", error);
    return Response.json(
      { error: "Unexpected error", details: String(error) },
      { status: 500 }
    );
  }
}
