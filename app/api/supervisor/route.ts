import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 110_000,
  maxRetries: 2,
});

const MODEL =
  process.env.OPENAI_SUPERVISOR_MODEL ||
  process.env.OPENAI_MODEL ||
  'gpt-4.1-mini';

const EDITOR_TEMPERATURE = 0.1;
const RETRY_TEMPERATURE = 0.05;
const MAX_OUTPUT_TOKENS_PER_CHUNK = 10_000;

const MAX_STUDENT_TEXT_CHARS = 260_000;
const MAX_FEEDBACK_CHARS = 90_000;
const MAX_TEXT_CHARS_PER_FILE = 260_000;
const MAX_TOTAL_SOURCE_ATTACHMENT_CHARS = 360_000;
const MAX_TOTAL_FEEDBACK_ATTACHMENT_CHARS = 140_000;
const MAX_CLIENT_EXTRACTED_CHARS = 240_000;
const MAX_CLIENT_FEEDBACK_EXTRACTED_CHARS = 100_000;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const LARGE_FILE_LIMIT_BYTES = 12 * 1024 * 1024;

const REVISION_CHUNK_TARGET_CHARS = 20_000;
const REVISION_CHUNK_HARD_MAX_CHARS = 24_000;
const REVISION_CONTEXT_CHARS = 1_200;
const MIN_ACCEPTABLE_REWRITE_RATIO = 0.58;
const MAX_PARALLEL_REVISIONS = 2;

const REVISED_TEXT_START = '<<<REVISED_TEXT>>>';
const REVISED_TEXT_END = '<<<END_REVISED_TEXT>>>';
const CHANGE_LOG_START = '<<<CHANGE_LOG>>>';
const CHANGE_LOG_END = '<<<END_CHANGE_LOG>>>';

type SavedProfile = {
  id?: string;
  title?: string;
  topic?: string;
  type?: string;
  level?: string;
  field?: string;
  expertise?: string;
  workExpertise?: string;
  specializationLevel?: string;
  supervisor?: string;
  citation?: string;
  language?: string;
  interfaceLanguage?: string;
  workLanguage?: string;
  annotation?: string;
  goal?: string;
  problem?: string;
  researchProblem?: string;
  methodology?: string;
  hypotheses?: string;
  researchQuestions?: string;
  practicalPart?: string;
  scientificContribution?: string;
  contribution?: string;
  businessProblem?: string;
  businessGoal?: string;
  implementation?: string;
  caseStudy?: string;
  reflection?: string;
  sourcesRequirement?: string;
  keywords?: string[];
  keywordsList?: string[];
  schema?: {
    label?: string;
    description?: string;
    structure?: string | string[];
    requiredSections?: string | string[];
    recommendedLength?: string;
    aiInstruction?: string;
  };
};

type ExtractedAttachment = {
  name: string;
  size: number;
  type: string;
  text: string;
  extractionAvailable: boolean;
  truncated: boolean;
  warning?: string;
  imageDataUrl?: string;
};

type SupervisorRequestPayload = {
  studentText: string;
  supervisorFeedback: string;
  clientExtractedText: string;
  clientFeedbackExtractedText: string;
  attachmentsContext: string;
  feedbackAttachmentsContext: string;
  workLanguage: string;
  citationStyle: string;
  profile: SavedProfile | null;
  sourceFiles: File[];
  feedbackFiles: File[];
};

type RevisionChunk = {
  index: number;
  text: string;
  previousContext: string;
  nextContext: string;
};

type ChunkRevision = {
  revisedText: string;
  changeLog: string;
  retried: boolean;
  lengthRatio: number;
};

type SupervisorResponse = {
  ok: boolean;
  revisedDocument?: string;
  rewrittenText?: string;
  changeLog?: string;

  // Kompatibilné aliasy pre existujúci frontend.
  output?: string;
  result?: string;
  message?: string;
  text?: string;
  answer?: string;

  warning?: string;
  error?: string;
  attachmentProcessing?: {
    receivedFiles: number;
    successfullyReadFiles: number;
    extractedCharacters: number;
    sourceFiles: number;
    feedbackFiles: number;
  };
  meta?: {
    model: string;
    temperature: number;
    editorMode: 'feedback-revision';
    sourceTextChars: number;
    feedbackChars: number;
    sourceAttachmentTextChars: number;
    feedbackAttachmentTextChars: number;
    receivedFiles: number;
    successfullyReadFiles: number;
    extractedCharacters: number;
    imageFiles: number;
    chunkCount: number;
    retriedChunks: number;
    minimumRewriteRatio: number;
  };
};

function cleanInvisibleCharacters(value: unknown): string {
  return String(value ?? '')
    .replace(/\u0000/g, '')
    .replace(/\uFEFF/g, '')
    .replace(/\u200B/g, '')
    .replace(/\u200C/g, '')
    .replace(/\u200D/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{5,}/g, '\n\n\n\n')
    .trim();
}

