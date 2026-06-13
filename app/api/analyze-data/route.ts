import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

import {
  runFullStatisticalAnalysis,
  type AnalysisRow,
  type CombinedScaleDefinition,
  type ScaleDefinition,
  type StatisticalAnalysisResult,
} from '@/components/analysis/analysisStats';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;

// AI klienti sa nevytvárajú globálne natvrdo.
// Endpoint musí vedieť fungovať aj vtedy, keď niektorý API kľúč chýba
// alebo konkrétny poskytovateľ zlyhá. Preto sa provider skúša postupne:
// Claude -> OpenAI -> Gemini -> Grok/xAI -> Mistral -> Groq -> Cohere -> Perplexity.

type AiProviderName =
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'xai'
  | 'mistral'
  | 'groq'
  | 'cohere'
  | 'perplexity';

type AiProviderResult = {
  enabled: boolean;
  ok: boolean;
  provider: AiProviderName | null;
  model: string | null;
  text: string;
  error: string | null;
  errors?: string[];
};

function getEnv(name: string) {
  return String(process.env[name] || '').trim();
}

function getOpenAIClient() {
  const apiKey = getEnv('OPENAI_API_KEY');

  if (!apiKey) return null;

  return new OpenAI({
    apiKey,
  });
}

async function postJson<T = any>(
  url: string,
  headers: Record<string, string>,
  body: Record<string, any>,
): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const text = await response.text();

  let payload: any = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.message ||
      payload?.error ||
      payload?.detail ||
      text ||
      `HTTP ${response.status}`;

    throw new Error(String(message));
  }

  return payload as T;
}

function createAiResult(params: {
  enabled: boolean;
  ok: boolean;
  provider: AiProviderName | null;
  model: string | null;
  text?: string;
  error?: string | null;
  errors?: string[];
}): AiProviderResult {
  return {
    enabled: params.enabled,
    ok: params.ok,
    provider: params.provider,
    model: params.model,
    text: params.text || '',
    error: params.error ?? null,
    errors: params.errors,
  };
}

function buildAiSystemInstruction() {
  return [
    'Si profesionálny štatistik, metodológ a konzultant praktickej časti záverečných prác.',
    'Vždy odpovedáš iba validným JSON objektom bez markdownu, bez ``` blokov a bez komentára mimo JSON.',
    'Nikdy nenechaj prázdne polia practicalText, interpretation ani fullText.',
    'Interpretuj vypočítané tabuľky, ale neprepočítavaj ich ručne.',
    'Odpovedaj po slovensky.',
  ].join(' ');
}

async function callAnthropic(prompt: string): Promise<AiProviderResult> {
  const apiKey = getEnv('ANTHROPIC_API_KEY');
  const model = getEnv('ANTHROPIC_MODEL') || 'claude-sonnet-4-5';

  if (!apiKey) {
    return createAiResult({
      enabled: false,
      ok: false,
      provider: 'anthropic',
      model,
      error: 'Chýba ANTHROPIC_API_KEY.',
    });
  }

  try {
    const payload = await postJson<any>(
      'https://api.anthropic.com/v1/messages',
      {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      {
        model,
        max_tokens: 3500,
        temperature: 0.2,
        system: buildAiSystemInstruction(),
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      },
    );

    const text =
      payload?.content
        ?.map((item: any) => item?.text || '')
        .join('\n')
        .trim() || '';

    return createAiResult({
      enabled: true,
      ok: Boolean(text),
      provider: 'anthropic',
      model,
      text,
      error: text ? null : 'Claude nevrátil text.',
    });
  } catch (error) {
    return createAiResult({
      enabled: true,
      ok: false,
      provider: 'anthropic',
      model,
      error: error instanceof Error ? error.message : 'Claude zlyhal.',
    });
  }
}

async function callOpenAI(prompt: string): Promise<AiProviderResult> {
  const client = getOpenAIClient();
  const model = getEnv('OPENAI_MODEL') || 'gpt-4o-mini';

  if (!client) {
    return createAiResult({
      enabled: false,
      ok: false,
      provider: 'openai',
      model,
      error: 'Chýba OPENAI_API_KEY.',
    });
  }

  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: {
        type: 'json_object',
      },
      messages: [
        {
          role: 'system',
          content: buildAiSystemInstruction(),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const text = completion.choices[0]?.message?.content || '';

    return createAiResult({
      enabled: true,
      ok: Boolean(text.trim()),
      provider: 'openai',
      model,
      text,
      error: text.trim() ? null : 'OpenAI nevrátil text.',
    });
  } catch (error) {
    return createAiResult({
      enabled: true,
      ok: false,
      provider: 'openai',
      model,
      error: error instanceof Error ? error.message : 'OpenAI zlyhal.',
    });
  }
}

async function callGoogle(prompt: string): Promise<AiProviderResult> {
  const apiKey = getEnv('GOOGLE_GENERATIVE_AI_API_KEY');
  const model = getEnv('GOOGLE_MODEL') || 'gemini-2.5-flash';

  if (!apiKey) {
    return createAiResult({
      enabled: false,
      ok: false,
      provider: 'google',
      model,
      error: 'Chýba GOOGLE_GENERATIVE_AI_API_KEY.',
    });
  }

  try {
    const payload = await postJson<any>(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model,
      )}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        'content-type': 'application/json',
      },
      {
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `${buildAiSystemInstruction()}\n\n${prompt}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      },
    );

    const text =
      payload?.candidates?.[0]?.content?.parts
        ?.map((part: any) => part?.text || '')
        .join('\n')
        .trim() || '';

    return createAiResult({
      enabled: true,
      ok: Boolean(text),
      provider: 'google',
      model,
      text,
      error: text ? null : 'Gemini nevrátil text.',
    });
  } catch (error) {
    return createAiResult({
      enabled: true,
      ok: false,
      provider: 'google',
      model,
      error: error instanceof Error ? error.message : 'Gemini zlyhal.',
    });
  }
}

async function callOpenAiCompatibleProvider(params: {
  provider: AiProviderName;
  apiKeyName: string;
  modelName: string;
  defaultModel: string;
  url: string;
  prompt: string;
}): Promise<AiProviderResult> {
  const apiKey = getEnv(params.apiKeyName);
  const model = getEnv(params.modelName) || params.defaultModel;

  if (!apiKey) {
    return createAiResult({
      enabled: false,
      ok: false,
      provider: params.provider,
      model,
      error: `Chýba ${params.apiKeyName}.`,
    });
  }

  try {
    const payload = await postJson<any>(
      params.url,
      {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      {
        model,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: buildAiSystemInstruction(),
          },
          {
            role: 'user',
            content: params.prompt,
          },
        ],
      },
    );

    const text = payload?.choices?.[0]?.message?.content || '';

    return createAiResult({
      enabled: true,
      ok: Boolean(String(text).trim()),
      provider: params.provider,
      model,
      text,
      error: String(text).trim() ? null : `${params.provider} nevrátil text.`,
    });
  } catch (error) {
    return createAiResult({
      enabled: true,
      ok: false,
      provider: params.provider,
      model,
      error:
        error instanceof Error
          ? error.message
          : `${params.provider} zlyhal.`,
    });
  }
}

async function callXai(prompt: string): Promise<AiProviderResult> {
  return callOpenAiCompatibleProvider({
    provider: 'xai',
    apiKeyName: 'XAI_API_KEY',
    modelName: 'XAI_MODEL',
    defaultModel: 'grok-3',
    url: 'https://api.x.ai/v1/chat/completions',
    prompt,
  });
}

async function callMistral(prompt: string): Promise<AiProviderResult> {
  return callOpenAiCompatibleProvider({
    provider: 'mistral',
    apiKeyName: 'MISTRAL_API_KEY',
    modelName: 'MISTRAL_MODEL',
    defaultModel: 'mistral-small-latest',
    url: 'https://api.mistral.ai/v1/chat/completions',
    prompt,
  });
}

async function callGroq(prompt: string): Promise<AiProviderResult> {
  return callOpenAiCompatibleProvider({
    provider: 'groq',
    apiKeyName: 'GROQ_API_KEY',
    modelName: 'GROQ_MODEL',
    defaultModel: 'llama-3.1-8b-instant',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    prompt,
  });
}

async function callPerplexity(prompt: string): Promise<AiProviderResult> {
  return callOpenAiCompatibleProvider({
    provider: 'perplexity',
    apiKeyName: 'PERPLEXITY_API_KEY',
    modelName: 'PERPLEXITY_MODEL',
    defaultModel: 'sonar-pro',
    url: 'https://api.perplexity.ai/chat/completions',
    prompt,
  });
}

async function callCohere(prompt: string): Promise<AiProviderResult> {
  const apiKey = getEnv('COHERE_API_KEY');
  const model = getEnv('COHERE_MODEL') || 'command-r-plus';

  if (!apiKey) {
    return createAiResult({
      enabled: false,
      ok: false,
      provider: 'cohere',
      model,
      error: 'Chýba COHERE_API_KEY.',
    });
  }

  try {
    const payload = await postJson<any>(
      'https://api.cohere.com/v2/chat',
      {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      {
        model,
        temperature: 0.2,
        messages: [
          {
            role: 'user',
            content: `${buildAiSystemInstruction()}\n\n${prompt}`,
          },
        ],
      },
    );

    const text =
      payload?.message?.content
        ?.map((item: any) => item?.text || '')
        .join('\n')
        .trim() || '';

    return createAiResult({
      enabled: true,
      ok: Boolean(text),
      provider: 'cohere',
      model,
      text,
      error: text ? null : 'Cohere nevrátil text.',
    });
  } catch (error) {
    return createAiResult({
      enabled: true,
      ok: false,
      provider: 'cohere',
      model,
      error: error instanceof Error ? error.message : 'Cohere zlyhal.',
    });
  }
}

async function runAiInterpretation(prompt: string): Promise<AiProviderResult> {
  const providers = [
    callAnthropic,
    callOpenAI,
    callGoogle,
    callXai,
    callMistral,
    callGroq,
    callCohere,
    callPerplexity,
  ];

  const errors: string[] = [];

  for (const provider of providers) {
    const result = await provider(prompt);

    if (result.ok && result.text.trim()) {
      return result;
    }

    if (result.enabled && result.error) {
      errors.push(`${result.provider || 'unknown'}: ${result.error}`);
    }
  }

  return createAiResult({
    enabled: errors.length > 0,
    ok: false,
    provider: null,
    model: null,
    error:
      errors.length > 0
        ? errors.join(' | ')
        : 'Nie je dostupný žiadny AI provider.',
    errors,
  });
}


// ================= TYPES =================

type SavedProfile = {
  id?: string;
  title?: string;
  topic?: string;
  type?: string;
  field?: string;
  goal?: string;
  problem?: string;
  methodology?: string;
  hypotheses?: string;
  researchQuestions?: string;
  practicalPart?: string;
  citation?: string;
  language?: string;
  workLanguage?: string;
  keywords?: string[];
  keywordsList?: string[];
};

type DataRow = Record<string, string | number | null>;

type TableColumn = {
  key: string;
  label: string;
};

type AnalysisTable = {
  title: string;
  description: string;
  columns: TableColumn[];
  rows: Record<string, string | number | null>[];
};

type RecommendedChart = {
  title: string;
  type: 'bar' | 'pie' | 'histogram' | 'boxplot' | 'scatter' | 'line';
  description: string;
  variables: string[];
  xKey?: string;
  yKey?: string;
  sourceTable?: string;
  data?: Record<string, string | number | null>[];
};

type HypothesisTest = {
  title: string;
  description: string;
  variables?: string[];
  test?: string;
  reason?: string;
};

type ComputedAnalysis = {
  dataDescription: string;
  variables: {
    name: string;
    type: 'numeric' | 'categorical';
    nonEmptyCount: number;
    emptyCount: number;
    uniqueCount: number;
  }[];
  descriptiveStatistics: AnalysisTable[];
  frequencies: AnalysisTable[];
  excelTables: AnalysisTable[];
  recommendedCharts: RecommendedChart[];
  hypothesisTests: HypothesisTest[];
  warnings: string[];
  extractedRows: number;
  extractedColumns: number;
  extractedFiles: string[];
  statisticalAnalysis: StatisticalAnalysisResult;
};

// ================= TEXT HELPERS =================

function cleanText(value: unknown) {
  return String(value || '')
    .replace(/\uFEFF/g, '')
    .replace(/\u200B/g, '')
    .replace(/\u200C/g, '')
    .replace(/\u200D/g, '')
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function safeJsonParse<T>(value: FormDataEntryValue | null): T | null {
  if (!value) return null;

  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return null;
  }
}

function getFileExtension(fileName: string) {
  const index = fileName.lastIndexOf('.');
  if (index === -1) return '';
  return fileName.slice(index).toLowerCase();
}

function getKeywords(profile: SavedProfile | null) {
  if (!profile) return 'nezadané';

  if (Array.isArray(profile.keywordsList) && profile.keywordsList.length > 0) {
    return profile.keywordsList.join(', ');
  }

  if (Array.isArray(profile.keywords) && profile.keywords.length > 0) {
    return profile.keywords.join(', ');
  }

  return 'nezadané';
}

function extractJsonFromText(text: string) {
  const cleaned = cleanText(text);

  const fenced = cleaned.match(/```json\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return cleaned.slice(firstBrace, lastBrace + 1);
  }

  return cleaned;
}

function round(value: number, digits = 2) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function isEmptyValue(value: unknown) {
  return value === null || value === undefined || cleanText(value) === '';
}

function parseNumericValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  const text = cleanText(value)
    .replace(/\s/g, '')
    .replace(',', '.')
    .replace('%', '');

  if (!text) return null;

  const number = Number(text);

  if (!Number.isFinite(number)) return null;

  return number;
}

