import type {
  AnalysisResult,
  RecommendedChart,
  RecommendedTest,
} from './analysisTypes';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function safeArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === 'string') {
    const normalized = value
      .trim()
      .replace(/\s/g, '')
      .replace('%', '')
      .replace(',', '.');

    if (!normalized) return fallback;

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function getPreparedDataset(result?: AnalysisResult | null): UnknownRecord {
  if (!result) return {};

  const raw = result as unknown as UnknownRecord;

  return isRecord(raw.preparedDataset) ? raw.preparedDataset : {};
}

function getPreparedVariables(result?: AnalysisResult | null): UnknownRecord[] {
  const preparedDataset = getPreparedDataset(result);

  if (Array.isArray(preparedDataset.variables)) {
    return preparedDataset.variables.filter(isRecord);
  }

  const raw = (result || {}) as unknown as UnknownRecord;

  const fallbackVariables =
    safeArray(raw.variables).length > 0
      ? safeArray(raw.variables)
      : safeArray(raw.detectedVariables).length > 0
        ? safeArray(raw.detectedVariables)
        : safeArray(raw.columns);

  return fallbackVariables.filter(isRecord);
}

function getVariableName(variable: UnknownRecord): string {
  return String(
    variable.name ??
      variable.variable ??
      variable.label ??
      variable.displayName ??
      variable.originalName ??
      '',
  ).trim();
}

function getVariableRole(variable: UnknownRecord): string {
  return String(variable.role ?? '').trim().toLowerCase();
}

function getVariableKind(variable: UnknownRecord): string {
  return String(
    variable.kind ??
      variable.dataType ??
      variable.type ??
      variable.measurementLevel ??
      '',
  )
    .trim()
    .toLowerCase();
}

function isLikertOrItemVariable(variable: UnknownRecord): boolean {
  const role = getVariableRole(variable);
  const kind = getVariableKind(variable);

  return (
    role === 'item' ||
    kind === 'likert' ||
    kind === 'ordinal' ||
    /likert|škála|skala|položka|polozka|item/i.test(
      `${variable.name ?? ''} ${variable.label ?? ''} ${variable.originalName ?? ''}`,
    )
  );
}

function isNumericVariable(variable: UnknownRecord): boolean {
  const kind = getVariableKind(variable);
  const role = getVariableRole(variable);

  return (
    role === 'scale' ||
    role === 'subscale' ||
    role === 'dependent' ||
    kind === 'numeric' ||
    kind === 'scale' ||
    kind === 'interval' ||
    kind === 'ratio'
  );
}

function isGroupingVariable(variable: UnknownRecord): boolean {
  const role = getVariableRole(variable);
  const kind = getVariableKind(variable);
  const uniqueCount = toNumber(
    variable.uniqueCount ?? variable.uniqueValues,
    999,
  );

  return (
    role === 'grouping' ||
    role === 'demographic' ||
    role === 'independent' ||
    kind === 'categorical' ||
    kind === 'nominal' ||
    kind === 'ordinal' ||
    (uniqueCount > 1 && uniqueCount <= 10 && role !== 'item')
  );
}

function getScaleNames(result?: AnalysisResult | null): string[] {
  const preparedDataset = getPreparedDataset(result);

  const scaleDefinitions = [
    ...safeArray<UnknownRecord>(preparedDataset.scaleDefinitions),
    ...safeArray<UnknownRecord>(preparedDataset.subscaleDefinitions),
  ];

  const namesFromDefinitions = scaleDefinitions
    .map((item) =>
      String(item.label ?? item.name ?? item.scale ?? item.variable ?? '').trim(),
    )
    .filter(Boolean);

  if (namesFromDefinitions.length > 0) {
    return namesFromDefinitions;
  }

  const variables = getPreparedVariables(result);

  return variables
    .filter((variable) => {
      const role = getVariableRole(variable);
      return role === 'scale' || role === 'subscale';
    })
    .map(getVariableName)
    .filter(Boolean);
}

function getGroupingVariableNames(result?: AnalysisResult | null): string[] {
  return getPreparedVariables(result)
    .filter(isGroupingVariable)
    .map(getVariableName)
    .filter(Boolean)
    .slice(0, 10);
}

function getNumericVariableNames(result?: AnalysisResult | null): string[] {
  const variables = getPreparedVariables(result);

  const scaleNames = getScaleNames(result);

  if (scaleNames.length > 0) {
    return scaleNames;
  }

  return variables
    .filter(isNumericVariable)
    .map(getVariableName)
    .filter(Boolean)
    .slice(0, 20);
}

function getLikertItemNames(result?: AnalysisResult | null): string[] {
  return getPreparedVariables(result)
    .filter(isLikertOrItemVariable)
    .map(getVariableName)
    .filter(Boolean)
    .slice(0, 80);
}

function getMainNumericPair(result?: AnalysisResult | null): string[] {
  const numericVariables = getNumericVariableNames(result);

  if (numericVariables.length >= 2) {
    return numericVariables.slice(0, 2);
  }

  return numericVariables;
}

function getFirstGroupingVariable(result?: AnalysisResult | null): string {
  return getGroupingVariableNames(result)[0] || 'skupinová premenná';
}

function getFirstNumericVariable(result?: AnalysisResult | null): string {
  return getNumericVariableNames(result)[0] || 'škálová/číselná premenná';
}

function getSecondNumericVariable(result?: AnalysisResult | null): string {
  return getNumericVariableNames(result)[1] || 'druhá škálová/číselná premenná';
}

function createDefaultMeta() {
  return {
    filesCount: 0,
    extractedChars: 0,
    generatedAt: new Date().toISOString(),
    pipeline: 'universal-raw-data-statistics',
    expectedFlow: [
      'upload',
      'raw-data.xlsx',
      'variable-map',
      'data-quality',
      'scales-and-subscales',
      'descriptives',
      'frequencies',
      'reliability',
      'correlations',
      'statistical-tests',
      'export',
    ],
  };
}

export function createEmptyAnalysisResult(): AnalysisResult {
  return {
    ok: false,
    success: false,

    title: 'Výsledky analýzy dát',
    summary: '',
    dataDescription: '',

    warnings: [],

    preparedDataset: {
      sourceFileName: '',
      selectedSheetName: '',
      originalHeaders: [],
      headers: [],

      demographicColumns: [],
      groupingColumns: [],
      itemColumns: [],
      numericColumns: [],
      categoricalColumns: [],
      textColumns: [],
      dateColumns: [],

      scaleDefinitions: [],
      subscaleDefinitions: [],

      variables: [],
      rows: [],

      rawDataSheet: [],
      variableMapSheet: [],
      dataQualitySheet: [],

      quality: {
        sourceFileName: '',
        selectedSheetName: '',
        headerRowIndex: 0,
        originalRowCount: 0,
        rowCount: 0,
        originalColumnCount: 0,
        variableCount: 0,
        removedEmptyRows: 0,
        removedDuplicateRows: 0,
        scaleCount: 0,
        subscaleCount: 0,
        warnings: [],
        notes: [],
      },
    },

    rawDataFileName: 'raw-data.xlsx',
    rawDataWorkbookBase64: '',

    variables: [],
    detectedVariables: [],
    columns: [],

    frequencies: [],
    frequencyTables: [],

    descriptiveStatistics: [],
    descriptives: [],
    statistics: [],

    reliabilities: [],
    reliability: [],
    cronbachAlpha: [],

    correlations: [],
    correlationResults: [],
    pearsonCorrelations: [],
    spearmanCorrelations: [],

    statisticalTests: [],
    hypothesisTests: [],
    testResults: [],
    tTests: [],

    selectedAnalyses: [
      'frequency',
      'descriptive',
      'reliability',
      'cronbach-alpha',
      'correlation',
      'pearson',
      'spearman',
      'ttest',
      'anova',
      'mann-whitney',
      'kruskal-wallis',
      'charts',
      'interpretation',
    ],

    recommendedTests: [],
    recommendedCharts: [],
    excelTables: [],

    practicalText: '',
    interpretation: '',
    fullText: '',

    meta: createDefaultMeta(),
  } as unknown as AnalysisResult;
}

export function getDefaultRecommendedCharts(
  result?: AnalysisResult | null,
): RecommendedChart[] {
  const groupingVariables = getGroupingVariableNames(result);
  const numericVariables = getNumericVariableNames(result);
  const scaleNames = getScaleNames(result);
  const likertItems = getLikertItemNames(result);

  const firstGrouping = groupingVariables[0] || 'skupinová premenná';
  const firstNumeric = numericVariables[0] || 'číselná premenná';
  const secondNumeric = numericVariables[1] || 'druhá číselná premenná';

  const charts: RecommendedChart[] = [
    {
      title: 'Stĺpcový graf kategorizovaných premenných',
      name: 'Stĺpcový graf kategorizovaných premenných',
      type: 'bar',
      chartType: 'bar',
      variables: groupingVariables.length > 0 ? groupingVariables : [firstGrouping],
      description:
        'Stĺpcový graf zobrazujúci početnosti jednotlivých kategórií v dátovom súbore.',
      reason:
        'Vhodné pre demografické, skupinové a nominálne premenné po príprave raw dát.',
    },
    {
      title: 'Koláčový graf podielov kategórií',
      name: 'Koláčový graf podielov kategórií',
      type: 'pie',
      chartType: 'pie',
      variables: groupingVariables.length > 0 ? [firstGrouping] : ['kategorizovaná premenná'],
      description:
        'Koláčový graf zobrazujúci percentuálne zastúpenie kategórií vybranej premennej.',
      reason:
        'Vhodné pri stručnom zobrazení štruktúry výskumného súboru.',
    },
    {
      title: 'Histogram číselnej premennej',
      name: 'Histogram číselnej premennej',
      type: 'histogram',
      chartType: 'histogram',
      variables: [firstNumeric],
      description:
        'Histogram zobrazujúci rozdelenie číselnej alebo škálovej premennej.',
      reason:
        'Vhodné na vizuálnu kontrolu tvaru rozdelenia a možnej normality.',
    },
    {
      title: 'Boxplot podľa skupín',
      name: 'Boxplot podľa skupín',
      type: 'boxplot',
      chartType: 'boxplot',
      variables: [firstGrouping, firstNumeric],
      x: firstGrouping,
      y: firstNumeric,
      groupBy: firstGrouping,
      description:
        'Krabicový graf zobrazujúci medián, kvartily, variabilitu a extrémne hodnoty podľa skupín.',
      reason:
        'Vhodné pred t-testom, ANOVA, Mann-Whitneyho U testom alebo Kruskal-Wallisovým testom.',
    },
    {
      title: 'Stĺpcový graf priemerov škál a subškál',
      name: 'Stĺpcový graf priemerov škál a subškál',
      type: 'bar',
      chartType: 'bar',
      variables: scaleNames.length > 0 ? scaleNames : numericVariables.slice(0, 8),
      description:
        'Grafické porovnanie priemerných hodnôt vypočítaných škál, subškál alebo číselných premenných.',
      reason:
        'Vhodné na prezentáciu hlavných deskriptívnych výsledkov v práci.',
    },
    {
      title: 'Korelačná matica škál a subškál',
      name: 'Korelačná matica škál a subškál',
      type: 'heatmap',
      chartType: 'heatmap',
      variables:
        scaleNames.length >= 2
          ? scaleNames
          : numericVariables.length >= 2
            ? numericVariables
            : [firstNumeric, secondNumeric],
      description:
        'Tepelná mapa korelácií medzi škálami, subškálami alebo číselnými premennými.',
      reason:
        'Vhodné na vizuálne zobrazenie Pearsonových alebo Spearmanových korelácií.',
    },
    {
      title: 'Bodový graf vzťahu dvoch číselných premenných',
      name: 'Bodový graf vzťahu dvoch číselných premenných',
      type: 'scatter',
      chartType: 'scatter',
      variables: getMainNumericPair(result).length >= 2
        ? getMainNumericPair(result)
        : [firstNumeric, secondNumeric],
      x: firstNumeric,
      y: secondNumeric,
      description:
        'Bodový graf zobrazujúci vzťah medzi dvoma číselnými alebo škálovými premennými.',
      reason:
        'Vhodné na kontrolu smeru, sily a linearity vzťahu pred korelačnou analýzou.',
    },
    {
      title: 'Graf reliability škál',
      name: 'Graf reliability škál',
      type: 'bar',
      chartType: 'bar',
      variables: scaleNames.length > 0 ? scaleNames : ['škály a subškály'],
      description:
        'Stĺpcový graf hodnôt Cronbachovej alfy pre jednotlivé škály a subškály.',
      reason:
        'Vhodné na prehľadné zobrazenie vnútornej konzistencie dotazníkových škál.',
    },
  ] as unknown as RecommendedChart[];

  if (likertItems.length > 0) {
    charts.push({
      title: 'Graf priemerov položiek dotazníka',
      name: 'Graf priemerov položiek dotazníka',
      type: 'bar',
      chartType: 'bar',
      variables: likertItems.slice(0, 20),
      description:
        'Stĺpcový graf priemerných hodnôt jednotlivých dotazníkových položiek.',
      reason:
        'Vhodné na kontrolu položiek pred výpočtom škál, subškál a reliability.',
    } as unknown as RecommendedChart);
  }

  return charts;
}

export function getDefaultRecommendedTests(
  result?: AnalysisResult | null,
): RecommendedTest[] {
  const groupingVariables = getGroupingVariableNames(result);
  const numericVariables = getNumericVariableNames(result);
  const scaleNames = getScaleNames(result);
  const likertItems = getLikertItemNames(result);

  const firstGrouping = getFirstGroupingVariable(result);
  const firstNumeric = getFirstNumericVariable(result);
  const secondNumeric = getSecondNumericVariable(result);

  const mainNumericVariables =
    scaleNames.length > 0
      ? scaleNames
      : numericVariables.length > 0
        ? numericVariables
        : [firstNumeric];

  const tests: RecommendedTest[] = [
    {
      title: 'Deskriptívna štatistika pripravených raw dát',
      name: 'Deskriptívna štatistika pripravených raw dát',
      hypothesis:
        'Cieľom je popísať základné charakteristiky premenných po príprave raw-data.xlsx.',
      variables: mainNumericVariables,
      test: 'Deskriptívna štatistika',
      description:
        'Výpočet N, chýbajúcich hodnôt, priemeru, mediánu, smerodajnej odchýlky, minima a maxima.',
      reason:
        'Deskriptívna štatistika je základný krok pred interpretáciou dát a testovaním hypotéz.',
      assumptions: [
        'Premenné musia byť správne rozpoznané ako číselné, ordinálne alebo škálové.',
        'Pred interpretáciou treba skontrolovať chýbajúce hodnoty a extrémne hodnoty.',
      ],
      whenToUse:
        'Použiť vždy po vytvorení raw-data.xlsx a pred inferenčnou štatistikou.',
      parametric: false,
    },
    {
      title: 'Frekvenčná analýza kategorizovaných premenných',
      name: 'Frekvenčná analýza kategorizovaných premenných',
      hypothesis:
        'Cieľom je opísať rozdelenie respondentov alebo pozorovaní podľa kategórií.',
      variables:
        groupingVariables.length > 0
          ? groupingVariables
          : ['kategorizované premenné'],
      test: 'Frekvenčné tabuľky',
      description:
        'Výpočet početností, percent, validných percent a kumulatívnych percent.',
      reason:
        'Vhodné pre nominálne, ordinálne, demografické a skupinové premenné.',
      assumptions: [
        'Premenné majú byť kategorizované alebo ordinálne.',
        'Pri chýbajúcich hodnotách treba rozlišovať percentá a validné percentá.',
      ],
      whenToUse:
        'Použiť pri popise výskumnej vzorky alebo kategorizovaných odpovedí.',
      parametric: false,
    },
    {
      title: 'Reliabilita škál a subškál',
      name: 'Reliabilita škál a subškál',
      hypothesis:
        'Položky patriace do jednej škály merajú spoločný konštrukt s dostatočnou vnútornou konzistenciou.',
      variables:
        likertItems.length > 0
          ? likertItems.slice(0, 40)
          : scaleNames.length > 0
            ? scaleNames
            : ['položky škály'],
      test: 'Cronbachova alfa',
      description:
        'Overenie vnútornej konzistencie škál a subškál pomocou Cronbachovej alfy.',
      reason:
        'Reliabilitu treba počítať z položiek škály, nie iba z jednotlivých samostatných premenných.',
      assumptions: [
        'Škála musí obsahovať minimálne dve položky.',
        'Položky musia byť kódované v rovnakom smere alebo musia byť reverzne upravené.',
        'Položky majú patriť k rovnakému teoretickému konštruktu.',
      ],
      whenToUse:
        'Použiť po výpočte škál/subškál a pred finálnou interpretáciou dotazníkových výsledkov.',
      parametric: false,
    },
    {
      title: 'Korelačná analýza medzi škálami alebo číselnými premennými',
      name: 'Korelačná analýza medzi škálami alebo číselnými premennými',
      hypothesis:
        'Medzi vybranými číselnými premennými, škálami alebo subškálami existuje štatisticky významný vzťah.',
      variables:
        mainNumericVariables.length >= 2
          ? mainNumericVariables
          : [firstNumeric, secondNumeric],
      test: 'Pearsonova alebo Spearmanova korelácia',
      description:
        'Overenie vzťahu medzi dvoma alebo viacerými číselnými/škálovými premennými.',
      reason:
        'Pearsonova korelácia je vhodná pri splnení normality a lineárneho vzťahu, Spearmanova korelácia pri ordinálnych dátach alebo porušení normality.',
      assumptions: [
        'Pre Pearsonovu koreláciu treba overiť približnú normalitu, linearitu a neprítomnosť extrémnych hodnôt.',
        'Pre Spearmanovu koreláciu stačí monotónny vzťah a ordinálne alebo nenormálne rozdelené dáta.',
      ],
      whenToUse:
        'Použiť pri hypotézach zameraných na vzťah medzi dvoma premennými.',
      parametric: true,
    },
    {
      title: 'Rozdiel medzi dvoma skupinami',
      name: 'Rozdiel medzi dvoma skupinami',
      hypothesis:
        'Medzi dvoma skupinami existuje štatisticky významný rozdiel vo vybranej škále alebo číselnej premennej.',
      variables: [firstGrouping, firstNumeric],
      dependentVariable: firstNumeric,
      groupingVariable: firstGrouping,
      test: 't-test alebo Mann-Whitney U test',
      description:
        'Porovnanie hodnoty závislej premennej medzi dvoma nezávislými skupinami.',
      reason:
        't-test je vhodný pri splnení parametrických predpokladov, Mann-Whitney U test pri ordinálnych dátach alebo porušení normality.',
      assumptions: [
        'Skupinová premenná má mať dve skupiny.',
        'Závislá premenná má byť číselná, ordinálna alebo škálová.',
        'Pri t-teste treba skontrolovať normalitu a homogenitu rozptylov.',
      ],
      whenToUse:
        'Použiť pri porovnaní dvoch skupín, napríklad muž/žena, kontrolná/experimentálna skupina alebo typ A/typ B.',
      parametric: true,
    },
    {
      title: 'Rozdiel medzi viac ako dvoma skupinami',
      name: 'Rozdiel medzi viac ako dvoma skupinami',
      hypothesis:
        'Medzi tromi alebo viacerými skupinami existuje štatisticky významný rozdiel vo vybranej škále alebo číselnej premennej.',
      variables: [firstGrouping, firstNumeric],
      dependentVariable: firstNumeric,
      groupingVariable: firstGrouping,
      test: 'ANOVA alebo Kruskal-Wallis test',
      description:
        'Porovnanie hodnoty závislej premennej medzi viacerými nezávislými skupinami.',
      reason:
        'ANOVA je vhodná pri splnení parametrických predpokladov, Kruskal-Wallis test pri ordinálnych dátach alebo porušení normality.',
      assumptions: [
        'Skupinová premenná má mať tri alebo viac skupín.',
        'Závislá premenná má byť číselná, ordinálna alebo škálová.',
        'Pri ANOVA treba skontrolovať normalitu, homogenitu rozptylov a nezávislosť pozorovaní.',
      ],
      whenToUse:
        'Použiť pri porovnaní troch alebo viacerých kategórií jednej skupinovej premennej.',
      parametric: true,
    },
  ] as unknown as RecommendedTest[];

  if (groupingVariables.length > 0 && mainNumericVariables.length > 0) {
    groupingVariables.slice(0, 5).forEach((groupVariable) => {
      tests.push({
        title: `Skupinové rozdiely podľa premennej ${groupVariable}`,
        name: `Skupinové rozdiely podľa premennej ${groupVariable}`,
        hypothesis: `Hodnoty škálových alebo číselných premenných sa líšia podľa kategórií premennej ${groupVariable}.`,
        variables: [groupVariable, ...mainNumericVariables.slice(0, 5)],
        dependentVariable: mainNumericVariables[0],
        groupingVariable: groupVariable,
        test: 't-test / ANOVA / Mann-Whitney U / Kruskal-Wallis',
        description:
          'Automatický výber vhodného testu podľa počtu skupín a charakteru dát.',
        reason:
          'Ak má skupinová premenná dve skupiny, použije sa t-test alebo Mann-Whitney U. Ak má viac skupín, použije sa ANOVA alebo Kruskal-Wallis.',
        assumptions: [
          'Počet skupín sa určí z pripravených raw dát.',
          'Voľba parametrického/neparametrického testu závisí od normality a typu premennej.',
        ],
        whenToUse:
          'Použiť pri hypotézach zameraných na rozdiely medzi skupinami.',
        parametric: true,
      } as unknown as RecommendedTest);
    });
  }

  return tests;
}

export function getDefaultExcelTables(
  result?: AnalysisResult | null,
): string[] {
  const groupingVariables = getGroupingVariableNames(result);
  const numericVariables = getNumericVariableNames(result);
  const scaleNames = getScaleNames(result);

  const tables = [
    'Tabuľka 1: Kontrola a príprava vstupného súboru',
    'Tabuľka 2: Mapa premenných a typy premenných',
    'Tabuľka 3: Pripravené raw dáta',
    'Tabuľka 4: Definícia škál a subškál',
    'Tabuľka 5: Frekvenčné tabuľky kategorizovaných premenných',
    'Tabuľka 6: Deskriptívna štatistika číselných premenných',
    'Tabuľka 7: Deskriptívna štatistika škál a subškál',
    'Tabuľka 8: Reliabilita škál – Cronbachova alfa',
    'Tabuľka 9: Korelačná analýza – Pearson/Spearman',
    'Tabuľka 10: Testovanie rozdielov – t-test a ANOVA',
    'Tabuľka 11: Testovanie rozdielov – Mann-Whitney U a Kruskal-Wallis',
    'Tabuľka 12: Súhrn štatisticky významných výsledkov',
    'Tabuľka 13: Odporúčané grafy',
    'Tabuľka 14: Upozornenia a dátová kvalita',
  ];

  groupingVariables.slice(0, 5).forEach((variable, index) => {
    tables.push(
      `Doplnková tabuľka G${index + 1}: Frekvenčné rozdelenie premennej ${variable}`,
    );
  });

  numericVariables.slice(0, 5).forEach((variable, index) => {
    tables.push(
      `Doplnková tabuľka N${index + 1}: Deskriptívna štatistika premennej ${variable}`,
    );
  });

  scaleNames.slice(0, 5).forEach((scale, index) => {
    tables.push(
      `Doplnková tabuľka S${index + 1}: Skóre, deskriptíva a reliabilita škály ${scale}`,
    );
  });

  return tables;
}

export function getDefaultWarnings(
  result?: AnalysisResult | null,
): string[] {
  const scaleNames = getScaleNames(result);
  const likertItems = getLikertItemNames(result);
  const groupingVariables = getGroupingVariableNames(result);
  const numericVariables = getNumericVariableNames(result);

  const warnings = [
    'Pred finálnou interpretáciou je potrebné skontrolovať, či boli premenné správne rozpoznané ako kategorizované, ordinálne, číselné, položkové, škálové alebo textové.',
    'Štatistiky sa majú počítať až z pripraveného súboru raw-data.xlsx, nie priamo z neupraveného vstupného Excelu.',
    'Pri kategorizovaných premenných treba uvádzať početnosti, percentá, validné percentá a chýbajúce hodnoty.',
    'Pri číselných a škálových premenných treba uvádzať N, priemer, medián, smerodajnú odchýlku, minimum a maximum.',
    'Pred použitím parametrických testov treba skontrolovať normalitu, homogenitu rozptylov a extrémne hodnoty.',
    'Ak normalita alebo iné predpoklady nie sú splnené, odporúčajú sa neparametrické testy: Spearman, Mann-Whitney U alebo Kruskal-Wallis.',
    'Pri škálach a subškálach treba počítať reliabilitu pomocou Cronbachovej alfy z položiek, ktoré do škály patria.',
    'Duplicitné frekvenčné tabuľky alebo duplicitné hárky v exporte treba odstrániť – každý typ výstupu má byť v exporte iba raz.',
  ];

  if (!scaleNames.length && likertItems.length >= 2) {
    warnings.push(
      'V dátach boli rozpoznané položky dotazníka, ale nie sú jednoznačne definované škály alebo subškály. Skontrolujte názvy položiek alebo doplňte definície škál.',
    );
  }

  if (!likertItems.length) {
    warnings.push(
      'Neboli rozpoznané dotazníkové položky. Reliabilita sa vypočíta iba vtedy, ak dáta obsahujú minimálne dve položky patriace do jednej škály.',
    );
  }

  if (!groupingVariables.length) {
    warnings.push(
      'Neboli rozpoznané skupinové premenné. t-test, ANOVA, Mann-Whitney a Kruskal-Wallis sa vykonajú iba vtedy, ak sú v dátach vhodné skupinové premenné.',
    );
  }

  if (numericVariables.length < 2 && scaleNames.length < 2) {
    warnings.push(
      'Pre korelačnú analýzu sú potrebné aspoň dve číselné, škálové alebo subškálové premenné.',
    );
  }

  return warnings;
}

export function buildDefaultPracticalText(
  result?: AnalysisResult | null,
): string {
  const groupingVariables = getGroupingVariableNames(result);
  const numericVariables = getNumericVariableNames(result);
  const scaleNames = getScaleNames(result);

  const groupingText =
    groupingVariables.length > 0
      ? `V dátach boli ako skupinové alebo kategorizované premenné rozpoznané najmä: ${groupingVariables
          .slice(0, 8)
          .join(', ')}. Pri týchto premenných je vhodné uvádzať početnosti, percentá, validné percentá a chýbajúce hodnoty.`
      : 'Ak dátový súbor obsahuje kategorizované alebo demografické premenné, je vhodné ich spracovať prostredníctvom frekvenčných tabuliek.';

  const numericText =
    numericVariables.length > 0
      ? `Ako číselné alebo škálové premenné boli rozpoznané najmä: ${numericVariables
          .slice(0, 8)
          .join(', ')}. Pri týchto premenných je vhodné uvádzať priemer, medián, smerodajnú odchýlku, minimum a maximum.`
      : 'Pri číselných premenných je vhodné uvádzať základné deskriptívne ukazovatele, najmä N, priemer, medián, smerodajnú odchýlku, minimum a maximum.';

  const scaleText =
    scaleNames.length > 0
      ? `Pre ďalšiu interpretáciu sú kľúčové vypočítané škály a subškály: ${scaleNames
          .slice(0, 10)
          .join(', ')}. Tieto skóre majú byť hlavným základom pre deskriptívnu štatistiku, reliabilitu, korelácie a testovanie rozdielov medzi skupinami.`
      : 'Ak dáta obsahujú dotazníkové položky, najprv je potrebné vypočítať škály a subškály. Až následne sa majú počítať reliabilita, korelácie a testovanie hypotéz.';

  return `
V prvom kroku sa nahratý vstupný súbor nemá vyhodnocovať priamo. Najprv sa z neho pripraví jednotný súbor raw-data.xlsx. V tejto fáze sa vyberie vhodný dátový hárok, rozpozná sa riadok hlavičky, odstránia sa prázdne riadky, duplicitné riadky, zjednotia sa názvy stĺpcov a vytvorí sa mapa premenných. Táto mapa určuje, ktoré premenné sú kategorizované, skupinové, číselné, textové, položkové, škálové alebo subškálové.

${groupingText}

${numericText}

${scaleText}

Po príprave raw dát sa majú vypočítať frekvenčné tabuľky a deskriptívna štatistika. Frekvenčné tabuľky sa používajú najmä pre kategorizované premenné a položky s menším počtom odpovedí. Deskriptívna štatistika sa používa pre číselné premenné, škály, subškály a skóre vypočítané z položiek. Pri škálach a subškálach je dôležité, aby výsledky neboli založené iba na jednotlivých položkách, ale na vypočítanom skóre škály alebo subškály.

Pri dotazníkových škálach je potrebné vypočítať reliabilitu, najmä Cronbachovu alfu. Reliabilita sa počíta z položiek patriacich do konkrétnej škály alebo subškály. Výsledok Cronbachovej alfy sa interpretuje ako ukazovateľ vnútornej konzistencie. Hodnoty približne od 0,70 sa často považujú za akceptovateľné, pričom konečná interpretácia závisí od počtu položiek, charakteru škály a metodiky výskumu.

Korelačná analýza sa má robiť medzi škálami, subškálami alebo číselnými premennými. Pri približne normálnom rozdelení a lineárnom vzťahu je vhodná Pearsonova korelácia. Pri ordinálnych dátach, menšom súbore, výskyte extrémnych hodnôt alebo porušení normality je vhodnejšia Spearmanova korelácia.

Pri testovaní rozdielov medzi skupinami sa postup volí podľa počtu skupín a charakteru dát. Ak skupinová premenná obsahuje dve skupiny, použije sa t-test alebo Mann-Whitney U test. Ak obsahuje tri alebo viac skupín, použije sa ANOVA alebo Kruskal-Wallis test. Parametrické testy sa používajú pri splnení predpokladov normality a homogenity rozptylov. Neparametrické testy sa použijú pri porušení predpokladov alebo pri ordinálnych dátach.

Výsledky je vhodné exportovať do Excelu tak, aby každý typ výstupu bol v samostatnom hárku bez duplicít. Odporúčané hárky sú: raw-data, variable-map, data-quality, descriptives, frequencies, reliability, correlations, tests a warnings. Takto pripravený export je vhodný ako podklad pre praktickú časť práce, kontrolu výpočtov aj ďalšie spracovanie.
`.trim();
}

export function buildDefaultSummary(
  result?: AnalysisResult | null,
): string {
  const preparedDataset = getPreparedDataset(result);
  const quality = isRecord(preparedDataset.quality)
    ? preparedDataset.quality
    : {};

  const rowCount =
    toNumber(quality.rowCount) ||
    (Array.isArray(preparedDataset.rows) ? preparedDataset.rows.length : 0);

  const variableCount =
    toNumber(quality.variableCount) ||
    getPreparedVariables(result).length;

  const scaleCount =
    toNumber(quality.scaleCount) ||
    safeArray(preparedDataset.scaleDefinitions).length;

  const subscaleCount =
    toNumber(quality.subscaleCount) ||
    safeArray(preparedDataset.subscaleDefinitions).length;

  return [
    'Analýza dát je nastavená ako univerzálny štatistický postup použiteľný pre rôzne Excel alebo CSV súbory.',
    rowCount > 0
      ? `Po príprave raw dát je dostupných ${rowCount} riadkov na štatistické spracovanie.`
      : 'Po nahratí súboru sa najprv pripraví raw-data.xlsx, z ktorého sa následne počítajú štatistiky.',
    variableCount > 0
      ? `Systém rozpoznal ${variableCount} premenných a pripravil ich mapovanie podľa typu a analytickej roly.`
      : 'Systém automaticky rozpozná premenné, ich typy a analytické roly.',
    scaleCount > 0 || subscaleCount > 0
      ? `Bolo rozpoznaných alebo definovaných ${scaleCount} škál a ${subscaleCount} subškál.`
      : 'Ak sú v dátach dotazníkové položky, systém sa pokúsi vytvoriť škály a subškály podľa názvov a štruktúry položiek.',
    'Následne sa počítajú frekvencie, deskriptívna štatistika, reliabilita, korelácie a skupinové testy podľa dostupných premenných.',
  ]
    .filter(Boolean)
    .join('\n');
}