function stripMarkdownFence(value: string): string {
  return cleanInvisibleCharacters(value)
    .replace(/^```(?:markdown|md|text|json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

function cleanEditorOutput(value: string): string {
  return stripMarkdownFence(value)
    .replace(
      /^\s*(?:tu\s+je|nižšie\s+je|zde\s+je|here\s+is|hier\s+ist|oto\s+jest)\s+(?:upravený|prepracovaný|prepísaný|finalizovaný|rewritten|revised|überarbeitete|przeredagowany)[^:\n]*:?\s*/i,
      '',
    )
    .replace(/^\s*AI\s+(?:Konzultant|Consultant|konzulens)\s*[-–—:]*\s*/i, '')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string' || !value.trim()) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function assertWithinLimit(value: string, maxChars: number, label: string): string {
  const clean = cleanInvisibleCharacters(value);
  if (clean.length <= maxChars) return clean;

  throw new Error(
    `${label} je príliš dlhý na bezpečné úplné spracovanie (${clean.length} znakov; limit ${maxChars}). ` +
      'Vstup sa zámerne neskrátil, aby sa nestratila časť práce. Rozdeľte dokument na menšie časti alebo zvýšte serverový limit.',
  );
}

function validateClientFallback(value: string, maxChars: number, label: string): string {
  const clean = cleanInvisibleCharacters(value);
  if (clean.length <= maxChars) return clean;
  throw new Error(
    `${label} prekračuje limit ${maxChars} znakov. Klientsky fallback sa zámerne neskrátil, aby AI školiteľ nespracoval iba časť dokumentu.`,
  );
}

function getFileExtension(fileName: string): string {
  const index = fileName.lastIndexOf('.');
  return index === -1 ? '' : fileName.slice(index).toLowerCase();
}

function isImageFile(fileName: string, fileType: string): boolean {
  const name = fileName.toLowerCase();
  const type = fileType.toLowerCase();

  return (
    type.startsWith('image/') ||
    name.endsWith('.png') ||
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg') ||
    name.endsWith('.webp') ||
    name.endsWith('.gif')
  );
}

function isTextLikeFile(fileName: string, fileType: string): boolean {
  const name = fileName.toLowerCase();
  const type = fileType.toLowerCase();

  return (
    type.startsWith('text/') ||
    type.includes('csv') ||
    type.includes('json') ||
    name.endsWith('.txt') ||
    name.endsWith('.md') ||
    name.endsWith('.csv') ||
    name.endsWith('.json') ||
    name.endsWith('.rtf')
  );
}

function stripRtf(value: string): string {
  return cleanInvisibleCharacters(
    value
      .replace(/\\par[d]?/g, '\n')
      .replace(/\\line/g, '\n')
      .replace(/\\'[0-9a-fA-F]{2}/g, ' ')
      .replace(/\\[a-zA-Z]+-?\d*\s?/g, '')
      .replace(/[{}]/g, ' '),
  );
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const mammothModule: any = await import('mammoth');
  const mammoth = mammothModule?.default || mammothModule;
  const result = await mammoth.extractRawText({ buffer });
  return cleanInvisibleCharacters(result?.value || '');
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfParseModule: any = await import('pdf-parse');
  const parser =
    typeof pdfParseModule?.default === 'function'
      ? pdfParseModule.default
      : typeof pdfParseModule === 'function'
        ? pdfParseModule
        : pdfParseModule?.parse;

  if (typeof parser !== 'function') {
    throw new Error('PDF parser sa nepodarilo inicializovať.');
  }

  const result = await parser(buffer);
  return cleanInvisibleCharacters(result?.text || '');
}

async function extractExcelText(buffer: Buffer): Promise<string> {
  const xlsxModule: any = await import('xlsx');
  const xlsx = xlsxModule?.default || xlsxModule;
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const parts: string[] = [];

  for (const sheetName of workbook.SheetNames || []) {
    const sheet = workbook.Sheets[sheetName];
    const csv = xlsx.utils.sheet_to_csv(sheet);
    if (csv.trim()) parts.push(`Hárok: ${sheetName}\n${csv}`);
  }

  return cleanInvisibleCharacters(parts.join('\n\n'));
}

function isUploadedFile(value: FormDataEntryValue): value is File {
  return (
    typeof value !== 'string' &&
    typeof (value as File)?.arrayBuffer === 'function'
  );
}

function uniqueFiles(values: FormDataEntryValue[]): File[] {
  const seen = new Set<string>();
  const result: File[] = [];

  for (const value of values) {
    if (!isUploadedFile(value)) continue;
    const key = `${value.name}|${value.size}|${value.type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }

  return result;
}

async function extractUploadedFile(file: File): Promise<ExtractedAttachment> {
  const name = file.name || 'bez-nazvu';
  const type = file.type || 'application/octet-stream';
  const size = file.size || 0;
  const extension = getFileExtension(name);

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    if (isImageFile(name, type)) {
      if (size > MAX_IMAGE_BYTES) {
        return {
          name,
          size,
          type,
          text: '',
          extractionAvailable: false,
          truncated: false,
          warning: `Obrázok ${name} je príliš veľký na priame vizuálne spracovanie.`,
        };
      }

      const mime = type.startsWith('image/') ? type : 'image/jpeg';
      return {
        name,
        size,
        type: mime,
        text: '',
        extractionAvailable: true,
        truncated: false,
        imageDataUrl: `data:${mime};base64,${buffer.toString('base64')}`,
      };
    }

    let extractedText = '';

    if (isTextLikeFile(name, type)) {
      const decoded = buffer.toString('utf-8');
      extractedText =
        extension === '.rtf' ? stripRtf(decoded) : cleanInvisibleCharacters(decoded);
    } else if (
      extension === '.docx' ||
      type.includes('wordprocessingml.document')
    ) {
      extractedText = await extractDocxText(buffer);
    } else if (extension === '.pdf' || type.includes('pdf')) {
      extractedText = await extractPdfText(buffer);
    } else if (
      extension === '.xlsx' ||
      extension === '.xls' ||
      type.includes('spreadsheet') ||
      type.includes('excel')
    ) {
      extractedText = await extractExcelText(buffer);
    }

    if (!extractedText) {
      return {
        name,
        size,
        type,
        text: '',
        extractionAvailable: false,
        truncated: false,
        warning:
          extension === '.doc'
            ? `Starý formát DOC (${name}) sa na serveri priamo neextrahuje. Uložte ho ako DOCX alebo PDF.`
            : `Text zo súboru ${name} sa nepodarilo automaticky extrahovať.`,
      };
    }

    if (extractedText.length > MAX_TEXT_CHARS_PER_FILE) {
      return {
        name,
        size,
        type,
        text: '',
        extractionAvailable: false,
        truncated: true,
        warning:
          `Súbor ${name} má ${extractedText.length} znakov a prekračuje limit ${MAX_TEXT_CHARS_PER_FILE}. ` +
          'Súbor nebol skrátený, pretože AI školiteľ musí zachovať kompletný dokument.',
      };
    }

    return {
      name,
      size,
      type,
      text: extractedText,
      extractionAvailable: true,
      truncated: false,
      warning:
        size > LARGE_FILE_LIMIT_BYTES
          ? `Súbor ${name} je veľký; server ho prečítal celý, ale spracovanie môže trvať dlhšie.`
          : undefined,
    };
  } catch (error) {
    return {
      name,
      size,
      type,
      text: '',
      extractionAvailable: false,
      truncated: false,
      warning:
        error instanceof Error
          ? `Súbor ${name} sa nepodarilo prečítať: ${error.message}`
          : `Súbor ${name} sa nepodarilo prečítať.`,
    };
  }
}

