import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;

type ImproveRequest = {
  text?: string;
  language?: string;
  workType?: string;
  citationStyle?: string;
  mode?: 'full' | 'style' | 'logic' | 'citations';
};

function cleanText(value: unknown) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ImproveRequest;

    const text = cleanText(body.text);
    const language = body.language || 'slovenčina';
    const workType = body.workType || 'akademický text';
    const citationStyle = body.citationStyle || 'ISO 690';
    const mode = body.mode || 'full';

    if (!text) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Chýba text na zlepšenie.',
        },
        { status: 400 },
      );
    }

    const modeInstruction =
      mode === 'style'
        ? 'Zameraj sa najmä na štylistiku, akademický jazyk, plynulosť viet a odborné formulácie.'
        : mode === 'logic'
          ? 'Zameraj sa najmä na logiku, nadväznosť, argumentáciu, duplicity a slabé miesta textu.'
          : mode === 'citations'
            ? `Zameraj sa najmä na citácie, odkazy v texte a citačnú normu ${citationStyle}.`
            : 'Urob celkový audit kvality vrátane štylistiky, logiky, odbornej presnosti, citácií a praktických úprav.';

    const prompt = `
Si odborný akademický editor a školiteľ.

Jazyk výstupu: ${language}
Typ práce: ${workType}
Citačná norma: ${citationStyle}

Úloha:
Používateľ nechce iba kritiku. Musíš uviesť aj konkrétne prepísané vety a zapracované pripomienky.

Režim kontroly:
${modeInstruction}

Text na kontrolu:
${text}

Povinná štruktúra výstupu:

1. Stručné zhrnutie kvality textu
Uveď 3 až 5 viet.

2. Nájdené problémy
Uveď konkrétne problémy v texte. Nepíš všeobecné frázy.

3. Konkrétne prepísané vety
Pri každej úprave použi formát:
Pôvodná veta:
Problém:
Opravená veta:

4. Zapracovaná upravená verzia textu
Prepíš celý dodaný text do lepšej akademickej podoby. Zachovaj význam, ale zlepši formulácie, logiku a odborný štýl.

5. Odporúčania na ďalšie zlepšenie
Uveď konkrétne odporúčania.

Pravidlá:
- Nepíš markdown znaky typu ###, **, ---.
- Nepíš len kritiku.
- Vždy ponúkni konkrétnu opravenú formuláciu.
- Nevymýšľaj zdroje, autorov, DOI ani citácie.
- Ak niečo chýba, napíš: údaj je potrebné doplniť.
- Výstup musí byť vhodný do akademickej práce.
`.trim();

    const result = await generateText({
      model: openai('gpt-4.1-mini'),
      prompt,
      temperature: 0.35,
    });

    return NextResponse.json({
      ok: true,
      result: result.text,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Nastala chyba pri vytváraní návrhov zlepšení.';

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}