function parseNumberFromFormData(value: FormDataEntryValue | null): number | undefined {
  const parsed = parseNumericValue(value);
  return parsed === null ? undefined : parsed;
}

function parseStringArrayFromFormData(value: FormDataEntryValue | null): string[] | undefined {
  if (!value) return undefined;

  const parsed = safeJsonParse<string[]>(value);
  if (Array.isArray(parsed)) {
    return parsed.map((item) => cleanText(item)).filter(Boolean);
  }

  const text = cleanText(value);
  if (!text) return undefined;

  return text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function median(values: number[]) {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

function quantile(values: number[], q: number) {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * q;
  const base = Math.floor(position);
  const rest = position - base;

  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }

  return sorted[base];
}


function standardDeviation(values: number[]) {
  if (values.length <= 1) return 0;

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;

  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    (values.length - 1);

  return Math.sqrt(variance);
}

function normalizePValue(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  if (value < 0.001) return '< .001';
  return round(value, 3);
}

function isLikelyIdColumnName(column: string) {
  const normalized = cleanText(column).toLowerCase();

  return (
    normalized === 'id' ||
    normalized === 'respondent id' ||
    normalized === 'respondent_id' ||
    normalized === 'respondent' ||
    normalized === 'číslo' ||
    normalized === 'cislo' ||
    normalized === 'poradie' ||
    normalized === 'por. č.' ||
    normalized === 'por. c.' ||
    normalized.includes('identifikátor') ||
    normalized.includes('identifikator')
  );
}

function resolveEffectiveIdColumn(rows: DataRow[], requestedIdColumn?: string) {
  if (requestedIdColumn && getColumnNames(rows).includes(requestedIdColumn)) {
    return requestedIdColumn;
  }

  const columns = getColumnNames(rows);

  for (const column of columns) {
    if (!isLikelyIdColumnName(column)) continue;

    const values = rows
      .map((row) => row[column])
      .filter((value) => !isEmptyValue(value))
      .map((value) => cleanText(value));

    if (values.length === 0) continue;

    const uniqueCount = new Set(values).size;

    if (uniqueCount === values.length || uniqueCount / values.length >= 0.95) {
      return column;
    }
  }

  return requestedIdColumn;
}

function normalizeAlpha(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) return 0.05;
  if (value <= 0 || value >= 1) return 0.05;
  return value;
}

function compareFrequencyLabels(a: string, b: string) {
  const aNumber = parseNumericValue(a);
  const bNumber = parseNumericValue(b);

  if (aNumber !== null && bNumber !== null) {
    return aNumber - bNumber;
  }

  return a.localeCompare(b, 'sk', { numeric: true, sensitivity: 'base' });
}

// ================= FILE EXTRACTION =================

function detectDelimiter(line: string) {
  const delimiters = [';', ',', '\t'];

  let bestDelimiter = ';';
  let bestCount = 0;

  for (const delimiter of delimiters) {
    const count = line.split(delimiter).length;

    if (count > bestCount) {
      bestCount = count;
      bestDelimiter = delimiter;
    }
  }

  return bestDelimiter;
}

function splitCsvLine(line: string, delimiter: string) {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && nextChar === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current.trim());

  return result;
}

function parseDelimitedTextToRows(text: string): DataRow[] {
  const cleaned = cleanText(text);
  const lines = cleaned
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCsvLine(lines[0], delimiter).map((header, index) => {
    const cleanedHeader = cleanText(header);
    return cleanedHeader || `Stĺpec ${index + 1}`;
  });

  const rows: DataRow[] = [];

  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line, delimiter);

    const row: DataRow = {};

    headers.forEach((header, index) => {
      const rawValue = cells[index] ?? '';
      const numericValue = parseNumericValue(rawValue);

      row[header] =
        numericValue !== null && rawValue.trim() !== ''
          ? numericValue
          : cleanText(rawValue);
    });

    rows.push(row);
  }

  return rows;
}

async function readExcelRows(file: File): Promise<DataRow[]> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const XLSX = await import('xlsx');

  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    cellDates: true,
    cellNF: false,
    cellText: false,
  });

  const allRows: DataRow[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
      raw: false,
    });

    for (const row of rows) {
      const normalizedRow: DataRow = {};

      for (const [key, value] of Object.entries(row)) {
        const header = cleanText(key);

        if (!header || header.startsWith('__EMPTY')) continue;

        const textValue = cleanText(value);
        const numericValue = parseNumericValue(textValue);

        normalizedRow[header] =
          numericValue !== null && textValue !== '' ? numericValue : textValue;
      }

      if (Object.keys(normalizedRow).length > 0) {
        allRows.push(normalizedRow);
      }
    }
  }

  return allRows;
}

async function readFileAsText(file: File) {
  const extension = getFileExtension(file.name);

  if (['.txt', '.csv', '.md', '.rtf'].includes(extension)) {
    try {
      return cleanText(await file.text());
    } catch {
      return '';
    }
  }

  if (['.xlsx', '.xls'].includes(extension)) {
    try {
      const rows = await readExcelRows(file);

      if (rows.length === 0) {
        return `Súbor "${file.name}" bol načítaný, ale neobsahuje čitateľné tabuľkové dáta.`;
      }

      const previewRows = rows.slice(0, 20);

      return cleanText(`
Súbor "${file.name}" bol načítaný ako Excel.
Počet načítaných riadkov: ${rows.length}
Počet stĺpcov: ${Object.keys(rows[0] || {}).length}

Ukážka dát:
${JSON.stringify(previewRows, null, 2)}
`);
    } catch (error) {
      return `Súbor "${file.name}" sa nepodarilo načítať ako Excel. Detail: ${
        error instanceof Error ? error.message : 'neznáma chyba'
      }`;
    }
  }

  if (['.pdf', '.docx', '.doc', '.pptx'].includes(extension)) {
    return `Súbor "${file.name}" bol priložený, ale tento endpoint spracúva štatisticky hlavne Excel/CSV/TXT dáta. Pre PDF/DOCX odporúčam najprv extrahovať text cez samostatný endpoint /api/extract-text.`;
  }

  return `Súbor "${file.name}" bol priložený.`;
}

async function extractRowsFromFile(file: File): Promise<DataRow[]> {
  const extension = getFileExtension(file.name);

  if (['.csv', '.txt'].includes(extension)) {
    const text = await file.text();
    return parseDelimitedTextToRows(text);
  }

  if (['.xlsx', '.xls'].includes(extension)) {
    return readExcelRows(file);
  }

  return [];
}

// ================= COMPUTED ANALYSIS =================

function getColumnNames(rows: DataRow[]) {
  const columnSet = new Set<string>();

  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (cleanText(key)) columnSet.add(key);
    }
  }

  return Array.from(columnSet);
}

function detectVariableType(rows: DataRow[], column: string): 'numeric' | 'categorical' {
  const values = rows
    .map((row) => row[column])
    .filter((value) => !isEmptyValue(value));

  if (values.length === 0) return 'categorical';

  const numericCount = values.filter((value) => parseNumericValue(value) !== null).length;
  const numericRatio = numericCount / values.length;
  const uniqueCount = new Set(values.map((value) => cleanText(value))).size;

  if (numericRatio >= 0.8) {
    return 'numeric';
  }

  return 'categorical';
}

function buildVariableSummary(rows: DataRow[]) {
  const columns = getColumnNames(rows);

  return columns.map((column) => {
    const values = rows.map((row) => row[column]);
    const nonEmptyValues = values.filter((value) => !isEmptyValue(value));
    const uniqueValues = new Set(nonEmptyValues.map((value) => cleanText(value)));

    return {
      name: column,
      type: detectVariableType(rows, column),
      nonEmptyCount: nonEmptyValues.length,
      emptyCount: values.length - nonEmptyValues.length,
      uniqueCount: uniqueValues.size,
    };
  });
}

