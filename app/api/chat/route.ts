import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { mistral } from "@ai-sdk/mistral";
import { groq } from "@ai-sdk/groq";
import { streamText } from "ai";

// ================= MODEL =================
function pickModel(agent: string) {
  switch (agent) {
    case "claude":
      return anthropic("claude-3-haiku-20240307");

    case "gemini":
      return google("gemini-1.5-flash");

    case "grok":
      return groq("llama3-70b-8192");

    case "mistral":
      return mistral("mistral-small");

    case "openai":
    case "auto":
    default:
      return openai("gpt-4o-mini");
  }
}

// ================= NORMALIZE =================
function normalizeMessages(messages: any[]) {
  return messages.map((m) => ({
    role: m.role,
    content:
      typeof m.content === "string"
        ? m.content
        : Array.isArray(m.content)
        ? m.content.map((c: any) => c?.text || "").join("")
        : "",
  }));
}

// ================= SYSTEM PROMPT =================
function buildSystemPrompt(mode: string) {
  if (mode === "supervisor") {
    return `
Si AI vedúci diplomovej práce.

Hodnoť KRITICKY.

Formát:
❌ CHYBY
⚠️ SLABINY
✏️ NÁVRHY
📊 SKÓRE (0–100)
`;
  }

  return `
Si profesionálny akademický AI asistent.

Píš:
- prirodzene
- štruktúrovane
- bez AI štýlu
`;
}

// ================= ROUTE =================
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const messagesRaw = body.messages || [];
    const agent = body.agent || "auto";
    const mode = body.mode || "write";

    if (!messagesRaw.length) {
      return new Response("EMPTY_MESSAGES", { status: 400 });
    }

    const messages = normalizeMessages(messagesRaw);
    const model = pickModel(agent);
    const systemPrompt = buildSystemPrompt(mode);

    // ================= STREAMING =================
    const result = streamText({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      temperature: 0.7,
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