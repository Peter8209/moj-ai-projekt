/* lib/questionnaireRegistry.ts */

/**
 * ZEDPERA – register dotazníkov pre modul Analýza dát.
 *
 * Tento súbor je samostatný a bezpečný pre Next.js/TypeScript.
 * Ulož ho do:
 * C:\ZEDPERA\moj-ai-projekt\lib\questionnaireRegistry.ts
 */

export type QuestionnaireId =
  | 'jss'
  | 'wemwbs'
  | 'sehs_s_2020'
  | 'resilience_scale'
  | 'custom';

export type ScaleScoringMode = 'sum' | 'mean';

export type QuestionnaireSubscaleDefinition = {
  id: string;
  label: string;
  itemPatterns: string[];
  reverseItems?: string[];
  minValue?: number;
  maxValue?: number;
  scoring?: ScaleScoringMode;
  description?: string;
};

export type QuestionnaireDefinition = {
  id: QuestionnaireId;
  label: string;
  aliases: string[];
  totalScaleName: string;
  itemPatterns: string[];
  reverseItems?: string[];
  minValue?: number;
  maxValue?: number;
  scoring?: ScaleScoringMode;
  subscales: QuestionnaireSubscaleDefinition[];
  description?: string;
};

export type QuestionnaireOption = {
  value: QuestionnaireId | '';
  label: string;
  description: string;
};

/**
 * Pomocná normalizácia bez diakritiky.
 */
export function normalizeQuestionnaireText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '_')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Register dotazníkov.
 *
 * Poznámka k JSS:
 * Reverzné položky a štruktúru subškál treba mať zosúladenú s metodikou,
 * ktorú používa konkrétna práca. Tu je praktická šablóna pre najčastejšie
 * používanú štruktúru JSS s 36 položkami a 9 subškálami.
 */
