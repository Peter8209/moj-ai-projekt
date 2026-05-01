import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { mistral } from "@ai-sdk/mistral";
import { groq } from "@ai-sdk/groq";
import { streamText, type CoreMessage } from "ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

      case "openai":
      case "auto":
      default:
        return openai("gpt-4o-mini");
    }
  } catch {
    // 🔥 fallback ak provider padne
    return openai("gpt-4o-mini");
  }
}

// ================= NORMALIZE =================
function normalizeMessages(messages: any[]): CoreMessage[] {
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
    })) as CoreMessage[];
}

// ================= SYSTEM PROMPT =================
function buildSystemPrompt(mode: string) {
  if (mode === "supervisor") {
    return `
Si AI vedúci diplomovej práce.

Hodnoť KRITICKY a profesionálne.

Formát odpovede:
=== VÝSTUP ===
=== ANALÝZA ===
=== SKÓRE ===
=== ODPORÚČANIA ===

Buď konkrétny, priamy a odborný.
`;
  }

  return `
Si profesionálny akademický AI asistent.

Pravidlá:
- píš prirodzene (ako človek)
- používaj štruktúru
- nehalucinuj zdroje
- ak si neistý, povedz to

Štýl:
- odborný
- jasný
- bez AI tónu
`;
}

// ================= ROUTE =================
export async function POST(req: Request) {
  try {
    // 🔥 API KEY CHECK (kritické pre produkciu)
    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "MISSING_API_KEY",
          detail: "OPENAI_API_KEY nie je nastavený",
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
      messages,
      temperature: 0.7,
      maxTokens: 1000,
    });

    // 🔥 SPRÁVNY STREAM RETURN
    return result.toTextStreamResponse();

  } catch (err: any) {
    console.error("AI ERROR:", err);

    // 🔥 fallback aby frontend nespadol
    return new Response(
      JSON.stringify({
        error: "AI_ERROR",
        detail: err?.message || "unknown",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}