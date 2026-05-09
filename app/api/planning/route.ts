import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GLOBAL_ACADEMIC_SYSTEM_PROMPT } from '@/lib/ai-system-prompt';
import { getZedperaErrorMessage } from '@/lib/api-error-messages';

export const runtime = 'nodejs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type SavedProfile = {
  id?: string;
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
  savedAt?: string;
};

type PlanningRequest = {
  deadline?: string;
  planType?: string;
  currentState?: string;
  availableTime?: string;
  priority?: string;
  activeProfile?: SavedProfile | null;
};

function cleanText(value: unknown) {
  return String(value || '')
    .replace(/\uFEFF/g, '')
    .replace(/\u200B/g, '')
    .replace(/\u200C/g, '')
    .replace(/\u200D/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

function getProfileKeywords(profile?: SavedProfile | null) {
  if (!profile) return 'nezadané';

  if (Array.isArray(profile.keywords) && profile.keywords.length > 0) {
    return profile.keywords.join(', ');
  }

  if (Array.isArray(profile.keywordsList) && profile.keywordsList.length > 0) {
    return profile.keywordsList.join(', ');
  }

  return 'nezadané';
}

function buildPlanningPrompt({
  deadline,
  planType,
  currentState,
  availableTime,
  priority,
  activeProfile,
}: {
  deadline: string;
  planType: string;
  currentState: string;
  availableTime: string;
  priority: string;
  activeProfile?: SavedProfile | null;
}) {
  return `
Si akademický plánovač, školiteľ záverečných prác a projektový manažér študentských prác.

Tvojou úlohou je vytvoriť praktický a realistický plán práce.

VÝSTUP MUSÍ BYŤ V SLOVENČINE.

PROFIL PRÁCE:
- Názov práce: ${activeProfile?.title || 'nezadané'}
- Téma: ${activeProfile?.topic || 'nezadané'}
- Typ práce: ${activeProfile?.type || 'akademická práca'}
- Úroveň: ${activeProfile?.level || 'nezadané'}
- Odbor: ${activeProfile?.field || 'nezadané'}
- Jazyk práce: ${activeProfile?.workLanguage || activeProfile?.language || 'slovenčina'}
- Citačný štýl: ${activeProfile?.citation || 'nezadané'}
- Cieľ práce: ${activeProfile?.goal || 'nezadané'}
- Metodológia: ${activeProfile?.methodology || 'nezadané'}
- Kľúčové slová: ${getProfileKeywords(activeProfile)}

NASTAVENIE PLÁNU:
- Termín odovzdania: ${deadline}
- Typ plánu: ${planType}
- Dostupný čas: ${availableTime || 'nešpecifikované'}
- Priorita: ${priority}

AKTUÁLNY STAV PRÁCE:
"""
${currentState}
"""

Vytvor plán tak, aby bol použiteľný pre študenta, ktorý potrebuje jasný postup.

Požiadavky:
- plán má byť konkrétny, nie všeobecný,
- rozdeľ prácu na etapy,
- uveď priority,
- uveď, čo má študent robiť ako prvé,
- uveď kontrolné body,
- uveď riziká omeškania,
- uveď odporúčanie, čo delegovať alebo konzultovať,
- ak chýba profil práce, vytvor plán aj bez neho,
- ak je termín blízko, vytvor krízový plán,
- ak je termín ďaleko, vytvor pokojný akademický plán.

Vráť odpoveď v tomto formáte:

=== STRUČNÉ ZHRNUTIE PLÁNU ===
Krátko vysvetli, čo je najdôležitejšie.

=== PRIORITY ===
1.
2.
3.

=== ETAPY PRÁCE ===
Etapa 1:
Etapa 2:
Etapa 3:
Etapa 4:

=== KONKRÉTNY HARMONOGRAM ===
Vytvor plán podľa typu: ${planType}.
Použi dni, týždne alebo kapitoly podľa zvoleného typu.

=== ČO UROBIŤ AKO PRVÉ ===
Napíš prvé 3 konkrétne kroky.

=== KONTROLNÉ BODY ===
Vypíš body, podľa ktorých študent zistí, že postupuje správne.

=== RIZIKÁ A ČO SI STRÁŽIŤ ===
Vypíš riziká, ktoré môžu spôsobiť meškanie alebo zlú kvalitu práce.

=== ODPORÚČANÝ POSTUP KOMUNIKÁCIE S VEDÚCIM ===
Navrhni, kedy a čo poslať vedúcemu práce.

=== ZÁVEREČNÉ ODPORÚČANIE ===
Krátke praktické odporúčanie pre študenta.
`;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PlanningRequest;

    const deadline = cleanText(body.deadline);
    const planType = cleanText(body.planType) || 'Týždenný plán';
    const currentState = cleanText(body.currentState);
    const availableTime = cleanText(body.availableTime);
    const priority = cleanText(body.priority) || 'Dokončenie práce';
    const activeProfile = body.activeProfile || null;

    if (!deadline) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Chýba termín odovzdania.',
        },
        { status: 400 },
      );
    }

    if (!currentState || currentState.length < 20) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Aktuálny stav práce je príliš krátky. Napíš aspoň 20 znakov.',
        },
        { status: 400 },
      );
    }

    const prompt = buildPlanningPrompt({
      deadline,
      planType,
      currentState,
      availableTime,
      priority,
      activeProfile,
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      temperature: 0.25,
      messages: [
        {
          role: 'system',
          content:
            'Si akademický plánovač, školiteľ záverečných prác a projektový manažér. Vytváraš praktické, realistické a použiteľné plány pre študentov.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const plan = completion.choices[0]?.message?.content || '';

    if (!plan.trim()) {
      return NextResponse.json(
        {
          ok: false,
          error: 'AI nevrátila plán práce.',
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      plan,
      meta: {
        deadline,
        planType,
        availableTime,
        priority,
        profileTitle: activeProfile?.title || null,
      },
    });
  } catch (error) {
    console.error('PLANNING_ERROR:', error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Nepodarilo sa vytvoriť plán práce.',
      },
      { status: 500 },
    );
  }
}