function getStringFromFormData(formData: FormData, names: string[]): string {
  for (const name of names) {
    const value = formData.get(name);
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function getStringFromJson(json: Record<string, unknown>, names: string[]): string {
  for (const name of names) {
    const value = json[name];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function normalizeProfile(value: unknown): SavedProfile | null {
  if (!value) return null;
  if (typeof value === 'string') {
    const parsed = safeJsonParse<SavedProfile | null>(value, null);
    return parsed && typeof parsed === 'object' ? parsed : null;
  }
  return typeof value === 'object' ? (value as SavedProfile) : null;
}

async function parseRequest(request: NextRequest): Promise<SupervisorRequestPayload> {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();

    const explicitSourceFiles = uniqueFiles([
      ...formData.getAll('sourceFiles'),
      ...formData.getAll('sourceFile'),
      ...formData.getAll('documentFiles'),
      ...formData.getAll('thesisFiles'),
    ]);

    const explicitFeedbackFiles = uniqueFiles([
      ...formData.getAll('feedbackFiles'),
      ...formData.getAll('feedbackFile'),
      ...formData.getAll('commentFiles'),
      ...formData.getAll('reviewFiles'),
    ]);

    const legacyFiles = uniqueFiles([
      ...formData.getAll('files'),
      ...formData.getAll('file'),
      ...formData.getAll('attachments'),
      ...formData.getAll('attachment'),
    ]);

    return {
      studentText: getStringFromFormData(formData, [
        'studentText',
        'input',
        'text',
        'message',
      ]),
      supervisorFeedback: getStringFromFormData(formData, [
        'supervisorFeedback',
        'secondaryInput',
        'feedback',
      ]),
      clientExtractedText: getStringFromFormData(formData, [
        'clientExtractedText',
        'extractedText',
        'attachmentText',
        'attachmentTexts',
      ]),
      clientFeedbackExtractedText: getStringFromFormData(formData, [
        'clientFeedbackExtractedText',
        'feedbackExtractedText',
      ]),
      attachmentsContext: getStringFromFormData(formData, [
        'attachmentsContext',
        'attachmentContext',
      ]),
      feedbackAttachmentsContext: getStringFromFormData(formData, [
        'feedbackAttachmentsContext',
        'feedbackAttachmentContext',
      ]),
      workLanguage: getStringFromFormData(formData, [
        'workLanguage',
        'outputLanguage',
        'language',
      ]),
      citationStyle: getStringFromFormData(formData, ['citationStyle', 'citation']),
      profile: normalizeProfile(
        formData.get('profile') ||
          formData.get('activeProfile') ||
          formData.get('profileSnapshot'),
      ),
      sourceFiles: explicitSourceFiles.length ? explicitSourceFiles : legacyFiles,
      feedbackFiles: explicitFeedbackFiles,
    };
  }

  const json = (await request.json()) as Record<string, unknown>;

  return {
    studentText: getStringFromJson(json, ['studentText', 'input', 'text', 'message']),
    supervisorFeedback: getStringFromJson(json, [
      'supervisorFeedback',
      'secondaryInput',
      'feedback',
    ]),
    clientExtractedText: getStringFromJson(json, [
      'clientExtractedText',
      'extractedText',
      'attachmentText',
      'attachmentTexts',
    ]),
    clientFeedbackExtractedText: getStringFromJson(json, [
      'clientFeedbackExtractedText',
      'feedbackExtractedText',
    ]),
    attachmentsContext: getStringFromJson(json, [
      'attachmentsContext',
      'attachmentContext',
    ]),
    feedbackAttachmentsContext: getStringFromJson(json, [
      'feedbackAttachmentsContext',
      'feedbackAttachmentContext',
    ]),
    workLanguage: getStringFromJson(json, [
      'workLanguage',
      'outputLanguage',
      'language',
    ]),
    citationStyle: getStringFromJson(json, ['citationStyle', 'citation']),
    profile: normalizeProfile(json.profile || json.activeProfile || json.profileSnapshot),
    sourceFiles: [],
    feedbackFiles: [],
  };
}

function normalizeLanguage(value: string, profile: SavedProfile | null): string {
  const raw = cleanInvisibleCharacters(
    value || profile?.workLanguage || profile?.language || 'sk',
  ).toLowerCase();

  const languageMap: Record<string, string> = {
    sk: 'slovenčina',
    'sk-sk': 'slovenčina',
    slovak: 'slovenčina',
    slovenčina: 'slovenčina',
    cs: 'čeština',
    cz: 'čeština',
    'cs-cz': 'čeština',
    czech: 'čeština',
    en: 'angličtina',
    'en-us': 'angličtina',
    'en-gb': 'angličtina',
    english: 'angličtina',
    de: 'nemčina',
    'de-de': 'nemčina',
    german: 'nemčina',
    pl: 'poľština',
    'pl-pl': 'poľština',
    polish: 'poľština',
    hu: 'maďarčina',
    'hu-hu': 'maďarčina',
    hungarian: 'maďarčina',
  };

  return languageMap[raw] || value || profile?.workLanguage || profile?.language || 'slovenčina';
}

function normalizeCitationStyle(value: string, profile: SavedProfile | null): string {
  return cleanInvisibleCharacters(
    value || profile?.citation || 'zachovaj citačný štýl pôvodného textu',
  );
}

function stringifyProfileValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean).join(', ');
  }
  return cleanInvisibleCharacters(value);
}

