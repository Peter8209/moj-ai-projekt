import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { mistral } from "@ai-sdk/mistral";
import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";

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

// ================= PROMPT BUILDER =================
function buildPrompt(messages: any[], mode: string) {
  const last = messages[messages.length - 1]?.content || "";

  if (mode === "supervisor") {
    return `
Si AI vedúci diplomovej práce.

Formát:
❌ CHYBY
⚠️ SLABINY
✏️ NÁVRHY
📊 SKÓRE (0–100)

Text:
${last}
`;
  }

  return `
Si profesionálny akademický AI asistent.

Píš:
- prirodzene
- štruktúrovane
- bez AI štýlu

Používateľ:
${last}
`;
}

// ================= ROUTE =================
export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log("POST RECEIVED:", body);

    const messagesRaw = body.messages || [];
    const agent = body.agent || "auto";
    const mode = body.mode || "write";

    if (!messagesRaw.length) {
      return Response.json(
        { error: "EMPTY_MESSAGES" },
        { status: 400 }
      );
    }

    const messages = normalizeMessages(messagesRaw);
    const model = pickModel(agent);

    const prompt = buildPrompt(messages, mode);

    // ================= AI CALL =================
    const result = await generateText({
      model,
      prompt,
      temperature: 0.7,
    });

    // ================= RESPONSE =================
    return Response.json({
      role: "assistant",
      content: result.text,
    });

  } catch (err: any) {
    console.error("AI ERROR:", err);

    return Response.json(
      {
        error: "AI_ERROR",
        detail: err?.message || "unknown",
      },
      { status: 500 }
    );
  }
}