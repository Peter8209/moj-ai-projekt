import type {
  AnalysisResult,
  RecommendedChart,
  RecommendedTest,
} from './analysisTypes';

export function createEmptyAnalysisResult(): AnalysisResult {
  return {
    ok: false,
    title: 'Výsledky analýzy',
    summary: '',
    dataDescription: '',
    warnings: [],

    variables: [],
    frequencies: [],

    selectedAnalyses: [],
    descriptiveStatistics: [],
    recommendedTests: [],
    recommendedCharts: [],
    hypothesisTests: [],
    excelTables: [],

    practicalText: '',
    interpretation: '',
    fullText: '',

    meta: {
      filesCount: 0,
      extractedChars: 0,
      generatedAt: new Date().toISOString(),
    },
  } as unknown as AnalysisResult;
}

export function getDefaultRecommendedCharts(): RecommendedChart[] {
  return [
    {
      title: 'Rozdelenie pohlavia',
      type: 'bar',
      variables: ['POHLAVIE'],
      description: 'Stĺpcový graf zobrazujúci početnosť respondentov podľa pohlavia.',
      reason: 'Vhodné pre kategorizovanú demografickú premennú.',
    },
    {
      title: 'Rozdelenie typu podniku',
      type: 'bar',
      variables: ['TYP PODNIKU'],
      description:
        'Stĺpcový graf zobrazujúci zastúpenie respondentov podľa typu podniku.',
      reason:
        'Vhodné na porovnanie zastúpenia respondentov podľa typu podniku.',
    },
    {
      title: 'Rozdelenie rodinného stavu',
      type: 'bar',
      variables: ['RODINNÝ STAV'],
      description:
        'Stĺpcový graf alebo koláčový graf zobrazujúci rodinný stav respondentov.',
      reason: 'Vhodné na prezentáciu štruktúry výskumného súboru.',
    },
    {
      title: 'Histogram veku',
      type: 'histogram',
      variables: ['Vek'],
      description:
        'Histogram zobrazujúci rozdelenie veku respondentov vo výskumnom súbore.',
      reason: 'Vhodné na zobrazenie rozdelenia veku respondentov.',
    },
    {
      title: 'Boxplot veku',
      type: 'boxplot',
      variables: ['Vek'],
      description:
        'Krabicový graf zobrazujúci medián, kvartily, variabilitu a extrémne hodnoty veku.',
      reason: 'Vhodné na identifikáciu variability a extrémnych hodnôt.',
    },
    {
      title: 'Histogram WEMWBS skóre',
      type: 'histogram',
      variables: ['WEMWBS_skore'],
      description:
        'Histogram zobrazujúci rozdelenie celkového skóre psychickej pohody podľa WEMWBS.',
      reason: 'Vhodné na kontrolu rozdelenia celkového skóre well-beingu.',
    },
    {
      title: 'Histogram JSS skóre',
      type: 'histogram',
      variables: ['JSS_skore'],
      description:
        'Histogram zobrazujúci rozdelenie celkového skóre pracovnej spokojnosti podľa JSS.',
      reason:
        'Vhodné na zobrazenie rozdelenia celkového skóre pracovnej spokojnosti.',
    },
    {
      title: 'Korelačná matica hlavných škál',
      type: 'heatmap',
      variables: ['WEMWBS_skore', 'JSS_skore'],
      description:
        'Tepelná mapa korelácií medzi hlavnými škálami a prípadne subškálami.',
      reason:
        'Vhodné na vizuálne zobrazenie vzťahov medzi hlavnými škálami.',
    },
    {
      title: 'Radar graf JSS subškál',
      type: 'other',
      variables: [
        'JSS_povysenie',
        'JSS_nadriadeny',
        'JSS_benefity',
        'JSS_odmeny_a_uznanie',
        'JSS_prevadzkove_podmienky',
        'JSS_spolupracovnici',
        'JSS_povaha_prace',
        'JSS_komunikacia',
        'JSS_plat',
      ],
      description:
        'Radarový graf zobrazujúci porovnanie jednotlivých dimenzií pracovnej spokojnosti.',
      reason:
        'Vhodné na rýchle porovnanie úrovne jednotlivých dimenzií pracovnej spokojnosti.',
    },
    {
      title: 'Bodový graf WEMWBS a JSS',
      type: 'scatter',
      variables: ['WEMWBS_skore', 'JSS_skore'],
      description:
        'Bodový graf zobrazujúci vzťah medzi psychickou pohodou a pracovnou spokojnosťou.',
      reason:
        'Vhodné na vizuálnu kontrolu smeru, sily a linearity vzťahu medzi škálami.',
    },
  ] as unknown as RecommendedChart[];
}