function buildProfileBlock(profile: SavedProfile | null): string {
  if (!profile) return 'Aktívny profil práce nebol dodaný.';

  const fields: Array<[string, unknown]> = [
    ['Názov práce', profile.title],
    ['Téma', profile.topic],
    ['Typ práce', profile.type || profile.schema?.label],
    ['Odbor', profile.field],
    [
      'Odborná úroveň',
      profile.expertise || profile.workExpertise || profile.specializationLevel,
    ],
    ['Anotácia', profile.annotation],
    ['Cieľ práce', profile.goal || profile.businessGoal],
    ['Výskumný problém', profile.problem || profile.researchProblem || profile.businessProblem],
    ['Metodológia', profile.methodology],
    ['Hypotézy', profile.hypotheses],
    ['Výskumné otázky', profile.researchQuestions],
    ['Praktická časť', profile.practicalPart || profile.implementation || profile.caseStudy],
    ['Prínos', profile.scientificContribution || profile.contribution],
    ['Reflexia', profile.reflection],
    ['Kľúčové slová', profile.keywords || profile.keywordsList],
  ];

  const lines = fields
    .map(([label, value]) => [label, stringifyProfileValue(value)] as const)
    .filter(([, value]) => Boolean(value))
    .map(([label, value]) => `- ${label}: ${value}`);

  return lines.length ? lines.join('\n') : 'Aktívny profil neobsahuje použiteľné údaje.';
}

function buildAttachmentTextBlock(
  attachments: ExtractedAttachment[],
  clientExtractedText: string,
  attachmentsContext: string,
  maxChars: number,
  blockLabel: string,
): { text: string; chars: number } {
  const parts: string[] = [];
  let usedChars = 0;

  for (const attachment of attachments) {
    if (!attachment.text.trim()) continue;
    const block = attachment.text.trim();

    if (usedChars + block.length > maxChars) {
      throw new Error(
        `${blockLabel} prekračujú limit ${maxChars} znakov. Obsah sa zámerne neskrátil, aby sa nestratili časti dokumentu.`,
      );
    }

    parts.push(block);
    usedChars += block.length;
  }

  const clientText = validateClientFallback(
    clientExtractedText,
    maxChars,
    `${blockLabel} – klientsky extrahovaný text`,
  );

  if (clientText && usedChars < maxChars) {
    const serverText = parts.join('\n\n').toLowerCase();
    const fingerprint = clientText.slice(0, 900).toLowerCase();
    const seemsDuplicate = fingerprint.length > 200 && serverText.includes(fingerprint);

    if (!seemsDuplicate) {
      if (usedChars + clientText.length > maxChars) {
        throw new Error(`${blockLabel} prekračujú limit ${maxChars} znakov.`);
      }
      parts.push(clientText);
      usedChars += clientText.length;
    }
  }

  if (!parts.length && attachmentsContext.trim()) {
    const context = cleanInvisibleCharacters(attachmentsContext);
    const accepted = context.slice(0, maxChars);
    parts.push(accepted);
    usedChars += accepted.length;
  }

  return {
    text: parts.join('\n\n'),
    chars: usedChars,
  };
}

function joinDistinctText(parts: string[]): string {
  const accepted: string[] = [];

  for (const rawPart of parts) {
    const part = cleanInvisibleCharacters(rawPart);
    if (!part) continue;

    const fingerprint = part.slice(0, 1_000).toLowerCase();
    const duplicate = accepted.some((existing) =>
      fingerprint.length > 250
        ? existing.toLowerCase().includes(fingerprint)
        : existing === part,
    );

    if (!duplicate) accepted.push(part);
  }

  return accepted.join('\n\n');
}

function splitLongPiece(piece: string, hardMax: number): string[] {
  const clean = piece.trim();
  if (!clean) return [];
  if (clean.length <= hardMax) return [clean];

  const lines = clean.split('\n');
  const chunks: string[] = [];
  let current = '';

  const pushCurrent = () => {
    if (current.trim()) chunks.push(current.trim());
    current = '';
  };

  for (const line of lines) {
    if (line.length > hardMax) {
      pushCurrent();
      let cursor = 0;
      while (cursor < line.length) {
        let end = Math.min(cursor + hardMax, line.length);
        if (end < line.length) {
          const sentenceBoundary = Math.max(
            line.lastIndexOf('. ', end),
            line.lastIndexOf('! ', end),
            line.lastIndexOf('? ', end),
            line.lastIndexOf('; ', end),
          );
          if (sentenceBoundary > cursor + Math.floor(hardMax * 0.55)) {
            end = sentenceBoundary + 1;
          }
        }
        chunks.push(line.slice(cursor, end).trim());
        cursor = end;
      }
      continue;
    }

    const candidate = current ? `${current}\n${line}` : line;
    if (candidate.length > hardMax) {
      pushCurrent();
      current = line;
    } else {
      current = candidate;
    }
  }

  pushCurrent();
  return chunks;
}