export const QUESTIONNAIRE_REGISTRY: QuestionnaireDefinition[] = [
  {
    id: 'jss',
    label: 'JSS – Job Satisfaction Survey',
    aliases: [
      'jss',
      'job_satisfaction_survey',
      'job satisfaction survey',
      'pracovna_spokojnost',
      'pracovná spokojnosť',
      'dotaznik_pracovnej_spokojnosti',
      'dotazník pracovnej spokojnosti',
    ],
    totalScaleName: 'JSS – celkové skóre',
    itemPatterns: [
      'JSS1',
      'JSS2',
      'JSS3',
      'JSS4',
      'JSS5',
      'JSS6',
      'JSS7',
      'JSS8',
      'JSS9',
      'JSS10',
      'JSS11',
      'JSS12',
      'JSS13',
      'JSS14',
      'JSS15',
      'JSS16',
      'JSS17',
      'JSS18',
      'JSS19',
      'JSS20',
      'JSS21',
      'JSS22',
      'JSS23',
      'JSS24',
      'JSS25',
      'JSS26',
      'JSS27',
      'JSS28',
      'JSS29',
      'JSS30',
      'JSS31',
      'JSS32',
      'JSS33',
      'JSS34',
      'JSS35',
      'JSS36',
    ],
    reverseItems: [
      'JSS2',
      'JSS4',
      'JSS6',
      'JSS8',
      'JSS10',
      'JSS12',
      'JSS14',
      'JSS16',
      'JSS18',
      'JSS19',
      'JSS21',
      'JSS23',
      'JSS24',
      'JSS26',
      'JSS29',
      'JSS31',
      'JSS32',
      'JSS34',
      'JSS36',
    ],
    minValue: 1,
    maxValue: 6,
    scoring: 'sum',
    description:
      'JSS – pracovná spokojnosť. Celkové skóre a 9 subškál.',
    subscales: [
      {
        id: 'jss_pay',
        label: 'Mzda',
        itemPatterns: ['JSS1', 'JSS10', 'JSS19', 'JSS28'],
        reverseItems: ['JSS10', 'JSS19'],
        minValue: 1,
        maxValue: 6,
        scoring: 'sum',
      },
      {
        id: 'jss_promotion',
        label: 'Povýšenie',
        itemPatterns: ['JSS2', 'JSS11', 'JSS20', 'JSS33'],
        reverseItems: ['JSS2'],
        minValue: 1,
        maxValue: 6,
        scoring: 'sum',
      },
      {
        id: 'jss_supervision',
        label: 'Vedenie / nadriadený',
        itemPatterns: ['JSS3', 'JSS12', 'JSS21', 'JSS30'],
        reverseItems: ['JSS12', 'JSS21'],
        minValue: 1,
        maxValue: 6,
        scoring: 'sum',
      },
      {
        id: 'jss_benefits',
        label: 'Benefity',
        itemPatterns: ['JSS4', 'JSS13', 'JSS22', 'JSS29'],
        reverseItems: ['JSS4', 'JSS29'],
        minValue: 1,
        maxValue: 6,
        scoring: 'sum',
      },
      {
        id: 'jss_rewards',
        label: 'Odmeny',
        itemPatterns: ['JSS5', 'JSS14', 'JSS23', 'JSS32'],
        reverseItems: ['JSS14', 'JSS23', 'JSS32'],
        minValue: 1,
        maxValue: 6,
        scoring: 'sum',
      },
      {
        id: 'jss_conditions',
        label: 'Pracovné podmienky',
        itemPatterns: ['JSS6', 'JSS15', 'JSS24', 'JSS31'],
        reverseItems: ['JSS6', 'JSS24', 'JSS31'],
        minValue: 1,
        maxValue: 6,
        scoring: 'sum',
      },
      {
        id: 'jss_coworkers',
        label: 'Spolupracovníci',
        itemPatterns: ['JSS7', 'JSS16', 'JSS25', 'JSS34'],
        reverseItems: ['JSS16', 'JSS34'],
        minValue: 1,
        maxValue: 6,
        scoring: 'sum',
      },
      {
        id: 'jss_nature',
        label: 'Povaha práce',
        itemPatterns: ['JSS8', 'JSS17', 'JSS27', 'JSS35'],
        reverseItems: ['JSS8'],
        minValue: 1,
        maxValue: 6,
        scoring: 'sum',
      },
      {
        id: 'jss_communication',
        label: 'Komunikácia',
        itemPatterns: ['JSS9', 'JSS18', 'JSS26', 'JSS36'],
        reverseItems: ['JSS18', 'JSS26', 'JSS36'],
        minValue: 1,
        maxValue: 6,
        scoring: 'sum',
      },
    ],
  },
  {
    id: 'wemwbs',
    label: 'WEMWBS – Warwick-Edinburgh Mental Wellbeing Scale',
    aliases: [
      'wemwbs',
      'wembs',
      'wem',
      'warwick_edinburgh_mental_wellbeing_scale',
      'warwick edinburgh mental wellbeing scale',
      'wellbeing',
      'mental_wellbeing',
      'dusevna_pohoda',
      'duševná pohoda',
      'psychicka_pohoda',
      'psychická pohoda',
    ],
    totalScaleName: 'WEMWBS – celkové skóre',
    itemPatterns: [
      'WEM1',
      'WEM2',
      'WEM3',
      'WEM4',
      'WEM5',
      'WEM6',
      'WEM7',
      'WEM8',
      'WEM9',
      'WEM10',
      'WEM11',
      'WEM12',
      'WEM13',
      'WEM14',
      'WEMWBS1',
      'WEMWBS2',
      'WEMWBS3',
      'WEMWBS4',
      'WEMWBS5',
      'WEMWBS6',
      'WEMWBS7',
      'WEMWBS8',
      'WEMWBS9',
      'WEMWBS10',
      'WEMWBS11',
      'WEMWBS12',
      'WEMWBS13',
      'WEMWBS14',
    ],
    minValue: 1,
    maxValue: 5,
    scoring: 'sum',
    description:
      'WEMWBS – celkové skóre psychickej pohody. Subškály sa štandardne nevytvárajú automaticky.',
    subscales: [],
  },
  {
    id: 'sehs_s_2020',
    label: 'SEHS-S-2020 – Social Emotional Health Survey',
    aliases: [
      'sehs_s_2020',
      'sehs-s-2020',
      'sehs',
      'sehs_s',
      'social_emotional_health_survey',
      'social emotional health survey',
    ],
    totalScaleName: 'SEHS-S-2020 – celkové skóre',
    itemPatterns: [
      'SEHS1',
      'SEHS2',
      'SEHS3',
      'SEHS4',
      'SEHS5',
      'SEHS6',
      'SEHS7',
      'SEHS8',
      'SEHS9',
      'SEHS10',
      'SEHS11',
      'SEHS12',
      'SEHS13',
      'SEHS14',
      'SEHS15',
      'SEHS16',
      'SEHS17',
      'SEHS18',
      'SEHS19',
      'SEHS20',
      'SEHS21',
      'SEHS22',
      'SEHS23',
      'SEHS24',
      'SEHS25',
      'SEHS26',
      'SEHS27',
      'SEHS28',
      'SEHS29',
      'SEHS30',
      'SEHS31',
      'SEHS32',
      'SEHS33',
      'SEHS34',
      'SEHS35',
      'SEHS36',
    ],
    minValue: 1,
    maxValue: 4,
    scoring: 'mean',
    description:
      'SEHS-S-2020. Presné položky subškál treba doplniť podľa metodiky používanej verzie.',
    subscales: [
      {
        id: 'sehs_belief_in_self',
        label: 'Belief in Self / Viera v seba',
        itemPatterns: [],
        minValue: 1,
        maxValue: 4,
        scoring: 'mean',
        description:
          'Doplň presné položky podľa metodiky SEHS-S-2020.',
      },
      {
        id: 'sehs_belief_in_others',
        label: 'Belief in Others / Viera v druhých',
        itemPatterns: [],
        minValue: 1,
        maxValue: 4,
        scoring: 'mean',
        description:
          'Doplň presné položky podľa metodiky SEHS-S-2020.',
      },
      {
        id: 'sehs_emotional_competence',
        label: 'Emotional Competence / Emočná kompetencia',
        itemPatterns: [],
        minValue: 1,
        maxValue: 4,
        scoring: 'mean',
        description:
          'Doplň presné položky podľa metodiky SEHS-S-2020.',
      },
      {
        id: 'sehs_engaged_living',
        label: 'Engaged Living / Angažované prežívanie',
        itemPatterns: [],
        minValue: 1,
        maxValue: 4,
        scoring: 'mean',
        description:
          'Doplň presné položky podľa metodiky SEHS-S-2020.',
      },
    ],
  },
  {
    id: 'resilience_scale',
    label: 'Škála reziliencie',
    aliases: [
      'resilience_scale',
      'resilience',
      'reziliencia',
      'skala_reziliencie',
      'škála reziliencie',
      'rs',
      'cd_risc',
      'cd-risc',
      'connor_davidson_resilience_scale',
    ],
    totalScaleName: 'Reziliencia – celkové skóre',
    itemPatterns: [
      'RS1',
      'RS2',
      'RS3',
      'RS4',
      'RS5',
      'RS6',
      'RS7',
      'RS8',
      'RS9',
      'RS10',
      'RES1',
      'RES2',
      'RES3',
      'RES4',
      'RES5',
      'RES6',
      'RES7',
      'RES8',
      'RES9',
      'RES10',
      'CDRISC1',
      'CDRISC2',
      'CDRISC3',
      'CDRISC4',
      'CDRISC5',
      'CDRISC6',
      'CDRISC7',
      'CDRISC8',
      'CDRISC9',
      'CDRISC10',
    ],
    minValue: 1,
    maxValue: 5,
    scoring: 'sum',
    description:
      'Šablóna pre škály reziliencie. Presné položky závisia od použitej verzie dotazníka.',
    subscales: [],
  },
  {
    id: 'custom',
    label: 'Vlastný dotazník / vlastné škály',
    aliases: [
      'custom',
      'vlastny_dotaznik',
      'vlastný dotazník',
      'vlastne_skaly',
      'vlastné škály',
    ],
    totalScaleName: 'Vlastný dotazník – celkové skóre',
    itemPatterns: [],
    scoring: 'mean',
    description:
      'Používateľ zadá názov dotazníka, položky, škály a subškály ručne.',
    subscales: [],
  },
];