export function getDefaultRecommendedTests(): RecommendedTest[] {
  return [
    {
      title: 'Vzťah medzi vekom a celkovým skóre well-beingu',
      hypothesis: 'Vzťah medzi vekom a celkovým skóre well-beingu',
      variables: ['Vek', 'WEMWBS_skore'],
      test: 'Spearmanova korelácia',
      description:
        'Overenie monotónneho vzťahu medzi vekom a celkovým skóre psychickej pohody.',
      reason:
        'Vhodné pri nenormálnom rozdelení alebo pri ordinálnych/škálových dátach.',
      parametric: false,
    },
    {
      title: 'Vzťah medzi vekom a pracovnou spokojnosťou',
      hypothesis: 'Vzťah medzi vekom a pracovnou spokojnosťou',
      variables: ['Vek', 'JSS_skore'],
      test: 'Spearmanova korelácia',
      description:
        'Overenie monotónneho vzťahu medzi vekom a celkovým skóre pracovnej spokojnosti.',
      reason:
        'Vhodné na overenie monotónneho vzťahu medzi vekom a skóre spokojnosti.',
      parametric: false,
    },
    {
      title: 'Vzťah medzi well-beingom a pracovnou spokojnosťou',
      hypothesis: 'Vzťah medzi well-beingom a pracovnou spokojnosťou',
      variables: ['WEMWBS_skore', 'JSS_skore'],
      test: 'Spearmanova alebo Pearsonova korelácia',
      description:
        'Overenie vzťahu medzi celkovým skóre psychickej pohody a pracovnej spokojnosti.',
      reason:
        'Pearson možno použiť iba pri splnení normality a lineárneho vzťahu, inak je vhodnejší Spearman.',
      parametric: false,
    },
    {
      title: 'Rozdiely v skóre podľa pohlavia',
      hypothesis: 'Rozdiely v skóre podľa pohlavia',
      variables: ['POHLAVIE', 'WEMWBS_skore', 'JSS_skore'],
      test: 'Mann-Whitney U test',
      description:
        'Porovnanie skóre well-beingu a pracovnej spokojnosti medzi dvoma skupinami podľa pohlavia.',
      reason:
        'Pohlavie má spravidla dve skupiny a pri dotazníkových skórach je vhodné použiť neparametrický test, ak normalita nie je splnená.',
      parametric: false,
    },
    {
      title: 'Rozdiely v skóre podľa typu podniku',
      hypothesis: 'Rozdiely v skóre podľa typu podniku',
      variables: ['TYP PODNIKU', 'WEMWBS_skore', 'JSS_skore'],
      test: 'Mann-Whitney U test',
      description:
        'Porovnanie skóre well-beingu a pracovnej spokojnosti medzi skupinami podľa typu podniku.',
      reason:
        'Ak typ podniku obsahuje dve skupiny, vhodný je Mann-Whitney U test pri nenormálnom rozdelení.',
      parametric: false,
    },
    {
      title: 'Rozdiely v skóre podľa rodinného stavu',
      hypothesis: 'Rozdiely v skóre podľa rodinného stavu',
      variables: ['RODINNÝ STAV', 'WEMWBS_skore', 'JSS_skore'],
      test: 'Kruskal-Wallis test',
      description:
        'Porovnanie skóre well-beingu a pracovnej spokojnosti medzi viacerými skupinami podľa rodinného stavu.',
      reason:
        'Rodinný stav má viac ako dve skupiny, preto je vhodný Kruskal-Wallis test.',
      parametric: false,
    },
    {
      title: 'Vnútorná konzistencia škál',
      hypothesis: 'Vnútorná konzistencia škál',
      variables: ['WEM1–WEM14', 'JSS1–JSS36'],
      test: 'Cronbachova alfa',
      description:
        'Overenie reliability dotazníkových škál a ich subškál pomocou Cronbachovej alfy.',
      reason:
        'Vhodné na overenie vnútornej konzistencie použitých dotazníkových škál a subškál.',
      parametric: false,
    },
    {
      title: 'Predikcia well-beingu alebo pracovnej spokojnosti',
      hypothesis: 'Predikcia well-beingu alebo pracovnej spokojnosti',
      variables: ['WEMWBS_skore', 'JSS_skore', 'Vek', 'POHLAVIE', 'TYP PODNIKU'],
      test: 'Regresná analýza',
      description:
        'Overenie, ktoré premenné predikujú celkové skóre psychickej pohody alebo pracovnej spokojnosti.',
      reason:
        'Vhodné pri overovaní prediktorov výsledného skóre. Pri porušení predpokladov treba použiť robustné alebo neparametrické alternatívy.',
      parametric: true,
    },
  ] as unknown as RecommendedTest[];
}