function splitIntoRevisionChunks(text: string): RevisionChunk[] {
  const clean = cleanInvisibleCharacters(text);
  if (!clean) return [];

  const rawPieces = clean.split(/\n{2,}/g);
  const pieces = rawPieces.flatMap((piece) =>
    splitLongPiece(piece, REVISION_CHUNK_HARD_MAX_CHARS),
  );

  const chunkTexts: string[] = [];
  let current = '';

  for (const piece of pieces) {
    const candidate = current ? `${current}\n\n${piece}` : piece;

    if (
      current &&
      candidate.length > REVISION_CHUNK_TARGET_CHARS
    ) {
      chunkTexts.push(current.trim());
      current = piece;
    } else {
      current = candidate;
    }
  }

  if (current.trim()) chunkTexts.push(current.trim());

  return chunkTexts.map((chunkText, index) => ({
    index,
    text: chunkText,
    previousContext:
      index > 0
        ? chunkTexts[index - 1].slice(-REVISION_CONTEXT_CHARS)
        : '',
    nextContext:
      index < chunkTexts.length - 1
        ? chunkTexts[index + 1].slice(0, REVISION_CONTEXT_CHARS)
        : '',
  }));
}

function buildSystemPrompt(params: {
  outputLanguage: string;
  citationStyle: string;
}): string {
  return `
Si AI školiteľ platformy Zedpera v režime PRESNÁ REVÍZIA PODĽA PRIPOMIENOK.
Si akademický editor, ktorý upravuje existujúcu záverečnú prácu, nie sumarizátor.

HLAVNÝ CIEĽ:
Zapracovať pripomienky školiteľa/oponenta cielene a kontextovo do pôvodného dokumentu tak, aby sa zachovala pôvodná štruktúra, odborný význam, terminológia, citácie, tabuľky, číslovanie a rozsah obsahu všade, kde pripomienky nevyžadujú zmenu.

ABSOLÚTNE PRAVIDLÁ:
- NESKRACUJ dokument na súhrn, abstrakt, osnovu ani krátku prepracovanú verziu.
- NEVYNECHÁVAJ odseky, podkapitoly, tabuľky, názvy tabuliek/grafov, citácie, výsledky alebo metodické informácie iba preto, aby bol text kratší.
- NEPREPISUJ časti, ktorých sa pripomienka netýka, viac než je potrebné pre akademický štýl, konzistentnosť alebo nadväznosť.
- Každý spracovaný úsek musí po revízii reprezentovať celý obsah vstupného úseku, nie jeho zhrnutie.
- Zachovaj poradie kapitol a podkapitol. Číslovanie oprav iba vtedy, ak je chyba jednoznačná z textu alebo pripomienky.
- Zachovaj existujúce fakty, čísla, štatistiky, názvy nástrojov, výsledky a citácie. Ak sú rozporné, nevymýšľaj správnu hodnotu. Oprav iba to, čo sa dá bezpečne určiť z dodaného dokumentu.
- Nevymýšľaj nové zdroje, DOI, URL, roky, bibliografické údaje, etické schválenie, termín zberu, miesto zberu, typ výberu participantov, validovanú jazykovú verziu nástroja ani iný chýbajúci fakt.
- Ak pripomienka vyžaduje fakt, ktorý v podkladoch nie je, vlož na presné miesto neutrálne označenie „Údaj je potrebné doplniť: …“ a uveď čo chýba.
- Pri citlivej téme sebapoškodzovania používaj vecný, neutrálny a nehodnotiaci jazyk.
- Pri reliabilite alebo metodologickom probléme vykonaj odbornú interpretáciu iba z hodnôt, ktoré sú v texte.
- Formuláciu „hypotézu potvrdzujeme/nepotvrdzujeme“ nahraď metodologicky primeraným vyjadrením o podpore alebo nepodpore hypotézy výsledkami.
- Existujúce citácie zachovaj. Citačný štýl: ${params.citationStyle}.
- Jazyk výsledku: ${params.outputLanguage}.

VÝSTUP MÁ VŽDY DVE ČASTI V PRESNOM FORMÁTE:
${REVISED_TEXT_START}
kompletný revidovaný text aktuálneho úseku
${REVISED_TEXT_END}
${CHANGE_LOG_START}
stručný protokol iba skutočne vykonaných zmien v tomto úseku; každý bod: miesto/sekcia – čo sa upravilo – prečo
${CHANGE_LOG_END}

V protokole neuvádzaj všeobecné odporúčania. Uvádzaj len zmeny, ktoré si naozaj vykonal, a prípady, kde bolo potrebné vložiť označenie chýbajúceho faktu.
`.trim();
}

