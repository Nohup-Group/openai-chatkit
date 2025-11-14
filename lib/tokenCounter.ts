import { encoding_for_model } from "tiktoken";

type ModelName = "gpt-4" | "gpt-4o" | "gpt-4o-mini" | "gpt-3.5-turbo";

/**
 * Count tokens for a given text and model
 */
export function countTokens(text: string, model: ModelName = "gpt-4o-mini"): number {
  try {
    const encoding = encoding_for_model(model);
    const tokens = encoding.encode(text);
    const count = tokens.length;
    encoding.free(); // Free up memory
    return count;
  } catch (error) {
    console.error("Error counting tokens:", error);
    // Fallback: rough estimate (4 chars per token)
    return Math.ceil(text.length / 4);
  }
}

/**
 * Estimate tokens for a conversation message
 * Messages have additional tokens for formatting
 */
export function countMessageTokens(
  role: "user" | "assistant" | "system",
  content: string,
  model: ModelName = "gpt-4o-mini"
): number {
  // Each message has overhead: role, formatting, etc.
  const messageOverhead = 4; // Approximate overhead per message
  const contentTokens = countTokens(content, model);
  const roleTokens = countTokens(role, model);

  return messageOverhead + roleTokens + contentTokens;
}
