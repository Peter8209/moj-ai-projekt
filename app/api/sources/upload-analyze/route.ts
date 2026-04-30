import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

export async function POST(req: Request) {
  try {
    const { text, citationStyle = "APA" } = await req.json();

    if (!text || text.length < 100) {
      return Response.json({ error: "TEXT_TOO_SHORT" }, { status: 400 });
    }

    const prompt = `
Analyzuj akademický zdroj (PDF).

Vráť JSON:
{
  "summary": "stručné zhrnutie",
  "key_points": ["bod1", "bod2"],
  "methodology": "aká metodológia je použitá",
  "usable_for": "na čo sa dá použiť v práci",
  "risks": "slabiny zdroja",
  "citation": "citácia v štýle ${citationStyle}"
}

Text:
${text.substring(0, 12000)}
`;

    const result = await generateText({
      model: openai("gpt-4o-mini"),
      prompt,
    });

    try {
      const parsed = JSON.parse(result.text);

      return Response.json({
        ok: true,
        analysis: parsed,
      });

    } catch {
      return Response.json({
        ok: true,
        analysis: {
          summary: "Nepodarilo sa analyzovať",
          key_points: [],
          methodology: "",
          usable_for: "",
          risks: "",
          citation: ""
        }
      });
    }

  } catch (err: any) {
    console.error("PDF ANALYZE ERROR:", err);

    return Response.json({
      error: "ANALYZE_FAILED",
      detail: err?.message || "unknown"
    }, { status: 500 });
  }
}