export function getQuestionnaireDefinition(
  id: string,
): QuestionnaireDefinition | undefined {
  const normalized = normalizeQuestionnaireText(id);

  return QUESTIONNAIRE_REGISTRY.find((questionnaire) => {
    if (normalizeQuestionnaireText(questionnaire.id) === normalized) {
      return true;
    }

    return questionnaire.aliases.some(
      (alias) => normalizeQuestionnaireText(alias) === normalized,
    );
  });
}

export function getQuestionnaireDefinitionsByIds(
  ids: string[],
): QuestionnaireDefinition[] {
  const definitions: QuestionnaireDefinition[] = [];

  ids.forEach((id) => {
    const definition = getQuestionnaireDefinition(id);

    if (definition && !definitions.some((item) => item.id === definition.id)) {
      definitions.push(definition);
    }
  });

  return definitions;
}

export function findQuestionnairesByText(
  text: string,
): QuestionnaireDefinition[] {
  const normalizedText = normalizeQuestionnaireText(text);

  if (!normalizedText) {
    return [];
  }

  return QUESTIONNAIRE_REGISTRY.filter((questionnaire) => {
    if (questionnaire.id === 'custom') {
      return false;
    }

    if (normalizedText.includes(normalizeQuestionnaireText(questionnaire.id))) {
      return true;
    }

    return questionnaire.aliases.some((alias) =>
      normalizedText.includes(normalizeQuestionnaireText(alias)),
    );
  });
}

export function listQuestionnaireOptions(): QuestionnaireOption[] {
  return [
    {
      value: '',
      label: 'Neviem / iba navrhnúť',
      description:
        'Systém iba navrhne pravdepodobný dotazník. Výpočty štandardizovaných škál sa nespustia bez potvrdenia.',
    },
    {
      value: 'jss',
      label: 'JSS – Job Satisfaction Survey',
      description: 'Pracovná spokojnosť, celkové skóre a 9 subškál.',
    },
    {
      value: 'wemwbs',
      label: 'WEMWBS',
      description:
        'Warwick-Edinburgh Mental Wellbeing Scale, celkové skóre.',
    },
    {
      value: 'sehs_s_2020',
      label: 'SEHS-S-2020',
      description:
        'Social Emotional Health Survey. Položky subškál doplň podľa metodiky.',
    },
    {
      value: 'resilience_scale',
      label: 'Škála reziliencie',
      description:
        'Reziliencia / odolnosť. Položky závisia od použitej verzie.',
    },
    {
      value: 'custom',
      label: 'Vlastný dotazník / vlastné škály',
      description:
        'Používateľ vpíše názov dotazníka, položky, celkové skóre a subškály.',
    },
  ];
}
