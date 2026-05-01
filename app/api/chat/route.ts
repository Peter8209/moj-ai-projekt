import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { mistral } from "@ai-sdk/mistral";
import { groq } from "@ai-sdk/groq";
import { streamText } from "ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ================= TYPES =================
type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

// ================= MODEL =================
function pickModel(agent: string) {
  try {
    switch (agent) {
      case "claude":
        return anthropic("claude-3-haiku-20240307");

      case "gemini":
        return google("gemini-1.5-flash");

      case "grok":
        return groq("llama3-70b-8192");

      case "mistral":
        return mistral("mistral-small");

      default:
        return openai("gpt-4o-mini");
    }
  } catch {
    return openai("gpt-4o-mini");
  }
}

// ================= NORMALIZE =================
function normalizeMessages(messages: any[]): ChatMessage[] {
  return messages
    .filter((m) => m?.role && m?.content)
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content:
        typeof m.content === "string"
          ? m.content
          : Array.isArray(m.content)
          ? m.content.map((c: any) => c?.text || "").join("")
          : "",
    }));
}

// ================= SYSTEM =================
function buildSystemPrompt(mode: string) {
  if (mode === "supervisor") {
    return `
Si AI vedúci diplomovej práce.

Formát:
=== VÝSTUP ===
=== ANALÝZA ===
=== SKÓRE ===
=== ODPORÚČANIA ===
`;
  }

  return `
Si profesionálny AI asistent.
Píš prirodzene, odborne a štruktúrovane.
`;
}

// ================= ROUTE =================
export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "MISSING_API_KEY",
        }),
        { status: 500 }
      );
    }

    const body = await req.json();

    const messagesRaw = body.messages || [];
    const agent = body.agent || "auto";
    const mode = body.mode || "write";

    if (!messagesRaw.length) {
      return new Response("EMPTY_MESSAGES", { status: 400 });
    }

    const messages = normalizeMessages(messagesRaw);
    const model = pickModel(agent);
    const system = buildSystemPrompt(mode);

    const result = await streamText({
      model,
      system,
      messages: messages as any, // 🔥 kľúčový fix
      temperature: 0.7,
      maxTokens: 1000,
    });

    return result.toTextStreamResponse();

  } catch (err: any) {
    console.error("AI ERROR:", err);

    return new Response(
      JSON.stringify({
        error: "AI_ERROR",
        detail: err?.message || "unknown",
      }),
      { status: 500 }
    );
  }
}