function buildDescriptiveStatistics(rows: DataRow[]): AnalysisTable[] {
  const variables = buildVariableSummary(rows).filter(
    (variable) => variable.type === 'numeric' && !isLikelyIdColumnName(variable.name),
  );

  if (variables.length === 0) return [];

  const tableRows = variables.map((variable) => {
    const values = rows
      .map((row) => parseNumericValue(row[variable.name]))
      .filter((value): value is number => value !== null);

    const sum = values.reduce((acc, value) => acc + value, 0);
    const mean = values.length > 0 ? sum / values.length : 0;

    return {
      variable: variable.name,
      n: values.length,
      missing: rows.length - values.length,
      mean: round(mean),
      median: round(median(values)),
      sd: round(standardDeviation(values)),
      min: values.length ? round(Math.min(...values)) : 0,
      q1: round(quantile(values, 0.25)),
      q3: round(quantile(values, 0.75)),
      max: values.length ? round(Math.max(...values)) : 0,
    };
  });

  return [
    {
      title: 'Deskriptívna štatistika položiek',
      description:
        'Základná deskriptívna štatistika pre číselné premenné/položky z dátového súboru.',
      columns: [
        { key: 'variable', label: 'Premenná' },
        { key: 'n', label: 'N' },
        { key: 'missing', label: 'Chýbajúce' },
        { key: 'mean', label: 'Priemer' },
        { key: 'median', label: 'Medián' },
        { key: 'sd', label: 'SD' },
        { key: 'min', label: 'Minimum' },
        { key: 'q1', label: 'Q1' },
        { key: 'q3', label: 'Q3' },
        { key: 'max', label: 'Maximum' },
      ],
      rows: tableRows,
    },
  ];
}

function buildFrequencyTables(rows: DataRow[]): AnalysisTable[] {
  const variables = buildVariableSummary(rows).filter(
    (variable) =>
      !isLikelyIdColumnName(variable.name) &&
      (variable.type === 'categorical' ||
        (variable.type === 'numeric' && variable.uniqueCount <= 20)),
  );

  return variables.map((variable) => {
    const values = rows.map((row) => row[variable.name]);
    const total = values.length;
    const validValues = values.filter((value) => !isEmptyValue(value));
    const validTotal = validValues.length;

    const counts = new Map<string, number>();

    for (const value of validValues) {
      const label = cleanText(value) || 'Nezadané';
      counts.set(label, (counts.get(label) || 0) + 1);
    }

    const sortedEntries = Array.from(counts.entries()).sort((a, b) => {
      const labelOrder = compareFrequencyLabels(a[0], b[0]);
      return labelOrder === 0 ? b[1] - a[1] : labelOrder;
    });

    let cumulativePercent = 0;

    const tableRows = sortedEntries.map(([value, count]) => {
      const percent = total > 0 ? (count / total) * 100 : 0;
      const validPercent = validTotal > 0 ? (count / validTotal) * 100 : 0;
      cumulativePercent += validPercent;

      return {
        value,
        frequency: count,
        percent: round(percent),
        validPercent: round(validPercent),
        cumulativePercent: round(cumulativePercent),
      };
    });

    if (total - validTotal > 0) {
      tableRows.push({
        value: 'Chýbajúce odpovede',
        frequency: total - validTotal,
        percent: round(((total - validTotal) / total) * 100),
        validPercent: 0,
        cumulativePercent: round(cumulativePercent),
      });
    }

    return {
      title: variable.name,
      description: `Frekvenčná tabuľka pre premennú/stĺpec „${variable.name}“.`,
      columns: [
        { key: 'value', label: variable.name },
        { key: 'frequency', label: 'Frekvencia' },
        { key: 'percent', label: 'Percent' },
        { key: 'validPercent', label: 'Validné percentá' },
        { key: 'cumulativePercent', label: 'Kumulatívne percentá' },
      ],
      rows: tableRows,
    };
  });
}

function buildRecommendedCharts(frequencies: AnalysisTable[]): RecommendedChart[] {
  return frequencies.map((table) => ({
    title: `Stĺpcový graf – ${table.title}`,
    type: 'bar',
    description: `Stĺpcový graf sa má generovať zo stĺpca Percent vo frekvenčnej tabuľke „${table.title}“.`,
    variables: [table.title],
    xKey: 'value',
    yKey: 'percent',
    sourceTable: table.title,
    data: table.rows.map((row) => ({
      value: row.value,
      percent: row.percent,
    })),
  }));
}

function buildHypothesisTests(rows: DataRow[], profile: SavedProfile | null): HypothesisTest[] {
  const variables = buildVariableSummary(rows);
  const numericVariables = variables.filter((variable) => variable.type === 'numeric');
  const categoricalVariables = variables.filter((variable) => variable.type === 'categorical');

  const tests: HypothesisTest[] = [];

  if (profile?.hypotheses || profile?.researchQuestions) {
    tests.push({
      title: 'Testovanie hypotéz podľa zadania práce',
      description:
        'Na základe uvedených hypotéz alebo výskumných otázok je potrebné zvoliť test podľa typu premenných.',
      variables: [],
      test: 'Výber podľa hypotézy',
      reason: cleanText(`${profile?.hypotheses || ''}\n${profile?.researchQuestions || ''}`),
    });
  }

  if (numericVariables.length >= 2) {
    tests.push({
      title: 'Vzťah medzi číselnými premennými',
      description:
        'Pre dvojice číselných premenných odporúčam korelačnú analýzu. Pri normálnom rozdelení Pearsonovu koreláciu, pri porušení normality Spearmanovu koreláciu.',
      variables: numericVariables.slice(0, 5).map((variable) => variable.name),
      test: 'Pearsonova alebo Spearmanova korelácia',
      reason: 'Používa sa na overenie vzťahu medzi dvomi číselnými premennými.',
    });
  }

  if (categoricalVariables.length >= 1 && numericVariables.length >= 1) {
    tests.push({
      title: 'Rozdiely v číselnej premennej podľa skupín',
      description:
        'Ak kategóriová premenná tvorí skupiny a číselná premenná je výsledok, odporúčam t-test pri dvoch skupinách, ANOVA pri troch a viacerých skupinách. Pri nenormálnom rozdelení Mann-Whitney alebo Kruskal-Wallis.',
      variables: [categoricalVariables[0].name, numericVariables[0].name],
      test: 't-test / ANOVA / Mann-Whitney / Kruskal-Wallis',
      reason: 'Používa sa na porovnanie priemerov alebo rozdelení medzi skupinami.',
    });
  }

  if (categoricalVariables.length >= 2) {
    tests.push({
      title: 'Vzťah medzi kategóriovými premennými',
      description:
        'Pre dve kategóriové premenné odporúčam chí-kvadrát test nezávislosti.',
      variables: categoricalVariables.slice(0, 2).map((variable) => variable.name),
      test: 'Chí-kvadrát test nezávislosti',
      reason: 'Používa sa na overenie súvislosti medzi dvomi kategóriovými premennými.',
    });
  }

  if (numericVariables.length >= 1) {
    tests.push({
      title: 'Overenie normality číselných premenných',
      description:
        'Pred výberom parametrických testov odporúčam overiť normalitu rozdelenia pomocou Shapiro-Wilkovho testu, histogramu a Q-Q grafu.',
      variables: numericVariables.map((variable) => variable.name),
      test: 'Shapiro-Wilkov test normality',
      reason: 'Výsledok normality pomáha rozhodnúť, či použiť parametrické alebo neparametrické testy.',
    });
  }

  if (tests.length === 0) {
    tests.push({
      title: 'Odporúčanie k hypotézam',
      description:
        'V nahraných dátach nie je dostatok štruktúrovaných premenných na automatické odporúčanie testov.',
      variables: [],
      test: 'Nie je možné určiť',
      reason: 'Chýbajú vhodné premenné alebo dáta.',
    });
  }

  return tests;
}

function toStatisticalRows(rows: DataRow[]): AnalysisRow[] {
  return rows.map((row) => {
    const output: AnalysisRow = {};

    Object.entries(row).forEach(([key, value]) => {
      output[key] = value;
    });

    return output;
  });
}

function buildStatisticalTables(statisticalAnalysis: StatisticalAnalysisResult): AnalysisTable[] {
  const frequencyTables: AnalysisTable[] = statisticalAnalysis.frequencies.map((table) => ({
    title: `Frekvencie – ${table.variable}`,
    description:
      'Frekvenčná tabuľka vypočítaná zo štatistického jadra vrátane percent, validných percent a kumulatívnych percent.',
    columns: [
      { key: 'value', label: 'Hodnota' },
      { key: 'count', label: 'Počet' },
      { key: 'percent', label: 'Percent' },
      { key: 'validPercent', label: 'Validné percento' },
      { key: 'cumulativePercent', label: 'Kumulatívne percento' },
    ],
    rows: table.values.map((row) => ({
      value: row.value,
      count: row.count,
      percent: row.percent,
      validPercent: row.validPercent,
      cumulativePercent: row.cumulativePercent,
    })),
  }));

  const scaleDescriptivesTable: AnalysisTable = {
    title: 'Deskriptívna štatistika škál a subškál',
    description:
      'JASP štýl tabuľky pre škály a subškály: Valid, Missing, Median, Mean, SD, Skewness, Kurtosis, Shapiro-Wilk, p-hodnota, Minimum a Maximum.',
    columns: [
      { key: 'variable', label: 'Škála / subškála' },
      { key: 'valid', label: 'Valid' },
      { key: 'missing', label: 'Missing' },
      { key: 'median', label: 'Median' },
      { key: 'mean', label: 'Mean' },
      { key: 'standardDeviation', label: 'Std. Deviation' },
      { key: 'skewness', label: 'Skewness' },
      { key: 'standardErrorSkewness', label: 'Std. Error of Skewness' },
      { key: 'kurtosis', label: 'Kurtosis' },
      { key: 'standardErrorKurtosis', label: 'Std. Error of Kurtosis' },
      { key: 'shapiroWilk', label: 'Shapiro-Wilk' },
      { key: 'pValueOfShapiroWilk', label: 'P-value of Shapiro-Wilk' },
      { key: 'minimum', label: 'Minimum' },
      { key: 'maximum', label: 'Maximum' },
    ],
    rows: statisticalAnalysis.scaleDescriptives.map((row) => {
      const normality = statisticalAnalysis.normality.find(
        (item) => item.variable === row.variable,
      );

      return {
        variable: row.variable,
        valid: row.valid,
        missing: row.missing,
        median: row.median,
        mean: row.mean,
        standardDeviation: row.standardDeviation,
        skewness: row.skewness,
        standardErrorSkewness: row.standardErrorSkewness,
        kurtosis: row.kurtosis,
        standardErrorKurtosis: row.standardErrorKurtosis,
        shapiroWilk: normality?.statistic ?? null,
        pValueOfShapiroWilk: normalizePValue(normality?.pValue),
        minimum: row.minimum,
        maximum: row.maximum,
      };
    }),
  };

  const reliabilityTable: AnalysisTable = {
    title: 'Reliabilita škál – Cronbach alfa',
    description:
      'Reliabilita vypočítaná pre automaticky alebo manuálne rozpoznané škály a subškály.',
    columns: [
      { key: 'scaleName', label: 'Škála / subškála' },
      { key: 'validRows', label: 'Valid rows' },
      { key: 'cronbachAlpha', label: "Cronbach's alpha" },
      { key: 'interpretation', label: 'Interpretácia' },
    ],
    rows: statisticalAnalysis.reliability.map((row) => ({
      scaleName: row.scaleName,
      validRows: row.validRows,
      cronbachAlpha: row.cronbachAlpha,
      interpretation: row.interpretation,
    })),
  };

  const spearmanTable: AnalysisTable = {
    title: 'Spearmanove korelácie medzi škálami a subškálami',
    description:
      'Korelačná analýza medzi vypočítanými škálami/subškálami. Vhodné pre malé súbory a ordinálne alebo nenormálne dáta.',
    columns: [
      { key: 'variableA', label: 'Premenná 1' },
      { key: 'variableB', label: 'Premenná 2' },
      { key: 'rho', label: "Spearman's rho" },
      { key: 'pValue', label: 'p' },
      { key: 'significance', label: 'Signifikancia' },
      { key: 'fisherZ', label: "Effect size Fisher's z" },
      { key: 'standardError', label: 'SE Effect size' },
      { key: 'interpretation', label: 'Interpretácia' },
    ],
    rows: statisticalAnalysis.correlations.spearman.map((row) => ({
      variableA: row.variableA,
      variableB: row.variableB,
      rho: row.r,
      pValue: normalizePValue(row.pValue),
      significance: row.significance,
      fisherZ: row.fisherZ,
      standardError: row.standardError,
      interpretation: row.interpretation,
    })),
  };

  const normalityTable: AnalysisTable = {
    title: 'Normalita dát',
    description:
      'Posúdenie normality škál a subškál a odporúčanie parametrických alebo neparametrických testov.',
    columns: [
      { key: 'variable', label: 'Premenná' },
      { key: 'valid', label: 'Valid' },
      { key: 'method', label: 'Metóda' },
      { key: 'statistic', label: 'Štatistika' },
      { key: 'pValue', label: 'p' },
      { key: 'isNormal', label: 'Normálne rozdelenie' },
      { key: 'recommendation', label: 'Odporúčanie' },
      { key: 'note', label: 'Poznámka' },
    ],
    rows: statisticalAnalysis.normality.map((row) => ({
      variable: row.variable,
      valid: row.valid,
      method: row.method,
      statistic: row.statistic,
      pValue: normalizePValue(row.pValue),
      isNormal: row.isNormal === null ? null : row.isNormal ? 'Áno' : 'Nie',
      recommendation: row.recommendation,
      note: row.note,
    })),
  };

  const output: AnalysisTable[] = [
    ...frequencyTables,
  ];

  if (scaleDescriptivesTable.rows.length > 0) output.push(scaleDescriptivesTable);
  if (normalityTable.rows.length > 0) output.push(normalityTable);
  if (reliabilityTable.rows.length > 0) output.push(reliabilityTable);
  if (spearmanTable.rows.length > 0) output.push(spearmanTable);

  return output;
}