function buildChunkUserPrompt(params: {
  chunk: RevisionChunk;
  chunkCount: number;
  feedback: string;
  profileBlock: string;
  strictRetry: boolean;
}): string {
  return `
ÚLOHA:
Reviduj iba označený AKTUÁLNY ÚSEK dokumentu, ale uplatni všetky globálne pripomienky, ktoré sa na tento úsek vzťahujú.
Toto je úsek ${params.chunk.index + 1} z ${params.chunkCount}. Výsledný revidovaný text musí zostať obsahovo úplný voči AKTUÁLNEMU ÚSEKU.

AKTÍVNY PROFIL PRÁCE:
${params.profileBlock}

PRIPOMIENKY ŠKOLITEĽA / OPONENTA / KONZULTANTA:
<<<FEEDBACK>>>
${params.feedback || '[Bez samostatných pripomienok; vykonaj iba potrebnú akademickú jazykovú revíziu bez skracovania.]'}
<<<END_FEEDBACK>>>

KONTEXT PRED ÚSEKOM – LEN PRE NADVÄZNOSŤ, NEOPAKUJ HO VO VÝSTUPE:
<<<PREVIOUS_CONTEXT>>>
${params.chunk.previousContext || '[Začiatok dokumentu]'}
<<<END_PREVIOUS_CONTEXT>>>

AKTUÁLNY ÚSEK, KTORÝ MUSÍŠ CELÝ REVIDOVAŤ:
<<<CURRENT_CHUNK>>>
${params.chunk.text}
<<<END_CURRENT_CHUNK>>>

KONTEXT PO ÚSEKU – LEN PRE NADVÄZNOSŤ, NEOPAKUJ HO VO VÝSTUPE:
<<<NEXT_CONTEXT>>>
${params.chunk.nextContext || '[Koniec dokumentu]'}
<<<END_NEXT_CONTEXT>>>

${
  params.strictRetry
    ? 'KRITICKÁ OPRAVA: Predchádzajúci výstup bol príliš krátky alebo hodnotiaci. Teraz zachovaj všetky obsahové jednotky, odseky, nadpisy, čísla, citácie a metodické informácie aktuálneho úseku. Nesumarizuj.'
    : ''
}

Vráť presne formát REVISED_TEXT + CHANGE_LOG definovaný systémovou inštrukciou.
`.trim();
}

function extractBetween(value: string, start: string, end: string): string {
  const startIndex = value.indexOf(start);
  if (startIndex === -1) return '';
  const contentStart = startIndex + start.length;
  const endIndex = value.indexOf(end, contentStart);
  if (endIndex === -1) return value.slice(contentStart).trim();
  return value.slice(contentStart, endIndex).trim();
}

function parseChunkOutput(raw: string): { revisedText: string; changeLog: string } {
  const cleaned = cleanEditorOutput(raw);
  const revisedText = cleanEditorOutput(
    extractBetween(cleaned, REVISED_TEXT_START, REVISED_TEXT_END),
  );
  const changeLog = cleanInvisibleCharacters(
    extractBetween(cleaned, CHANGE_LOG_START, CHANGE_LOG_END),
  );

  if (revisedText) return { revisedText, changeLog };

  // Fallback pre prípad, že model zabudne delimitery, ale stále vráti použiteľný text.
  return {
    revisedText: cleaned,
    changeLog: '',
  };
}

function looksLikeAuditOutput(value: string): boolean {
  const text = cleanInvisibleCharacters(value).toLowerCase();
  const signals = [
    /celkové\s+hodnotenie/,
    /silné\s+stránky/,
    /slabé\s+stránky/,
    /sk[oó]re\s*(?:0\s*[-–]\s*100|[:\-]?\s*\d{1,3})/,
    /odporúčané\s+ďalšie\s+kroky/,
    /otázky\s+na\s+konzultáciu/,
    /overall\s+assessment/,
    /strengths\s+and\s+weaknesses/,
    /quality\s+score/,
  ];
  return signals.filter((pattern) => pattern.test(text)).length >= 2;
}

function buildImageParts(attachments: ExtractedAttachment[], label: string): any[] {
  const parts: any[] = [];

  for (const attachment of attachments) {
    if (!attachment.imageDataUrl) continue;
    parts.push({
      type: 'text',
      text: `${label} „${attachment.name}“. Prečítaj iba obsah relevantný k revízii práce.`,
    });
    parts.push({
      type: 'image_url',
      image_url: {
        url: attachment.imageDataUrl,
        detail: 'high',
      },
    });
  }

  return parts;
}

async function generateChunkRevision(params: {
  systemPrompt: string;
  userPrompt: string;
  imageParts: any[];
  temperature: number;
}): Promise<{ raw: string; finishReason: string | null }> {
  const userContent: any[] = [
    { type: 'text', text: params.userPrompt },
    ...params.imageParts,
  ];

  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: params.temperature,
    max_tokens: MAX_OUTPUT_TOKENS_PER_CHUNK,
    messages: [
      { role: 'system', content: params.systemPrompt },
      { role: 'user', content: userContent },
    ],
  });

  return {
    raw: completion.choices[0]?.message?.content || '',
    finishReason: completion.choices[0]?.finish_reason || null,
  };
}

function rewriteRatio(source: string, revised: string): number {
  if (!source.length) return 1;
  return revised.length / source.length;
}

