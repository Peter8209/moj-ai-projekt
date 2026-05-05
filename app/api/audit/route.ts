import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type SavedProfile = {
  type?: string;
  level?: string;
  title?: string;
  topic?: string;
  field?: string;
  supervisor?: string;
  citation?: string;
  language?: string;
  workLanguage?: string;
  annotation?: string;
  goal?: string;
  methodology?: string;
  keywords?: string[];
  keywordsList?: string[];
};

type AuditRequest = {
  text: string;
  checkType?: string;
  outputType?: string;
  citationStyle?: string;
  activeProfile?: SavedProfile | null;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AuditRequest;

    const text = body.text?.trim();
    const checkType = body.checkType || 'Všetko';
    const outputType = body.outputType || 'Detailná správa';
    const citationStyle =
      body.citationStyle || body.activeProfile?.citation || 'ISO 690';

    const profile = body.activeProfile;

    if (!text || text.length < 300) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Text je príliš krátky. Vlož aspoň 300 znakov.',
        },
        { status: 400 }
      );
    }

    const prompt = `
Si odborný akademický hodnotiteľ, metodológ a prísny vedúci záverečnej práce.

Tvojou úlohou je vykonať AUDIT KVALITY AKADEMICKEJ PRÁCE.

PROFIL PRÁCE:
- Názov práce: ${profile?.title || 'nezadané'}
- Téma: ${profile?.topic || 'nezadané'}
- Typ práce: ${profile?.type || 'akademická práca'}
- Úroveň: ${profile?.level || 'nezadané'}
- Odbor: ${profile?.field || 'nezadané'}
- Jazyk práce: ${profile?.workLanguage || profile?.language || 'slovenčina'}
- Citačný štýl: ${citationStyle}
- Cieľ práce: ${profile?.goal || 'nezadané'}
- Metodológia: ${profile?.methodology || 'nezadané'}
- Kľúčové slová: ${
      profile?.keywords?.join(', ') ||
      profile?.keywordsList?.join(', ') ||
      'nezadané'
    }

NASTAVENIE AUDITU:
- Typ kontroly: ${checkType}
- Typ výstupu: ${outputType}

TEXT NA AUDIT:
"""
${text}
"""

Vyhodnoť text prísne, odborne a prakticky. Nepíš všeobecné frázy. Uvádzaj konkrétne problémy a konkrétne odporúčania.

Vráť odpoveď v tomto formáte:

=== CELKOVÉ HODNOTENIE ===
Skóre 0–100:
Krátke zdôvodnenie:

=== LOGIKA A NADVÄZNOSŤ ===
Skóre 0–100:
Silné stránky:
Slabé miesta:
Čo opraviť:

=== ARGUMENTÁCIA ===
Skóre 0–100:
Problémy:
Odporúčania:

=== ŠTRUKTÚRA TEXTU ===
Skóre 0–100:
Vyhodnoť členenie, nadväznosť odsekov a akademickú organizáciu textu.

=== METODOLÓGIA ===
Skóre 0–100:
Vyhodnoť, či text zodpovedá cieľu a metodológii práce.

=== AKADEMICKÝ ŠTÝL ===
Skóre 0–100:
Vyhodnoť formálnosť, odbornosť, štylistiku a jazyk.

=== CITÁCIE A ZDROJE ===
Skóre 0–100:
Vyhodnoť prácu so zdrojmi podľa normy ${citationStyle}.

=== RIZIKOVÉ PASÁŽE ===
Vypíš pasáže alebo typy viet, ktoré pôsobia slabo, všeobecne, neodborne alebo genericky.

=== KONKRÉTNE ODPORÚČANIA NA OPRAVU ===
Vypíš presné kroky, čo má autor doplniť, prepísať alebo rozšíriť.

=== UKÁŽKA LEPŠIEHO PREPISU ===
Ukáž, ako by sa dala slabšia časť textu prepísať akademickejšie.

=== ZÁVER ===
Napíš, či je text vhodný na odovzdanie, alebo potrebuje úpravy.
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      temperature: 0.25,
      messages: [
        {
          role: 'system',
          content:
            'Si prísny, ale konštruktívny akademický školiteľ a metodológ. Hodnotíš kvalitu textu, nie autora.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const result = completion.choices[0]?.message?.content || '';

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    console.error('AUDIT_ERROR:', error);

    return NextResponse.json(
      {
        ok: false,
        error: 'Nepodarilo sa vykonať audit kvality práce.',
      },
      { status: 500 }
    );
  }
}