function buildExcelTables(
  descriptiveStatistics: AnalysisTable[],
  frequencies: AnalysisTable[],
  statisticalTables: AnalysisTable[],
) {
  return [
    ...descriptiveStatistics,
    ...frequencies,
    ...statisticalTables,
  ];
}

function buildComputedAnalysis({
  rows,
  files,
  dataDescription,
  profile,
  statisticalAnalysis,
}: {
  rows: DataRow[];
  files: File[];
  dataDescription: string;
  profile: SavedProfile | null;
  statisticalAnalysis: StatisticalAnalysisResult;
}): ComputedAnalysis {
  const warnings: string[] = [];

  if (rows.length === 0) {
    warnings.push(
      'Nepodarilo sa načítať tabuľkové dáta z Excel/CSV súboru. Deskriptívna a frekvenčná analýza bude iba odporúčaná, nie vypočítaná.',
    );
  }

  const variables = buildVariableSummary(rows);

  if (variables.length === 0) {
    warnings.push('Neboli identifikované žiadne premenné/stĺpce.');
  }

  if (statisticalAnalysis.meta.fallbackUsed) {
    warnings.push(
      'Neboli spoľahlivo rozpoznané škály/subškály. Systém preto použil numerické premenné ako náhradné skóre. Pre presné výsledky odporúčame zadať alebo overiť definície škál.',
    );
  }

  const descriptiveStatistics = buildDescriptiveStatistics(rows);
  const frequencies = buildFrequencyTables(rows);
  const statisticalTables = buildStatisticalTables(statisticalAnalysis);
  const recommendedCharts = buildRecommendedCharts(frequencies);
  const hypothesisTests = buildHypothesisTests(rows, profile);
  const excelTables = buildExcelTables(descriptiveStatistics, frequencies, statisticalTables);

  const extractedColumns = getColumnNames(rows).length;

  return {
    dataDescription:
      dataDescription ||
      (rows.length > 0
        ? `Bolo načítaných ${rows.length} riadkov a ${extractedColumns} stĺpcov.`
        : 'Dáta neboli načítané ako štruktúrovaná tabuľka.'),
    variables,
    descriptiveStatistics,
    frequencies,
    excelTables,
    recommendedCharts,
    hypothesisTests,
    warnings,
    extractedRows: rows.length,
    extractedColumns,
    extractedFiles: files.map((file) => file.name),
    statisticalAnalysis,
  };
}


// ================= JASP OUTPUT HELPERS =================

type AnyRecord = Record<string, any>;

function formatJaspNumber(value: unknown, digits = 3) {
  const parsed = parseNumericValue(value);

  if (parsed === null || !Number.isFinite(parsed)) return null;

  return parsed.toFixed(digits);
}

function formatJaspCount(value: unknown) {
  const parsed = parseNumericValue(value);

  if (parsed === null || !Number.isFinite(parsed)) return null;

  return Math.round(parsed);
}

function formatJaspPValue(value: unknown) {
  const parsed = parseNumericValue(value);

  if (parsed === null || !Number.isFinite(parsed)) return null;
  if (parsed < 0.001) return '< .001';

  return parsed.toFixed(3);
}