async function reviseOneChunk(params: {
  chunk: RevisionChunk;
  chunkCount: number;
  feedback: string;
  profileBlock: string;
  systemPrompt: string;
  imageParts: any[];
}): Promise<ChunkRevision> {
  const run = async (strictRetry: boolean) => {
    const generated = await generateChunkRevision({
      systemPrompt: params.systemPrompt,
      userPrompt: buildChunkUserPrompt({
        chunk: params.chunk,
        chunkCount: params.chunkCount,
        feedback: params.feedback,
        profileBlock: params.profileBlock,
        strictRetry,
      }),
      imageParts: params.imageParts,
      temperature: strictRetry ? RETRY_TEMPERATURE : EDITOR_TEMPERATURE,
    });

    const parsed = parseChunkOutput(generated.raw);
    return {
      ...parsed,
      finishReason: generated.finishReason,
      ratio: rewriteRatio(params.chunk.text, parsed.revisedText),
    };
  };

  let attempt = await run(false);
  let retried = false;

  const needsRetry =
    !attempt.revisedText ||
    attempt.finishReason === 'length' ||
    looksLikeAuditOutput(attempt.revisedText) ||
    (params.chunk.text.length > 4_000 &&
      attempt.ratio < MIN_ACCEPTABLE_REWRITE_RATIO);

  if (needsRetry) {
    retried = true;
    attempt = await run(true);
  }

  if (!attempt.revisedText) {
    throw new Error(`Úsek ${params.chunk.index + 1} nevrátil revidovaný text.`);
  }

  if (attempt.finishReason === 'length') {
    throw new Error(
      `Úsek ${params.chunk.index + 1} bol ukončený limitom výstupu. Dokument sa nevracia neúplný. Znížte REVISION_CHUNK_TARGET_CHARS alebo zvýšte modelový limit.`,
    );
  }

  if (looksLikeAuditOutput(attempt.revisedText)) {
    throw new Error(
      `Úsek ${params.chunk.index + 1} sa aj po oprave správal ako audit namiesto revízie.`,
    );
  }

  if (
    params.chunk.text.length > 4_000 &&
    attempt.ratio < MIN_ACCEPTABLE_REWRITE_RATIO
  ) {
    throw new Error(
      `Úsek ${params.chunk.index + 1} bol modelom neprimerane skrátený ` +
        `(pomer ${(attempt.ratio * 100).toFixed(0)} %). Výstup bol zastavený, aby sa používateľovi nevrátil súhrn namiesto kompletnej práce.`,
    );
  }

  return {
    revisedText: attempt.revisedText,
    changeLog: attempt.changeLog,
    retried,
    lengthRatio: attempt.ratio,
  };
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  worker: (value: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let nextIndex = 0;

  const runner = async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= values.length) return;
      results[index] = await worker(values[index], index);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () => runner()),
  );

  return results;
}

function normalizeChangeLog(revisions: ChunkRevision[]): string {
  const seen = new Set<string>();
  const lines: string[] = [];

  revisions.forEach((revision, index) => {
    const rawLines = revision.changeLog
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !/^change\s*log\s*:?$/i.test(line));

    if (!rawLines.length) return;

    for (const rawLine of rawLines) {
      const line = rawLine.replace(/^[-•*]\s*/, '').trim();
      if (!line) continue;
      const key = line.toLowerCase().replace(/\s+/g, ' ');
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push(`- ${line}`);
    }

    if (index < revisions.length - 1 && lines.length && lines[lines.length - 1] !== '') {
      // Žiadny technický nadpis medzi chunkmi; iba zachovanie čitateľnosti.
    }
  });

  return lines.length
    ? lines.join('\n')
    : '- Dokument bol revidovaný podľa dodaných pripomienok; model nevrátil samostatné položky protokolu zmien.';
}

function appendWarnings(attachments: ExtractedAttachment[]): string | undefined {
  const warnings = attachments
    .map((attachment) => attachment.warning)
    .filter((warning): warning is string => Boolean(warning));
  return warnings.length ? warnings.join(' ') : undefined;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error || 'Neznáma chyba.');
}

function isRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { status?: number; code?: string };
  return candidate.status === 429 || candidate.code === 'rate_limit_exceeded';
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json<SupervisorResponse>(
        {
          ok: false,
          error: 'Chýba OPENAI_API_KEY. AI školiteľ sa nedá spustiť.',
        },
        { status: 503 },
      );
    }

    const payload = await parseRequest(request);

    const studentText = assertWithinLimit(
      payload.studentText,
      MAX_STUDENT_TEXT_CHARS,
      'Pôvodný text práce',
    );
    const typedFeedback = assertWithinLimit(
      payload.supervisorFeedback,
      MAX_FEEDBACK_CHARS,
      'Pripomienky',
    );

    const [sourceAttachments, feedbackAttachments] = await Promise.all([
      Promise.all(payload.sourceFiles.map((file) => extractUploadedFile(file))),
      Promise.all(payload.feedbackFiles.map((file) => extractUploadedFile(file))),
    ]);

    const unreadableSource = sourceAttachments.filter(
      (attachment) => !attachment.extractionAvailable && !attachment.imageDataUrl,
    );
    const sourceTooLarge = sourceAttachments.filter((attachment) => attachment.truncated);

    if (sourceTooLarge.length > 0) {
      return NextResponse.json<SupervisorResponse>(
        {
          ok: false,
          error:
            'Pôvodný dokument prekračuje bezpečný limit spracovania. Dokument nebol skrátený ani čiastočne vynechaný; nahrajte ho rozdelený na menšie časti alebo použite textový vstup.',
          warning: appendWarnings(sourceTooLarge),
        },
        { status: 413 },
      );
    }

    if (
      payload.sourceFiles.length > 0 &&
      unreadableSource.length > 0 &&
      !payload.clientExtractedText
    ) {
      return NextResponse.json<SupervisorResponse>(
        {
          ok: false,
          error:
            `Niektoré súbory pôvodnej práce sa nepodarilo načítať (${unreadableSource.map((item) => item.name).join(', ')}). ` +
            'AI školiteľ nesmie pokračovať s neúplným dokumentom. Použite DOCX, textové PDF alebo vložte text priamo.',
          warning: appendWarnings(unreadableSource),
        },
        { status: 422 },
      );
    }

    const sourceAttachmentBlock = buildAttachmentTextBlock(
      sourceAttachments,
      payload.clientExtractedText,
      payload.attachmentsContext,
      MAX_TOTAL_SOURCE_ATTACHMENT_CHARS,
      'Pôvodné dokumenty',
    );

    const feedbackAttachmentBlock = buildAttachmentTextBlock(
      feedbackAttachments,
      payload.clientFeedbackExtractedText,
      payload.feedbackAttachmentsContext,
      MAX_TOTAL_FEEDBACK_ATTACHMENT_CHARS,
      'Pripomienkové dokumenty',
    );

    const sourceDocument = joinDistinctText([
      studentText,
      sourceAttachmentBlock.text,
    ]);

    const feedback = joinDistinctText([
      typedFeedback,
      feedbackAttachmentBlock.text,
    ]);

    const allAttachments = [...sourceAttachments, ...feedbackAttachments];
    const imageParts = [
      ...buildImageParts(sourceAttachments, 'Vizuálna časť pôvodného dokumentu'),
      ...buildImageParts(feedbackAttachments, 'Vizuálna príloha s pripomienkami'),
    ];

    if (!sourceDocument && imageParts.length === 0) {
      return NextResponse.json<SupervisorResponse>(
        {
          ok: false,
          error:
            'AI školiteľ potrebuje pôvodný text práce alebo čitateľný dokument, ktorý má revidovať.',
        },
        { status: 400 },
      );
    }

    const outputLanguage = normalizeLanguage(payload.workLanguage, payload.profile);
    const citationStyle = normalizeCitationStyle(payload.citationStyle, payload.profile);
    const profileBlock = buildProfileBlock(payload.profile);
    const systemPrompt = buildSystemPrompt({ outputLanguage, citationStyle });

    let revisions: ChunkRevision[] = [];

    if (sourceDocument) {
      const chunks = splitIntoRevisionChunks(sourceDocument);
      if (!chunks.length) {
        throw new Error('Pôvodný dokument sa nepodarilo rozdeliť na spracovateľné úseky.');
      }

      revisions = await mapWithConcurrency(
        chunks,
        MAX_PARALLEL_REVISIONS,
        async (chunk) =>
          reviseOneChunk({
            chunk,
            chunkCount: chunks.length,
            feedback,
            profileBlock,
            systemPrompt,
            imageParts,
          }),
      );
    } else {
      // Fallback pre obrazový vstup bez extrahovaného textu.
      const visualChunk: RevisionChunk = {
        index: 0,
        text: 'Vizuálny dokument bez extrahovaného textu. Zachovaj celý čitateľný obsah obrazu.',
        previousContext: '',
        nextContext: '',
      };
      revisions = [
        await reviseOneChunk({
          chunk: visualChunk,
          chunkCount: 1,
          feedback,
          profileBlock,
          systemPrompt,
          imageParts,
        }),
      ];
    }

    const revisedDocument = cleanEditorOutput(
      revisions.map((revision) => revision.revisedText).join('\n\n'),
    );
    const changeLog = normalizeChangeLog(revisions);

    if (!revisedDocument) {
      throw new Error('AI školiteľ nevrátil použiteľný revidovaný dokument.');
    }

    const successfullyReadFiles = allAttachments.filter(
      (attachment) => attachment.extractionAvailable,
    ).length;
    const extractedCharacters = allAttachments.reduce(
      (sum, attachment) => sum + attachment.text.length,
      0,
    );
    const imageFiles = allAttachments.filter((attachment) =>
      Boolean(attachment.imageDataUrl),
    ).length;
    const retriedChunks = revisions.filter((revision) => revision.retried).length;
    const minimumRewriteRatio = Math.min(
      ...revisions.map((revision) => revision.lengthRatio),
    );

    const warning = appendWarnings(allAttachments);

    return NextResponse.json<SupervisorResponse>({
      ok: true,
      revisedDocument,
      rewrittenText: revisedDocument,
      changeLog,
      output: revisedDocument,
      result: revisedDocument,
      message: revisedDocument,
      text: revisedDocument,
      answer: revisedDocument,
      warning,
      attachmentProcessing: {
        receivedFiles: payload.sourceFiles.length + payload.feedbackFiles.length,
        successfullyReadFiles,
        extractedCharacters,
        sourceFiles: payload.sourceFiles.length,
        feedbackFiles: payload.feedbackFiles.length,
      },
      meta: {
        model: MODEL,
        temperature: EDITOR_TEMPERATURE,
        editorMode: 'feedback-revision',
        sourceTextChars: sourceDocument.length,
        feedbackChars: feedback.length,
        sourceAttachmentTextChars: sourceAttachmentBlock.chars,
        feedbackAttachmentTextChars: feedbackAttachmentBlock.chars,
        receivedFiles: payload.sourceFiles.length + payload.feedbackFiles.length,
        successfullyReadFiles,
        extractedCharacters,
        imageFiles,
        chunkCount: revisions.length,
        retriedChunks,
        minimumRewriteRatio,
      },
    });
  } catch (error) {
    console.error('SUPERVISOR_REVISION_ERROR:', error);

    const message = getErrorMessage(error);
    const status = isRateLimitError(error)
      ? 429
      : /príliš dlhý|prekračujú limit|prekračuje limit/i.test(message)
        ? 413
        : 500;

    return NextResponse.json<SupervisorResponse>(
      {
        ok: false,
        error: isRateLimitError(error)
          ? 'AI je dočasne vyťažená. Požiadavku skúste odoslať znova.'
          : `AI školiteľ sa nepodarilo spustiť: ${message}`,
      },
      { status },
    );
  }
}
