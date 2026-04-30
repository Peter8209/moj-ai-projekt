import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text || text.length < 50) {
      return Response.json(
        { error: "TEXT_TOO_SHORT" },
        { status: 400 }
      );
    }

    // =====================================================
    // 🎯 SYSTEM PROMPT (REAL ANALÝZA)
    // =====================================================
    const prompt = `
Si expert na akademické plagiátorstvo a AI detekciu.

Analyzuj text z pohľadu:
1. plagiátorstvo (kopírovanie)
2. parafrázovanie bez citácie
3. generický AI štýl (detekovateľný text)
4. opakovanie viet
5. slabá originalita

Vráť STRICT JSON:

{
  "score": number (0-100), 
  "ai_risk": number (0-100),
  "originality": number (0-100),
  "issues": [
    {
      "text": "konkrétny úsek",
      "reason": "prečo je problém",
      "severity": "low | medium | high"
    }
  ],
  "recommendations": [
    "ako to opraviť"
  ]
}

PRAVIDLÁ:
- score = vyššie číslo = väčšie riziko plagiátu
- ai_risk = šanca že AI detektor to odhalí
- originality = unikátnosť textu
- buď konkrétny (žiadne všeobecné kecy)
- analyzuj reálne časti textu

Text:
${text}
`;

    // =====================================================
    // 🤖 AI CALL
    // =====================================================
    const result = await generateText({
      model: openai("gpt-4o-mini"),
      prompt,
      temperature: 0.3, // stabilita
    });

    // =====================================================
    // 🧠 PARSING + VALIDÁCIA
    // =====================================================
    let parsed;

    try {
      parsed = JSON.parse(result.text);
    } catch {
      throw new Error("INVALID_JSON_FROM_AI");
    }

    // =====================================================
    // 🛡️ SAFETY CHECK
    // =====================================================
    if (
      typeof parsed.score !== "number" ||
      !Array.isArray(parsed.issues)
    ) {
      throw new Error("BAD_STRUCTURE");
    }

    // =====================================================
    // 🚀 RESPONSE
    // =====================================================
    return Response.json({
      ok: true,
      score: parsed.score,
      ai_risk: parsed.ai_risk ?? 30,
      originality: parsed.originality ?? 70,
      issues: parsed.issues,
      recommendations: parsed.recommendations ?? [],
      note: "AI-based plagiarism estimation (not official Turnitin)"
    });

  } catch (err: any) {
    console.error("PLAGIARISM ERROR:", err);

    // =====================================================
    // 🔥 FALLBACK (NIKDY NEPADNE)
    // =====================================================
    return Response.json({
      ok: false,
      score: 25,
      ai_risk: 40,
      originality: 60,
      issues: [
        {
          text: "Nepodarilo sa presne analyzovať text",
          reason: "fallback režim",
          severity: "low"
        }
      ],
      recommendations: [
        "Skús rozdeliť text na menšie časti",
        "Skontroluj citácie a zdroje"
      ]
    });
  }
}