function normalizeForSection(value: string) {
  return cleanText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function getJaspFrequencySectionTitle(variable: string) {
  const normalized = normalizeForSection(variable);

  if (normalized.includes('s-embu otec') || normalized.includes('embu otec')) {
    return 'FREKVENČNÉ TABUĽKY EMBU OTEC';
  }

  if (normalized.includes('s-embu matka') || normalized.includes('embu matka')) {
    return 'FREKVENČNÁ TABUĽKA EMBU MATKA';
  }

  if (
    normalized.includes('skala skolskej zaclenenosti') ||
    normalized.includes('skolskej zaclenenosti') ||
    normalized.includes('school belonging')
  ) {
    return 'FREKVENČNÁ TABUĽKA ŠKÁLA ŠKOLSKEJ ZAČLENENOSTI';
  }

  return 'FREKVENČNÉ TABUĽKY OSTATNÉ PREMENNÉ';
}

function getJaspFrequencySectionOrder(title: string) {
  if (title.includes('EMBU OTEC')) return 1;
  if (title.includes('EMBU MATKA')) return 2;
  if (title.includes('ŠKÁLA ŠKOLSKEJ ZAČLENENOSTI')) return 3;
  return 99;
}

function buildJaspFrequencyTable(rawTable: AnyRecord): AnalysisTable {
  const variable = cleanText(rawTable.variable || rawTable.title || 'Premenná');
  const values = Array.isArray(rawTable.values) ? rawTable.values : [];

  const validTotal = values.reduce((sum: number, row: AnyRecord) => {
    const count = parseNumericValue(row.count ?? row.frequency ?? 0) ?? 0;
    return sum + count;
  }, 0);

  const missing = Math.max(
    0,
    Math.round(parseNumericValue(rawTable.missing ?? rawTable.missingCount ?? 0) ?? 0),
  );

  const total = Math.max(
    validTotal + missing,
    Math.round(parseNumericValue(rawTable.total ?? rawTable.totalCount ?? 0) ?? 0),
  );

  const rows = values
    .map((row: AnyRecord) => ({
      value: cleanText(row.value ?? row.label ?? row.category),
      frequency: formatJaspCount(row.count ?? row.frequency),
      percent: formatJaspNumber(row.percent),
      validPercent: formatJaspNumber(row.validPercent),
      cumulativePercent: formatJaspNumber(row.cumulativePercent),
    }))
    .sort((a: AnyRecord, b: AnyRecord) => compareFrequencyLabels(String(a.value), String(b.value)));

  rows.push({
    value: 'Missing',
    frequency: missing,
    percent: total > 0 ? ((missing / total) * 100).toFixed(3) : '0.000',
    validPercent: null,
    cumulativePercent: null,
  });

  rows.push({
    value: 'Total',
    frequency: total || validTotal,
    percent: '100.000',
    validPercent: null,
    cumulativePercent: null,
  });

  return {
    title: `Frequencies for ${variable}`,
    description:
      'Výstup v štýle JASP: Frequency, Percent, Valid Percent a Cumulative Percent vrátane riadkov Missing a Total.',
    columns: [
      { key: 'value', label: variable },
      { key: 'frequency', label: 'Frequency' },
      { key: 'percent', label: 'Percent' },
      { key: 'validPercent', label: 'Valid Percent' },
      { key: 'cumulativePercent', label: 'Cumulative Percent' },
    ],
    rows,
  };
}

function buildJaspFrequencySections(statisticalAnalysis: StatisticalAnalysisResult) {
  const groups = new Map<string, AnalysisTable[]>();

  for (const table of statisticalAnalysis.frequencies as unknown as AnyRecord[]) {
    const variable = cleanText(table.variable || table.title || 'Premenná');
    const sectionTitle = getJaspFrequencySectionTitle(variable);
    const current = groups.get(sectionTitle) || [];
    current.push(buildJaspFrequencyTable(table));
    groups.set(sectionTitle, current);
  }

  return Array.from(groups.entries())
    .sort(([titleA], [titleB]) => getJaspFrequencySectionOrder(titleA) - getJaspFrequencySectionOrder(titleB))
    .map(([title, tables], index) => ({
      key: `frequency-${index + 1}`,
      title,
      subtitle: `${index + 1} Frequency Tables`,
      description:
        'Sekcia frekvenčných tabuliek je rozdelená rovnako ako v prílohe: EMBU Otec, EMBU Matka a Škála školskej začlenenosti.',
      tables,
    }));
}

function buildJaspDescriptiveTable(statisticalAnalysis: StatisticalAnalysisResult): AnalysisTable {
  return {
    title: 'Descriptive Statistics',
    description:
      'DESKRIPTÍVNA ŠTATISTIKA - škály a subškály. Tabuľka kopíruje štruktúru JASP výstupu zo strán 18–20 prílohy.',
    columns: [
      { key: 'variable', label: '' },
      { key: 'valid', label: 'Valid' },
      { key: 'missing', label: 'Missing' },
      { key: 'median', label: 'Median' },
      { key: 'mean', label: 'Mean' },
      { key: 'standardDeviation', label: 'Std. Deviation' },
      { key: 'skewness', label: 'Skewness' },
      { key: 'standardErrorSkewness', label: 'Std. Error of Skewness' },
      { key: 'kurtosis', label: 'Kurtosis' },
      { key: 'standardErrorKurtosis', label: 'Std. Error of Kurtosis' },
      { key: 'shapiroWilk', label: 'Shapiro-Wilk' },
      { key: 'pValueOfShapiroWilk', label: 'P-value of Shapiro-Wilk' },
      { key: 'minimum', label: 'Minimum' },
      { key: 'maximum', label: 'Maximum' },
    ],
    rows: statisticalAnalysis.scaleDescriptives.map((row) => {
      const normality = statisticalAnalysis.normality.find(
        (item) => item.variable === row.variable,
      );

      return {
        variable: row.variable,
        valid: formatJaspCount(row.valid),
        missing: formatJaspCount(row.missing),
        median: formatJaspNumber(row.median),
        mean: formatJaspNumber(row.mean),
        standardDeviation: formatJaspNumber(row.standardDeviation),
        skewness: formatJaspNumber(row.skewness),
        standardErrorSkewness: formatJaspNumber(row.standardErrorSkewness),
        kurtosis: formatJaspNumber(row.kurtosis),
        standardErrorKurtosis: formatJaspNumber(row.standardErrorKurtosis),
        shapiroWilk: formatJaspNumber(normality?.statistic),
        pValueOfShapiroWilk: formatJaspPValue(normality?.pValue),
        minimum: formatJaspNumber(row.minimum),
        maximum: formatJaspNumber(row.maximum),
      };
    }),
  };
}

function variance(values: number[]) {
  if (values.length <= 1) return 0;

  const meanValue = values.reduce((sum, value) => sum + value, 0) / values.length;

  return (
    values.reduce((sum, value) => sum + (value - meanValue) ** 2, 0) /
    (values.length - 1)
  );
}

function cronbachAlphaFromMatrix(matrix: number[][]) {
  if (matrix.length < 2) return null;

  const itemCount = matrix[0]?.length || 0;
  if (itemCount < 2) return null;

  const cleanMatrix = matrix.filter(
    (row) => row.length === itemCount && row.every((value) => Number.isFinite(value)),
  );

  if (cleanMatrix.length < 2) return null;

  const itemVariances = Array.from({ length: itemCount }, (_, columnIndex) =>
    variance(cleanMatrix.map((row) => row[columnIndex])),
  );

  const totalScores = cleanMatrix.map((row) => row.reduce((sum, value) => sum + value, 0));
  const totalVariance = variance(totalScores);

  if (totalVariance <= 0) return null;

  const alpha =
    (itemCount / (itemCount - 1)) *
    (1 - itemVariances.reduce((sum, value) => sum + value, 0) / totalVariance);

  return Number.isFinite(alpha) ? alpha : null;
}

function getScaleScoreRows(statisticalAnalysis: StatisticalAnalysisResult) {
  const rawRows = (statisticalAnalysis as unknown as AnyRecord).scaleScores;
  return Array.isArray(rawRows) ? rawRows as AnyRecord[] : [];
}

function getScaleScoreVariables(statisticalAnalysis: StatisticalAnalysisResult) {
  const fromDescriptives = statisticalAnalysis.scaleDescriptives
    .map((row) => cleanText(row.variable))
    .filter(Boolean);

  if (fromDescriptives.length > 0) return fromDescriptives;

  const rows = getScaleScoreRows(statisticalAnalysis);
  const firstRow = rows[0] || {};

  return Object.keys(firstRow).filter((key) => parseNumericValue(firstRow[key]) !== null);
}

function buildScaleScoreMatrix(
  statisticalAnalysis: StatisticalAnalysisResult,
  variables: string[],
) {
  const rows = getScaleScoreRows(statisticalAnalysis);

  return rows
    .map((row) =>
      variables.map((variable) => parseNumericValue(row[variable])),
    )
    .filter((row): row is number[] => row.every((value) => value !== null))
    .map((row) => row as number[]);
}

function buildJaspScaleReliabilityTable(statisticalAnalysis: StatisticalAnalysisResult): AnalysisTable {
  const variables = getScaleScoreVariables(statisticalAnalysis);
  const matrix = buildScaleScoreMatrix(statisticalAnalysis, variables);
  const pointEstimate = cronbachAlphaFromMatrix(matrix);

  return {
    title: 'Frequentist Scale Reliability Statistics',
    description:
      'Celkový odhad Cronbachovho alfa pre škály/subškály spracovaný v rovnakom členení ako v prílohe.',
    columns: [
      { key: 'estimate', label: 'Estimate' },
      { key: 'cronbachAlpha', label: "Cronbach's α" },
    ],
    rows: [
      {
        estimate: 'Point estimate',
        cronbachAlpha: formatJaspNumber(pointEstimate),
      },
      {
        estimate: '95% CI lower bound',
        cronbachAlpha: null,
      },
      {
        estimate: '95% CI upper bound',
        cronbachAlpha: null,
      },
    ],
  };
}

function buildJaspIndividualReliabilityTable(statisticalAnalysis: StatisticalAnalysisResult): AnalysisTable {
  const variables = getScaleScoreVariables(statisticalAnalysis);
  const rows = getScaleScoreRows(statisticalAnalysis);

  const hasScaleScoreRows = rows.length > 0 && variables.length > 2;

  const outputRows = hasScaleScoreRows
    ? variables.map((variable) => {
        const variablesWithoutCurrent = variables.filter((item) => item !== variable);
        const matrix = buildScaleScoreMatrix(statisticalAnalysis, variablesWithoutCurrent);
        const alpha = cronbachAlphaFromMatrix(matrix);

        return {
          item: variable,
          cronbachAlphaIfItemDropped: formatJaspNumber(alpha),
        };
      })
    : statisticalAnalysis.reliability.map((row) => ({
        item: row.scaleName,
        cronbachAlphaIfItemDropped: formatJaspNumber(row.cronbachAlpha),
      }));

  return {
    title: 'Frequentist Individual Item Reliability Statistics',
    description:
      'Tabuľka If item dropped / Cronbachovo alfa po vynechaní položky alebo škály. Slúži na kontrolu vnútornej konzistencie rovnako ako JASP výstup.',
    columns: [
      { key: 'item', label: 'Item' },
      { key: 'cronbachAlphaIfItemDropped', label: "If item dropped Cronbach's α" },
    ],
    rows: outputRows,
  };
}

function buildJaspSpearmanTable(statisticalAnalysis: StatisticalAnalysisResult): AnalysisTable {
  return {
    title: "Spearman's Correlations",
    description:
      'KORELAČNÁ ANALÝZA-SPEARMAN - MALÝ SÚBOR. IBA MEDZI ŠKÁLAMI A SUBŠKÁLAMI.',
    columns: [
      { key: 'variableA', label: '' },
      { key: 'separator', label: '' },
      { key: 'variableB', label: '' },
      { key: 'rho', label: "Spearman's rho" },
      { key: 'significance', label: '' },
      { key: 'pValue', label: 'p' },
      { key: 'fisherZ', label: "Effect size (Fisher's z)" },
      { key: 'standardError', label: 'SE Effect size' },
    ],
    rows: statisticalAnalysis.correlations.spearman.map((row) => ({
      variableA: row.variableA,
      separator: '-',
      variableB: row.variableB,
      rho: formatJaspNumber(row.r),
      significance: row.significance || '',
      pValue: formatJaspPValue(row.pValue),
      fisherZ: formatJaspNumber(row.fisherZ),
      standardError: formatJaspNumber(row.standardError),
    })),
  };
}

function buildJaspOutput(statisticalAnalysis: StatisticalAnalysisResult) {
  const frequencySections = buildJaspFrequencySections(statisticalAnalysis);
  const descriptiveTable = buildJaspDescriptiveTable(statisticalAnalysis);
  const scaleReliabilityTable = buildJaspScaleReliabilityTable(statisticalAnalysis);
  const individualReliabilityTable = buildJaspIndividualReliabilityTable(statisticalAnalysis);
  const spearmanTable = buildJaspSpearmanTable(statisticalAnalysis);

  return {
    title: 'Výsledky analýzy podľa JASP prílohy',
    description:
      'Výstup je štruktúrovaný podľa priloženého dokumentu: frekvenčné tabuľky, deskriptívna štatistika škál/subškál, reliabilita a Spearmanova korelačná analýza.',
    frequencySections,
    descriptiveSection: {
      key: 'descriptive-statistics',
      title: 'DESKRIPTÍVNA ŠTATISTIKA - škály a subškály',
      subtitle: 'Descriptive Statistics',
      tables: descriptiveTable.rows.length > 0 ? [descriptiveTable] : [],
    },
    reliabilitySection: {
      key: 'reliability',
      title: 'RELIABILITA ŠKÁL, SUBŠKÁL',
      subtitle: '1.1 Unidimensional Reliability',
      tables: [scaleReliabilityTable, individualReliabilityTable].filter(
        (table) => table.rows.length > 0,
      ),
    },
    correlationSection: {
      key: 'spearman-correlations',
      title: 'KORELAČNÁ ANALÝZA-SPEARMAN - MALÝ SÚBOR',
      subtitle: 'IBA MEDZI ŠKÁLAMI A SUBŠKÁLAMI',
      tables: spearmanTable.rows.length > 0 ? [spearmanTable] : [],
    },
  };
}


function toFrequencyRowsForExport(table: AnyRecord) {
  const values = Array.isArray(table.values)
    ? table.values
    : Array.isArray(table.rows)
      ? table.rows
      : Array.isArray(table.data)
        ? table.data
        : [];

  return values.map((row: AnyRecord) => ({
    value: cleanText(row.value ?? row.label ?? row.category),
    category: cleanText(row.value ?? row.label ?? row.category),
    frequency: formatJaspCount(row.count ?? row.frequency) ?? 0,
    count: formatJaspCount(row.count ?? row.frequency) ?? 0,
    percent: formatJaspNumber(row.percent),
    percentage: formatJaspNumber(row.percent),
    validPercent: formatJaspNumber(row.validPercent),
    cumulativePercent: formatJaspNumber(row.cumulativePercent),
  }));
}

function normalizeFrequencyTablesForResponse(statisticalAnalysis: StatisticalAnalysisResult) {
  return (statisticalAnalysis.frequencies as unknown as AnyRecord[]).map((table) => {
    const variable = cleanText(table.variable || table.name || table.title || 'Premenná');
    const rows = toFrequencyRowsForExport(table);

    const validTotal = rows.reduce((sum, row) => {
      const count = parseNumericValue(row.count) ?? 0;
      return sum + count;
    }, 0);

    const missing = Math.max(
      0,
      Math.round(parseNumericValue(table.missing ?? table.missingCount ?? 0) ?? 0),
    );

    const total = Math.max(
      validTotal + missing,
      Math.round(parseNumericValue(table.total ?? table.totalCount ?? 0) ?? 0),
    );

    return {
      ...table,
      variable,
      name: variable,
      title: `Frequencies for ${variable}`,
      rows,
      data: rows,
      values: Array.isArray(table.values) ? table.values : rows,
      missing,
      total,
      validTotal,
      columns: [
        { key: 'value', label: variable },
        { key: 'frequency', label: 'Frequency' },
        { key: 'percent', label: 'Percent' },
        { key: 'validPercent', label: 'Valid Percent' },
        { key: 'cumulativePercent', label: 'Cumulative Percent' },
      ],
      description:
        'Frekvenčná tabuľka v štýle JASP s hodnotami Frequency, Percent, Valid Percent a Cumulative Percent.',
    };
  });
}

function flattenJaspTables(jaspOutput: ReturnType<typeof buildJaspOutput>) {
  const tables: AnalysisTable[] = [];

  for (const section of jaspOutput.frequencySections) {
    for (const table of section.tables) {
      tables.push({
        ...table,
        title: `${section.title} – ${table.title}`,
        description: table.description || section.description,
      });
    }
  }

  for (const table of jaspOutput.descriptiveSection.tables) {
    tables.push({
      ...table,
      title: `${jaspOutput.descriptiveSection.title} – ${table.title}`,
    });
  }

  for (const table of jaspOutput.reliabilitySection.tables) {
    tables.push({
      ...table,
      title: `${jaspOutput.reliabilitySection.title} – ${table.title}`,
    });
  }

  for (const table of jaspOutput.correlationSection.tables) {
    tables.push({
      ...table,
      title: `${jaspOutput.correlationSection.title} – ${table.title}`,
    });
  }

  return tables;
}


// ================= RESPONSE HELPERS =================

function buildBaseResponse({
  title,
  summary,
  computed,
  practicalText,
  interpretation,
  extraWarnings = [],
}: {
  title: string;
  summary: string;
  computed: ComputedAnalysis;
  practicalText: string;
  interpretation: string;
  extraWarnings?: string[];
}) {
  const statisticalAnalysis = computed.statisticalAnalysis;
  const normalizedFrequencyTables = normalizeFrequencyTablesForResponse(statisticalAnalysis);
  const jaspOutput = buildJaspOutput(statisticalAnalysis);
  const flattenedJaspTables = flattenJaspTables(jaspOutput);
  const allExcelTables = [
    ...computed.excelTables,
    ...flattenedJaspTables,
  ];
  const jaspFrequencyTables = allExcelTables.filter((table) =>
    table.title.toLowerCase().includes('frekvencie') ||
    table.title.toLowerCase().includes('frekvenč') ||
    table.title.toLowerCase().includes('frequencies'),
  );
  const jaspDescriptiveTable = allExcelTables.find(
    (table) => table.title === 'Deskriptívna štatistika škál a subškál',
  );
  const jaspNormalityTable = allExcelTables.find(
    (table) => table.title === 'Normalita dát',
  );
  const jaspReliabilityTable = allExcelTables.find(
    (table) => table.title === 'Reliabilita škál – Cronbach alfa',
  );
  const jaspSpearmanTable = allExcelTables.find(
    (table) => table.title === 'Spearmanove korelácie medzi škálami a subškálami',
  );

  const jaspTables = {
    frequencies: jaspFrequencyTables,
    descriptives: jaspDescriptiveTable ? [jaspDescriptiveTable] : [],
    normality: jaspNormalityTable ? [jaspNormalityTable] : [],
    reliability: jaspReliabilityTable ? [jaspReliabilityTable] : [],
    correlations: jaspSpearmanTable ? [jaspSpearmanTable] : [],
  };

  const resultSections = [
    {
      key: 'frequencies',
      title: 'Frekvenčné tabuľky položiek',
      description:
        'Rozdelenie odpovedí podľa položiek vrátane percent, validných percent a kumulatívnych percent.',
      tables: jaspTables.frequencies,
    },
    {
      key: 'descriptives',
      title: 'Deskriptívna štatistika škál a subškál',
      description:
        'Tabuľka v štýle JASP so stĺpcami Valid, Missing, Median, Mean, Std. Deviation, Skewness, Kurtosis, Shapiro-Wilk, p, Minimum a Maximum.',
      tables: jaspTables.descriptives,
    },
    {
      key: 'normality',
      title: 'Normalita dát',
      description:
        'Shapiro-Wilkov test a odporúčanie, či použiť parametrické alebo neparametrické postupy.',
      tables: jaspTables.normality,
    },
    {
      key: 'reliability',
      title: 'Reliabilita škál a subškál',
      description: 'Cronbachovo alfa a stručná interpretácia vnútornej konzistencie škál.',
      tables: jaspTables.reliability,
    },
    {
      key: 'correlations',
      title: 'Korelačná analýza – Spearman',
      description:
        'Spearmanove korelácie medzi škálami a subškálami vrátane p-hodnoty, signifikancie a veľkosti efektu.',
      tables: jaspTables.correlations,
    },
  ].filter((section) => section.tables.length > 0);

  return {
    ok: true,
    title,
    summary,
    dataDescription: computed.dataDescription,

    files: computed.extractedFiles.map((fileName) => ({
      fileName,
    })),
    extractedFiles: computed.extractedFiles,

    variables: computed.variables,
    selectedAnalyses: [
      {
        title: 'Frekvenčná analýza',
        description:
          'Pre položky a kategóriové premenné boli vypočítané frekvenčné tabuľky s percentami, validnými percentami a kumulatívnymi percentami.',
      },
      {
        title: 'Deskriptívna štatistika škál a subškál',
        description:
          'Pre škály a subškály boli vypočítané Valid, Missing, Median, Mean, SD, Skewness, Kurtosis, Shapiro-Wilk, p-hodnota, Minimum a Maximum.',
      },
      {
        title: 'Reliabilita a korelačná analýza',
        description:
          'Pre škály boli vypočítané Cronbachovo alfa a korelácie medzi škálami/subškálami.',
      },
    ],

    descriptiveStatistics: computed.descriptiveStatistics,
    frequencies: normalizedFrequencyTables,
    frequencyTables: normalizedFrequencyTables,
    rawFrequencies: statisticalAnalysis.frequencies,

    itemDescriptives: statisticalAnalysis.itemDescriptives,
    scaleScores: statisticalAnalysis.scaleScores,
    scaleDescriptives: statisticalAnalysis.scaleDescriptives,
    normality: statisticalAnalysis.normality,

    pearsonCorrelations: statisticalAnalysis.correlations.pearson,
    spearmanCorrelations: statisticalAnalysis.correlations.spearman,
    recommendedCorrelations: statisticalAnalysis.correlations.recommended,

    reliability: statisticalAnalysis.reliability,

    parametricGroupTests: statisticalAnalysis.groupTests.parametric,
    nonParametricGroupTests: statisticalAnalysis.groupTests.nonParametric,
    recommendedGroupTests: statisticalAnalysis.groupTests.recommended,

    statisticalAnalysis,

    recommendedCharts: computed.recommendedCharts,
    excelTables: allExcelTables,
    tables: allExcelTables,
    analysisTables: allExcelTables,
    resultTables: allExcelTables,
    resultsTables: allExcelTables,
    jaspTables,
    jaspOutput,
    jaspFrequencySections: jaspOutput.frequencySections,
    jaspDescriptiveSection: jaspOutput.descriptiveSection,
    jaspReliabilitySection: jaspOutput.reliabilitySection,
    jaspCorrelationSection: jaspOutput.correlationSection,
    resultSections,
    hypothesisTests: computed.hypothesisTests,
    recommendedTests: [
      ...computed.hypothesisTests,
      ...statisticalAnalysis.groupTests.recommended.map((test) => ({
        title: test.testType,
        description: test.recommendation,
        variables: [test.dependentVariable, test.groupVariable],
        test: test.testType,
        reason: test.significance,
      })),
    ],

    practicalText,
    interpretation,
    warnings: [...computed.warnings, ...extraWarnings],
    fullText: `${practicalText}\n\nInterpretácia:\n${interpretation}`,

    exportReady: {
      word: true,
      pdf: true,
      excel: true,
      tables: allExcelTables,
      charts: computed.recommendedCharts,
    },

    meta: {
      ...statisticalAnalysis.meta,
      filesCount: computed.extractedFiles.length,
      extractedRows: computed.extractedRows,
      extractedColumns: computed.extractedColumns,
      extractedFiles: computed.extractedFiles,
      generatedAt: new Date().toISOString(),
    },
  };
}

function fallbackResult(fullText: string, computed: ComputedAnalysis) {
  return buildBaseResponse({
    title: 'Výsledky analýzy',
    summary:
      'Analýza bola vytvorená, ale odpoveď AI nebola v presnom JSON formáte. Zobrazujú sa vypočítané štatistické tabuľky.',
    computed,
    practicalText: fullText,
    interpretation: fullText,
    extraWarnings: [
      'AI výstup nebol v presnom JSON formáte. Skontroluj prompt alebo model.',
    ],
  });
}

function buildPrompt({
  profile,
  analysisGoal,
  dataDescription,
  filesBlock,
  computed,
}: {
  profile: SavedProfile | null;
  analysisGoal: string;
  dataDescription: string;
  filesBlock: string;
  computed: ComputedAnalysis;
}) {
  return `
Si profesionálny štatistik, metodológ výskumu a konzultant praktickej časti záverečných prác.

Tvojou úlohou je pripraviť presnú analýzu údajov pre praktickú časť práce.

DÔLEŽITÉ:
- Neignoruj vypočítané tabuľky.
- V odpovedi interpretuj najmä škály a subškály, nie iba jednotlivé položky.
- Ak je dostupná normalita, reliabilita, Spearmanova korelácia a testovanie rozdielov, opíš ich.
- Výstup musí byť v slovenčine.
- Výstup musí byť iba validný JSON bez markdown blokov.

PROFIL PRÁCE:
Názov: ${profile?.title || 'nezadané'}
Téma: ${profile?.topic || 'nezadané'}
Typ práce: ${profile?.type || 'nezadané'}
Odbor: ${profile?.field || 'nezadané'}
Cieľ práce: ${profile?.goal || 'nezadané'}
Výskumný problém: ${profile?.problem || 'nezadané'}
Metodológia: ${profile?.methodology || 'nezadané'}
Hypotézy: ${profile?.hypotheses || 'nezadané'}
Výskumné otázky: ${profile?.researchQuestions || 'nezadané'}
Praktická časť: ${profile?.practicalPart || 'nezadané'}
Citačná norma: ${profile?.citation || 'ISO 690'}
Jazyk práce: ${profile?.workLanguage || profile?.language || 'slovenčina'}
Kľúčové slová: ${getKeywords(profile)}

CIEĽ ANALÝZY OD POUŽÍVATEĽA:
${analysisGoal || 'Navrhni a priprav kompletnú analýzu do praktickej časti.'}

VLOŽENÝ TEXT / OPIS DÁT:
${dataDescription || 'Používateľ nevložil textový opis dát.'}

PRILOŽENÉ SÚBORY:
${filesBlock || 'Bez priložených súborov.'}

VYPOČÍTANÁ ANALÝZA Z DÁT:
${JSON.stringify(
  {
    dataDescription: computed.dataDescription,
    variables: computed.variables,
    statisticalAnalysis: computed.statisticalAnalysis,
    warnings: computed.warnings,
  },
  null,
  2,
)}

VRÁŤ PRESNE TÚTO JSON ŠTRUKTÚRU:

{
  "ok": true,
  "title": "Výsledky analýzy",
  "summary": "stručný súhrn analýzy",
  "practicalText": "súvislý text do praktickej časti práce",
  "interpretation": "interpretácia výsledkov",
  "warnings": [],
  "fullText": "kompletný slovný výstup"
}

PRAVIDLÁ:
- practicalText nesmie byť prázdny.
- interpretation nesmie byť prázdna.
- Neprepisuj vypočítané tabuľky, iba ich interpretuj.
- Uveď, že ID stĺpec bol vynechaný z výpočtov, ak bol rozpoznaný.
`.trim();
}



// ================= INTEGRATED EXPORT HELPERS =================
// Export je zámerne riešený v tomto istom route.ts súbore.
// Frontend posiela JSON s action: "export" na /api/analyze-data.
// Takto už nie je potrebné samostatné /api/analyze-data/export/route.ts.

type IntegratedExportFormat = 'word' | 'doc' | 'excel' | 'xls' | 'xlsx' | 'pdf';

type IntegratedExportTable = {
  title: string;
  description?: string;
  rows: Record<string, any>[];
};

function escapeXml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeHtml(value: unknown) {
  return escapeXml(value);
}

function sanitizeFileName(value: unknown) {
  const cleaned = cleanText(value || 'vysledky-analyzy-dat')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);

  return cleaned || 'vysledky-analyzy-dat';
}