export function getDefaultExcelTables(): string[] {
  return [
    'Tabuľka 1: Charakteristika výskumného súboru',
    'Tabuľka 2: Frekvenčné rozdelenie pohlavia',
    'Tabuľka 3: Frekvenčné rozdelenie typu podniku',
    'Tabuľka 4: Frekvenčné rozdelenie rodinného stavu',
    'Tabuľka 5: Deskriptívna štatistika veku',
    'Tabuľka 6: Deskriptívna štatistika WEMWBS položiek',
    'Tabuľka 7: Deskriptívna štatistika WEMWBS celkového skóre',
    'Tabuľka 8: Deskriptívna štatistika JSS položiek',
    'Tabuľka 9: Deskriptívna štatistika JSS celkového skóre',
    'Tabuľka 10: Deskriptívna štatistika JSS subškál',
    'Tabuľka 11: Test normality vybraných premenných',
    'Tabuľka 12: Korelačná matica',
    'Tabuľka 13: Rozdiely podľa pohlavia',
    'Tabuľka 14: Rozdiely podľa typu podniku',
    'Tabuľka 15: Rozdiely podľa rodinného stavu',
    'Tabuľka 16: Reliabilita použitých škál',
    'Tabuľka 17: Regresný model predikcie well-beingu',
    'Tabuľka 18: Regresný model predikcie pracovnej spokojnosti',
  ];
}

export function getDefaultWarnings(): string[] {
  return [
    'Pred finálnou interpretáciou je potrebné skontrolovať typy premenných.',
    'Pri kategorizovaných premenných treba uvádzať početnosti a validné percentá.',
    'Pri škálových skórach treba skontrolovať normalitu rozdelenia.',
    'Pri dotazníkových škálach je vhodné overiť reliabilitu pomocou Cronbachovej alfy.',
    'Ak sú v dátach chýbajúce hodnoty, treba interpretovať najmä validné percentá.',
    'Ak normalita nie je splnená, odporúčajú sa neparametrické testy.',
    'Pri regresii treba skontrolovať multikolinearitu, reziduá a extrémne hodnoty.',
  ];
}

export function buildDefaultPracticalText(): string {
  return `
V praktickej časti práce sa odporúča najprv predstaviť výskumný súbor prostredníctvom frekvenčných tabuliek a deskriptívnych ukazovateľov. Pri kategorizovaných premenných, ako sú pohlavie, typ podniku alebo rodinný stav, je vhodné uviesť početnosti, percentá a validné percentá. Pri číselných premenných, ako je vek, je vhodné uviesť priemer, medián, smerodajnú odchýlku, minimum a maximum.

Následne sa odporúča spracovať deskriptívnu štatistiku použitých dotazníkových škál. Pri škále WEMWBS je vhodné uviesť výsledky jednotlivých položiek aj celkové skóre. Pri škále JSS je vhodné uviesť celkové skóre a zároveň subškály pracovnej spokojnosti. Pred overovaním hypotéz je potrebné skontrolovať normalitu rozdelenia hlavných skóre, napríklad pomocou Shapiro-Wilkovho testu.

Ak dáta nespĺňajú predpoklad normálneho rozdelenia, pri korelačných hypotézach sa odporúča použiť Spearmanovu koreláciu. Pri porovnaní dvoch skupín je vhodný Mann-Whitney U test a pri porovnaní viac ako dvoch skupín Kruskal-Wallis test. V prípade splnenia parametrických predpokladov možno použiť Pearsonovu koreláciu, t-test, ANOVA alebo regresnú analýzu.

Výsledky je vhodné doplniť grafmi, najmä stĺpcovými grafmi pre demografické premenné, histogramami pre číselné premenné, boxplotmi na zobrazenie variability a korelačnou maticou na vizuálne zobrazenie vzťahov medzi hlavnými škálami.
`.trim();
}