function normalizeSheetName(value: unknown, fallback = 'Hárok') {
  const cleaned = cleanText(value || fallback)
    .replace(/[\\/?*\[\]:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 31);

  return cleaned || fallback;
}

function normalizeExportRow(row: unknown): Record<string, any> {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    return { Hodnota: row ?? '' };
  }

  const output: Record<string, any> = {};

  Object.entries(row as Record<string, any>).forEach(([key, value]) => {
    if (!key || key === 'id' || key === '_id') return;

    if (Array.isArray(value)) {
      output[key] = value
        .map((item) =>
          item && typeof item === 'object' ? JSON.stringify(item) : String(item ?? ''),
        )
        .join(', ');
      return;
    }

    if (value && typeof value === 'object') {
      output[key] = JSON.stringify(value);
      return;
    }

    output[key] = value ?? '';
  });

  return output;
}

function normalizeExportRows(rows: unknown): Record<string, any>[] {
  if (!Array.isArray(rows)) return [];
  return rows.map(normalizeExportRow);
}

function extractRowsFromExportTable(table: any): Record<string, any>[] {
  return normalizeExportRows(table?.rows || table?.data || table?.values || table?.items || []);
}

function addIntegratedTable(
  tables: IntegratedExportTable[],
  title: unknown,
  rows: unknown,
  description?: unknown,
) {
  const normalizedRows = normalizeExportRows(rows);

  if (!normalizedRows.length) return;

  tables.push({
    title: cleanText(title || `Tabuľka ${tables.length + 1}`),
    description: cleanText(description || ''),
    rows: normalizedRows,
  });
}

function collectIntegratedExportTables(result: any): IntegratedExportTable[] {
  const tables: IntegratedExportTable[] = [];
  const seen = new Set<string>();

  const pushUnique = (title: unknown, rows: unknown, description?: unknown) => {
    const normalizedRows = normalizeExportRows(rows);
    if (!normalizedRows.length) return;

    const normalizedTitle = cleanText(title || `Tabuľka ${tables.length + 1}`);
    const key = `${normalizedTitle}:${normalizedRows.length}:${Object.keys(normalizedRows[0] || {}).join('|')}`;

    if (seen.has(key)) return;
    seen.add(key);

    tables.push({
      title: normalizedTitle,
      description: cleanText(description || ''),
      rows: normalizedRows,
    });
  };

  const jaspOutput = result?.jaspOutput || {};
  const frequencySections = Array.isArray(result?.jaspFrequencySections)
    ? result.jaspFrequencySections
    : Array.isArray(jaspOutput?.frequencySections)
      ? jaspOutput.frequencySections
      : [];

  frequencySections.forEach((section: any) => {
    const sectionTitle = cleanText(section?.title || 'Frekvenčné tabuľky');
    const sectionTables = Array.isArray(section?.tables) ? section.tables : [];

    sectionTables.forEach((table: any, index: number) => {
      pushUnique(
        `${sectionTitle} – ${table?.title || `Tabuľka ${index + 1}`}`,
        extractRowsFromExportTable(table),
        table?.description || section?.description || section?.subtitle,
      );
    });
  });

  const structuredSections = [
    result?.jaspDescriptiveSection || jaspOutput?.descriptiveSection,
    result?.jaspReliabilitySection || jaspOutput?.reliabilitySection,
    result?.jaspCorrelationSection || jaspOutput?.correlationSection,
  ].filter(Boolean);

  structuredSections.forEach((section: any) => {
    const sectionTitle = cleanText(section?.title || 'JASP sekcia');
    const sectionTables = Array.isArray(section?.tables) ? section.tables : [];

    sectionTables.forEach((table: any, index: number) => {
      pushUnique(
        `${sectionTitle} – ${table?.title || `Tabuľka ${index + 1}`}`,
        extractRowsFromExportTable(table),
        table?.description || section?.description || section?.subtitle,
      );
    });
  });

  const resultSections = Array.isArray(result?.resultSections) ? result.resultSections : [];

  resultSections.forEach((section: any) => {
    const sectionTitle = cleanText(section?.title || 'Sekcia');
    const sectionTables = Array.isArray(section?.tables) ? section.tables : [];

    sectionTables.forEach((table: any, index: number) => {
      pushUnique(
        `${sectionTitle} – ${table?.title || table?.name || `Tabuľka ${index + 1}`}`,
        extractRowsFromExportTable(table),
        table?.description || section?.description,
      );
    });
  });

  const directTables = [
    ...(Array.isArray(result?.excelTables) ? result.excelTables : []),
    ...(Array.isArray(result?.tables) ? result.tables : []),
    ...(Array.isArray(result?.analysisTables) ? result.analysisTables : []),
    ...(Array.isArray(result?.resultTables) ? result.resultTables : []),
  ];

  directTables.forEach((table: any, index: number) => {
    pushUnique(
      table?.title || table?.name || table?.sheetName || `Tabuľka ${index + 1}`,
      extractRowsFromExportTable(table),
      table?.description,
    );
  });

  pushUnique('Premenné', result?.variables || result?.detectedVariables || result?.columns);
  pushUnique('Frekvencie', result?.frequencies || result?.frequencyTables);
  pushUnique('Deskriptívna štatistika škál a subškál', result?.scaleDescriptives);
  pushUnique('Normalita dát', result?.normality);
  pushUnique('Reliabilita', result?.reliability);
  pushUnique('Spearmanove korelácie', result?.spearmanCorrelations);
  pushUnique('Pearsonove korelácie', result?.pearsonCorrelations);
  pushUnique('Odporúčané testy', result?.recommendedTests || result?.hypothesisTests);
  pushUnique('Odporúčané grafy', result?.recommendedCharts);

  if (!tables.length) {
    pushUnique('Súhrn', [
      {
        Názov: result?.title || 'Výsledky analýzy dát',
        Súhrn: result?.summary || '',
        Interpretácia: result?.interpretation || result?.practicalText || result?.fullText || '',
      },
    ]);
  }

  return tables;
}

function getIntegratedColumns(rows: Record<string, any>[]): string[] {
  const priority = [
    'jaspSection',
    'sectionTitle',
    'tableTitle',
    'variable',
    'scaleName',
    'name',
    'value',
    'category',
    'frequency',
    'count',
    'percent',
    'validPercent',
    'cumulativePercent',
    'valid',
    'missing',
    'median',
    'mean',
    'standardDeviation',
    'skewness',
    'standardErrorSkewness',
    'kurtosis',
    'standardErrorKurtosis',
    'shapiroWilk',
    'pValueOfShapiroWilk',
    'minimum',
    'maximum',
    'cronbachAlpha',
    'variableA',
    'variableB',
    'rho',
    'pValue',
    'significance',
    'fisherZ',
    'standardError',
    'interpretation',
  ];

  const all = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const first = priority.filter((key) => all.includes(key));
  const rest = all.filter((key) => !first.includes(key)).sort((a, b) => a.localeCompare(b, 'sk'));

  return [...first, ...rest];
}

function createIntegratedExcelXml(title: string, result: any) {
  const tables = collectIntegratedExportTables(result);
  const generatedAt = new Date().toLocaleString('sk-SK');

  const worksheets = tables.map((table, tableIndex) => {
    const rows = table.rows;
    const columns = getIntegratedColumns(rows);
    const sheetName = normalizeSheetName(table.title, `Hárok ${tableIndex + 1}`);

    const headerRow = columns
      .map((column) => `<Cell><Data ss:Type="String">${escapeXml(column)}</Data></Cell>`)
      .join('');

    const dataRows = rows
      .map((row) => {
        const cells = columns
          .map((column) => {
            const value = row[column];
            const numberValue = typeof value === 'number' ? value : parseNumericValue(value);
            const isNumber = numberValue !== null && value !== '' && value !== null && value !== undefined && !String(value).includes('<');

            return `<Cell><Data ss:Type="${isNumber ? 'Number' : 'String'}">${escapeXml(
              isNumber ? numberValue : value ?? '',
            )}</Data></Cell>`;
          })
          .join('');

        return `<Row>${cells}</Row>`;
      })
      .join('');

    const descriptionRow = table.description
      ? `<Row><Cell ss:MergeAcross="${Math.max(columns.length - 1, 1)}"><Data ss:Type="String">${escapeXml(table.description)}</Data></Cell></Row>`
      : '';

    return `
      <Worksheet ss:Name="${escapeXml(sheetName)}">
        <Table>
          <Row><Cell ss:MergeAcross="${Math.max(columns.length - 1, 1)}"><Data ss:Type="String">${escapeXml(table.title)}</Data></Cell></Row>
          ${descriptionRow}
          <Row>${headerRow}</Row>
          ${dataRows}
        </Table>
      </Worksheet>`;
  }).join('');

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
  <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
    <Title>${escapeXml(title)}</Title>
    <Created>${new Date().toISOString()}</Created>
  </DocumentProperties>
  <Worksheet ss:Name="Súhrn">
    <Table>
      <Row><Cell ss:MergeAcross="4"><Data ss:Type="String">${escapeXml(title)}</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">Vygenerované</Data></Cell><Cell><Data ss:Type="String">${escapeXml(generatedAt)}</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">Počet tabuliek</Data></Cell><Cell><Data ss:Type="Number">${tables.length}</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">Súhrn</Data></Cell><Cell><Data ss:Type="String">${escapeXml(result?.summary || '')}</Data></Cell></Row>
    </Table>
  </Worksheet>
  ${worksheets}
</Workbook>`;
}

function createIntegratedWordHtml(title: string, result: any) {
  const tables = collectIntegratedExportTables(result);
  const generatedAt = new Date().toLocaleString('sk-SK');

  const tableHtml = tables
    .map((table) => {
      const columns = getIntegratedColumns(table.rows);
      const header = columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('');
      const rows = table.rows
        .map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(row[column])}</td>`).join('')}</tr>`)
        .join('');

      return `<h2>${escapeHtml(table.title)}</h2><p>${escapeHtml(table.description || '')}</p><table><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table>`;
    })
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font-family:Arial,sans-serif;color:#111}h1{background:#0f172a;color:white;padding:12px}h2{background:#2563eb;color:white;padding:8px}table{border-collapse:collapse;width:100%;margin-bottom:24px}th,td{border:1px solid #cbd5e1;padding:6px;font-size:12px;vertical-align:top}th{background:#e2e8f0}</style></head><body><h1>${escapeHtml(title)}</h1><p><em>Vygenerované: ${escapeHtml(generatedAt)}</em></p><p>${escapeHtml(result?.summary || '')}</p>${tableHtml}<h2>Interpretácia</h2><p>${escapeHtml(result?.interpretation || result?.practicalText || result?.fullText || '')}</p></body></html>`;
}

function createIntegratedPdfBuffer(title: string, result: any) {
  const text = [
    title,
    '',
    result?.summary || '',
    '',
    result?.interpretation || result?.practicalText || result?.fullText || '',
  ]
    .join('\n')
    .replace(/[()\\]/g, '\\$&')
    .slice(0, 6000);

  const stream = `BT /F1 12 Tf 40 800 Td (${text.replace(/\n/g, ') Tj T* (')}) Tj ET`;
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    `5 0 obj << /Length ${Buffer.byteLength(stream)} >> stream\n${stream}\nendstream endobj`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  objects.forEach((object) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${object}\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'binary');
}

function integratedFileResponse(params: {
  body: string | Buffer;
  fileName: string;
  contentType: string;
}) {
  const responseBody =
    typeof params.body === 'string'
      ? params.body
      : new Uint8Array(params.body);

  return new NextResponse(responseBody, {
    status: 200,
    headers: {
      'Content-Type': params.contentType,
      'Content-Disposition': `attachment; filename="${params.fileName}"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

async function handleIntegratedExport(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as any;
    const result = body?.result;

    if (!result || typeof result !== 'object') {
      return NextResponse.json(
        {
          ok: false,
          error: 'MISSING_RESULT',
          message: 'Chýba objekt result s výsledkami analýzy.',
        },
        { status: 400 },
      );
    }

    const requestedFormat = cleanText(body.format || body.exportFormat || 'excel').toLowerCase() as IntegratedExportFormat;
    const title = cleanText(body.title || result.title || 'Výsledky analýzy dát');
    const baseFileName = sanitizeFileName(title);

    if (requestedFormat === 'word' || requestedFormat === 'doc') {
      return integratedFileResponse({
        body: createIntegratedWordHtml(title, result),
        fileName: `${baseFileName}.doc`,
        contentType: 'application/msword; charset=utf-8',
      });
    }

    if (requestedFormat === 'pdf') {
      return integratedFileResponse({
        body: createIntegratedPdfBuffer(title, result),
        fileName: `${baseFileName}.pdf`,
        contentType: 'application/pdf',
      });
    }

    return integratedFileResponse({
      body: createIntegratedExcelXml(title, result),
      fileName: `${baseFileName}.xls`,
      contentType: 'application/vnd.ms-excel; charset=utf-8',
    });
  } catch (error) {
    console.error('ANALYZE_DATA_INTEGRATED_EXPORT_ERROR:', error);

    return NextResponse.json(
      {
        ok: false,
        error: 'EXPORT_FAILED',
        message:
          error instanceof Error
            ? error.message
            : 'Nepodarilo sa vytvoriť export analýzy.',
      },
      { status: 500 },
    );
  }
}

// ================= ROUTE =================

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      return handleIntegratedExport(req);
    }

    const formData = await req.formData();

    const analysisGoal = cleanText(formData.get('analysisGoal'));
    const dataDescription = cleanText(formData.get('dataDescription'));
    const profile = safeJsonParse<SavedProfile>(formData.get('activeProfile'));

    const requestedIdColumn = cleanText(formData.get('idColumn')) || undefined;
    const alpha = normalizeAlpha(parseNumberFromFormData(formData.get('alpha')));
    const groupColumns = parseStringArrayFromFormData(formData.get('groupColumns'));

    const scales =
      safeJsonParse<ScaleDefinition[]>(formData.get('scales')) || undefined;

    const combinedScales =
      safeJsonParse<CombinedScaleDefinition[]>(formData.get('combinedScales')) ||
      undefined;

    const files = [
      ...formData.getAll('files'),
      ...formData.getAll('file'),
    ].filter((item): item is File => item instanceof File);

    const fileTexts: string[] = [];
    const extractedRows: DataRow[] = [];

    for (const file of files) {
      const text = await readFileAsText(file);
      const rows = await extractRowsFromFile(file);

      extractedRows.push(...rows);

      fileTexts.push(`
SÚBOR: ${file.name}
Typ: ${file.type || 'nezadané'}
Veľkosť: ${file.size}
Načítané riadky: ${rows.length}
Obsah:
${text || 'Text sa nepodarilo načítať.'}
`);
    }

    const filesBlock = fileTexts.join('\n\n------------------------------\n\n');

    if (!analysisGoal && !dataDescription && files.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Chýbajú dáta na analýzu. Vlož text, cieľ analýzy alebo prilož Excel/CSV súbor.',
        },
        { status: 400 },
      );
    }

    const statisticalRows = toStatisticalRows(extractedRows);
    const effectiveIdColumn = resolveEffectiveIdColumn(extractedRows, requestedIdColumn);

    const statisticalAnalysis = runFullStatisticalAnalysis(statisticalRows, {
      idColumn: effectiveIdColumn,
      scales,
      combinedScales,
      groupColumns,
      alpha,
      includeItemDescriptives: true,
      includeFrequencies: true,
      autoDetectScales: true,
      fallbackToNumericVariables: true,
    });

    const computed = buildComputedAnalysis({
      rows: extractedRows,
      files,
      dataDescription,
      profile,
      statisticalAnalysis,
    });

    if (effectiveIdColumn) {
      computed.warnings.push(
        `Stĺpec „${effectiveIdColumn}“ bol rozpoznaný ako ID a v štatistických výpočtoch sa nepoužíva ako analyzovaná premenná.`,
      );
    }

    const defaultPracticalText =
      'Na základe analyzovaných údajov bola pripravená štruktúra praktickej časti. V praktickej časti je vhodné najskôr opísať výskumnú vzorku, následne uviesť frekvenčné tabuľky pre dotazníkové položky, potom deskriptívnu štatistiku škál a subškál, kontrolu normality, reliabilitu škál a korelačnú alebo skupinovú analýzu podľa výskumných otázok. ID stĺpec sa nepoužíva v štatistických výpočtoch, ale slúži iba na identifikáciu respondentov a určenie veľkosti výskumnej vzorky.';

    const defaultInterpretation =
      'Výsledky je potrebné interpretovať podľa vypočítaných tabuliek. Frekvenčné tabuľky ukazujú rozdelenie odpovedí respondentov. Deskriptívna štatistika škál a subškál uvádza počet platných odpovedí, chýbajúce hodnoty, medián, priemer, smerodajnú odchýlku, šikmosť, špicatosť, orientačný test normality, minimum a maximum. Reliabilita pomocou Cronbachovho alfa hodnotí vnútornú konzistenciu škál. Spearmanove korelácie sú vhodné najmä pri menšom súbore, ordinálnych dátach alebo pri nenormálnom rozdelení škál.';

    const prompt = buildPrompt({
      profile,
      analysisGoal,
      dataDescription,
      filesBlock,
      computed,
    });

    const aiResult = await runAiInterpretation(prompt);
    const raw = aiResult.text || '';

if (!raw.trim()) {
      return NextResponse.json({
        ...buildBaseResponse({
          title: 'Výsledky analýzy',
          summary:
            'Analýza bola vypočítaná zo súboru. AI interpretácia nebola doplnená, pretože žiadny AI provider nevrátil platný výstup.',
          computed,
          practicalText: defaultPracticalText,
          interpretation: defaultInterpretation,
          extraWarnings: [
            aiResult.error ||
              'Claude/OpenAI/Gemini/Grok/Mistral/Groq/Cohere/Perplexity nevrátili použiteľnú odpoveď.',
          ],
        }),
        aiAgent: aiResult,
        claudeAgent: aiResult.provider === 'anthropic' ? aiResult : null,
      });
    }

    const jsonText = extractJsonFromText(raw);

    try {
      const parsed = JSON.parse(jsonText);

      const practicalText =
        cleanText(parsed.practicalText) || defaultPracticalText;

      const interpretation =
        cleanText(parsed.interpretation) || defaultInterpretation;

      return NextResponse.json({
        ...buildBaseResponse({
          title: parsed.title || 'Výsledky analýzy',
          summary:
            parsed.summary ||
            'Analýza obsahuje frekvenčné tabuľky, deskriptívnu štatistiku škál a subškál, normalitu, reliabilitu, korelácie a odporúčané testy.',
          computed,
          practicalText,
          interpretation,
          extraWarnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
        }),
        aiAgent: aiResult,
        claudeAgent: aiResult.provider === 'anthropic' ? aiResult : null,
        fullText:
          cleanText(parsed.fullText) ||
          `${practicalText}\n\nInterpretácia:\n${interpretation}`,
      });
    } catch {
      return NextResponse.json({
        ...fallbackResult(raw, computed),
        aiAgent: aiResult,
        claudeAgent: aiResult.provider === 'anthropic' ? aiResult : null,
      });
    }
  } catch (error) {
    console.error('ANALYZE_DATA_ERROR:', error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Nepodarilo sa vykonať analýzu dát.',
      },
      { status: 500 },
    );
  }
}


export async function OPTIONS() {
  return NextResponse.json(
    { ok: true },
    {
      headers: {
        Allow: 'GET,POST,OPTIONS',
      },
    },
  );
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: '/api/analyze-data',
    message: 'Analyze-data backend beží správne. Analýza aj export sú v jednom route.ts súbore.',
    export: {
      enabled: true,
      url: '/api/analyze-data',
      method: 'POST',
      body: { action: 'export', format: 'excel | word | pdf', result: 'AnalysisResult' },
    },
    generatedAt: new Date().toISOString(),
  });
}
