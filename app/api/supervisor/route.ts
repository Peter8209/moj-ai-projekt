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
const MIN_ACCEPTABLE_REWRITE_RATIO = 0.78;
const MIN_PARAGRAPH_RETENTION_RATIO = 0.7;
const MAX_PARALLEL_REVISIONS = 2;

const REVISED_TEXT_START = '<<<REVISED_TEXT>>>';
const REVISED_TEXT_END = '<<<END_REVISED_TEXT>>>';
const HIGHLIGHTED_TEXT_START = '<<<HIGHLIGHTED_TEXT>>>';
const HIGHLIGHTED_TEXT_END = '<<<END_HIGHLIGHTED_TEXT>>>';
const CHANGE_PROTOCOL_START = '<<<CHANGE_PROTOCOL>>>';
const CHANGE_PROTOCOL_END = '<<<END_CHANGE_PROTOCOL>>>';

// Stabilné značky používané medzi API a frontendom.
// Frontend ich pri zobrazení a exporte prevedie na žlté zvýraznenie.
const CHANGE_MARK_START = '[[[CHANGED_START]]]';
const CHANGE_MARK_END = '[[[CHANGED_END]]]';

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

  /**
   * Pripomienky vložené priamo vo Word dokumente.
   * Pri DOCX ide najmä o komentáre uložené vo word/comments.xml.
   */
  embeddedFeedback?: string;
  embeddedFeedbackCount?: number;
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

  feedbackSourceMode: 'auto' | 'separate' | 'embedded' | 'both';
  highlightChanges: boolean;
  detailedChangeProtocol: boolean;
};

type RevisionChunk = {
  index: number;
  text: string;
  previousContext: string;
  nextContext: string;
};

type ChunkRevision = {
  revisedText: string;
  highlightedText: string;
  changeProtocol: string;
  retried: boolean;
  lengthRatio: number;
};

type SupervisorResponse = {
  ok: boolean;
  revisedDocument?: string;
  rewrittenText?: string;

  /**
   * Kompletný dokument so značkami [[[CHANGED_START]]]...[[[CHANGED_END]]]
   * okolo reálne doplneného alebo nahradeného textu.
   */
  highlightedDocument?: string;
  highlightedText?: string;

  /**
   * Detailný protokol: miesto, presná pripomienka, text pred zmenou,
   * text po zmene a spôsob zapracovania.
   */
  changeLog?: string;
  changeProtocol?: string;
  detailedChangeProtocol?: string;

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
    embeddedFeedbackCount?: number;
    embeddedFeedbackCharacters?: number;
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
    changedChunks: number;
    embeddedFeedbackCharacters: number;
    embeddedFeedbackCount: number;
    feedbackSourceMode: 'auto' | 'separate' | 'embedded' | 'both';
    changeProtocolEntries: number;
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

function decodeWordXmlText(value: string): string {
  return cleanInvisibleCharacters(
    String(value || '')
      .replace(/<w:tab\b[^>]*\/>/gi, '\t')
      .replace(/<w:br\b[^>]*\/>/gi, '\n')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&'),
  );
}

async function readDocxXmlEntry(
  buffer: Buffer,
  entrySuffix: string,
): Promise<string> {
  try {
    /**
     * Projekt už používa balík xlsx. Jeho CFB vrstva dokáže prečítať
     * aj ZIP kontajner OOXML, preto nemusíme pridávať ďalšiu závislosť
     * iba kvôli Word komentárom.
     */
    const xlsxModule: any = await import('xlsx');
    const xlsx = xlsxModule?.default || xlsxModule;
    const cfb = xlsx?.CFB?.read?.(buffer, { type: 'buffer' });

    const paths: string[] = Array.isArray(cfb?.FullPaths) ? cfb.FullPaths : [];
    const files: any[] = Array.isArray(cfb?.FileIndex) ? cfb.FileIndex : [];

    const normalizedSuffix = entrySuffix.replace(/^\/+/, '').toLowerCase();
    const entryIndex = paths.findIndex((path) =>
      String(path || '')
        .replace(/\\/g, '/')
        .replace(/^\/+/, '')
        .toLowerCase()
        .endsWith(normalizedSuffix),
    );

    if (entryIndex < 0) return '';

    const content = files[entryIndex]?.content;
    if (!content) return '';

    return Buffer.isBuffer(content)
      ? content.toString('utf-8')
      : Buffer.from(content).toString('utf-8');
  } catch {
    // DOCX bez komentárov alebo verzia xlsx bez podpory daného ZIP kontajnera.
    return '';
  }
}

type WordCommentRecord = {
  id: string;
  author: string;
  comment: string;
  anchor: string;
};

async function extractDocxComments(
  buffer: Buffer,
): Promise<{ text: string; count: number }> {
  const [commentsXml, documentXml] = await Promise.all([
    readDocxXmlEntry(buffer, 'word/comments.xml'),
    readDocxXmlEntry(buffer, 'word/document.xml'),
  ]);

  if (!commentsXml) return { text: '', count: 0 };

  const comments = new Map<string, Omit<WordCommentRecord, 'anchor'>>();
  const commentPattern = /<w:comment\b([^>]*)>([\s\S]*?)<\/w:comment>/gi;
  let commentMatch: RegExpExecArray | null;

  while ((commentMatch = commentPattern.exec(commentsXml))) {
    const attributes = commentMatch[1] || '';
    const body = commentMatch[2] || '';
    const id =
      attributes.match(/\bw:id="([^"]+)"/i)?.[1] ||
      attributes.match(/\bid="([^"]+)"/i)?.[1] ||
      '';
    if (!id) continue;

    const author =
      attributes.match(/\bw:author="([^"]*)"/i)?.[1] ||
      attributes.match(/\bauthor="([^"]*)"/i)?.[1] ||
      'Neuvedený autor';

    const textParts = Array.from(body.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/gi))
      .map((match) => decodeWordXmlText(match[1] || ''))
      .filter(Boolean);

    const comment = cleanInvisibleCharacters(textParts.join(' '));
    if (!comment) continue;

    comments.set(id, {
      id,
      author: decodeWordXmlText(author),
      comment,
    });
  }

  if (!comments.size) return { text: '', count: 0 };

  const anchors = new Map<string, string[]>();

  if (documentXml) {
    const activeCommentIds = new Set<string>();
    const tokenPattern =
      /<w:commentRangeStart\b[^>]*w:id="([^"]+)"[^>]*\/?>|<w:commentRangeEnd\b[^>]*w:id="([^"]+)"[^>]*\/?>|<w:t\b[^>]*>([\s\S]*?)<\/w:t>|<w:tab\b[^>]*\/>|<w:br\b[^>]*\/>/gi;

    let tokenMatch: RegExpExecArray | null;

    while ((tokenMatch = tokenPattern.exec(documentXml))) {
      const startId = tokenMatch[1];
      const endId = tokenMatch[2];
      const text = tokenMatch[3];

      if (startId !== undefined) {
        activeCommentIds.add(startId);
        if (!anchors.has(startId)) anchors.set(startId, []);
        continue;
      }

      if (endId !== undefined) {
        activeCommentIds.delete(endId);
        continue;
      }

      if (text !== undefined && activeCommentIds.size > 0) {
        const decoded = decodeWordXmlText(text);
        if (!decoded) continue;

        for (const id of activeCommentIds) {
          const values = anchors.get(id) || [];
          values.push(decoded);
          anchors.set(id, values);
        }
      }
    }
  }

  const records: WordCommentRecord[] = Array.from(comments.values()).map(
    (comment) => ({
      ...comment,
      anchor: cleanInvisibleCharacters((anchors.get(comment.id) || []).join(' ')),
    }),
  );

  const formatted = records
    .map((record, index) =>
      [
        `PRIPOMIENKA ${index + 1}`,
        `Autor: ${record.author || 'Neuvedený autor'}`,
        `Kotva v pôvodnej práci: ${record.anchor || 'Kotva sa z DOCX nedala určiť.'}`,
        `Presné znenie pripomienky: ${record.comment}`,
      ].join('\n'),
    )
    .join('\n\n---\n\n');

  return {
    text: cleanInvisibleCharacters(formatted),
    count: records.length,
  };
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

function looksLikeFeedbackFileName(fileName: string): boolean {
  const normalized = fileName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return /(pripomien|komentar|comment|feedback|review|oponent|skolitel|supervisor|posudok|revision)/i.test(
    normalized,
  );
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
    let embeddedFeedback = '';
    let embeddedFeedbackCount = 0;

    if (isTextLikeFile(name, type)) {
      const decoded = buffer.toString('utf-8');
      extractedText =
        extension === '.rtf' ? stripRtf(decoded) : cleanInvisibleCharacters(decoded);
    } else if (
      extension === '.docx' ||
      type.includes('wordprocessingml.document')
    ) {
      const [docxText, docxComments] = await Promise.all([
        extractDocxText(buffer),
        extractDocxComments(buffer),
      ]);
      extractedText = docxText;
      embeddedFeedback = docxComments.text;
      embeddedFeedbackCount = docxComments.count;
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
      embeddedFeedback: embeddedFeedback || undefined,
      embeddedFeedbackCount: embeddedFeedbackCount || undefined,
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

function parseBooleanFlag(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  const normalized = String(value ?? '').trim().toLowerCase();
  if (['1', 'true', 'yes', 'ano', 'áno'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'nie'].includes(normalized)) return false;
  return fallback;
}

function normalizeFeedbackSourceMode(
  value: unknown,
): 'auto' | 'separate' | 'embedded' | 'both' {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (
    normalized === 'separate' ||
    normalized === 'embedded' ||
    normalized === 'both'
  ) {
    return normalized;
  }
  return 'auto';
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
      ...formData.getAll('feedbackAttachments'),
      ...formData.getAll('commentFiles'),
      ...formData.getAll('commentAttachments'),
      ...formData.getAll('reviewFiles'),
      ...formData.getAll('reviewerFiles'),
      ...formData.getAll('supervisorFiles'),
    ]);

    const legacyFiles = uniqueFiles([
      ...formData.getAll('files'),
      ...formData.getAll('file'),
      ...formData.getAll('attachments'),
      ...formData.getAll('attachment'),
    ]);

    const legacyFeedbackFiles = legacyFiles.filter((file) =>
      looksLikeFeedbackFileName(file.name || ''),
    );
    const legacySourceFiles = legacyFiles.filter(
      (file) => !looksLikeFeedbackFileName(file.name || ''),
    );

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
      sourceFiles: explicitSourceFiles.length ? explicitSourceFiles : legacySourceFiles,
      feedbackFiles: explicitFeedbackFiles.length
        ? explicitFeedbackFiles
        : legacyFeedbackFiles,
      feedbackSourceMode: normalizeFeedbackSourceMode(
        formData.get('feedbackSourceMode') || formData.get('feedbackMode'),
      ),
      highlightChanges: parseBooleanFlag(formData.get('highlightChanges'), true),
      detailedChangeProtocol: parseBooleanFlag(
        formData.get('detailedChangeProtocol'),
        true,
      ),
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
    feedbackSourceMode: normalizeFeedbackSourceMode(
      json.feedbackSourceMode || json.feedbackMode,
    ),
    highlightChanges: parseBooleanFlag(json.highlightChanges, true),
    detailedChangeProtocol: parseBooleanFlag(json.detailedChangeProtocol, true),
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
  feedbackSourceMode: 'auto' | 'separate' | 'embedded' | 'both';
}): string {
  return `
Si AI školiteľ platformy Zedpera v režime PRESNÁ REVÍZIA PODĽA PRIPOMIENOK.
Si akademický editor dokumentu. Tvojou úlohou NIE JE sumarizovať, hodnotiť ani vysvetľovať prácu, ale FYZICKY ZAPRACOVAŤ pripomienky do pôvodného textu.

ZDROJE PRIPOMIENOK:
- samostatný text z poľa pripomienok,
- samostatný PDF/DOCX/TXT dokument s pripomienkami,
- Word komentáre extrahované priamo z pôvodného DOCX,
- poznámky vložené priamo v texte práce, napríklad „Pripomienka:“, „Komentár:“, „TODO:“, „Poznámka konzultanta:“ alebo podobné redakčné značky.
- Režim zdroja pripomienok: ${params.feedbackSourceMode}.
- Ak je pripomienka vložená priamo v práci, po jej zapracovaní odstráň z finálneho dokumentu samotnú redakčnú poznámku. Jej presné znenie však zachovaj v protokole zmien.
- Bežný odborný text, ktorý iba používa slovo „komentár“ alebo „poznámka“, nepovažuj automaticky za pripomienku. Musí ísť o jednoznačnú redakčnú alebo konzultačnú inštrukciu.

ZÁKLADNÝ PRINCÍP:
Pripomienka je špecifikácia zmeny. Najprv urč, čo presne požaduje, potom nájdi miesto v aktuálnom úseku a vykonaj konkrétnu editáciu priamo v texte.

POVINNÉ SPRÁVANIE:
- „doplň / rozšír / vysvetli“ = vlož požadovaný obsah na správne miesto; ak chýba fakt, vlož „Údaj je potrebné doplniť: …“.
- „oprav / zmeň / preformuluj“ = nahraď chybnú formuláciu opravenou formuláciou priamo v dokumente.
- „odstráň / vynechaj“ = odstráň iba požadovanú časť a oprav nadväznosť viet.
- „presuň“ = zmeň umiestnenie obsahu, nie iba slovne opíš, že by sa mal presunúť.
- „zjednoť terminológiu / čas / osobu / citačný štýl“ = vykonaj zmenu na všetkých relevantných miestach aktuálneho úseku.
- Ak pripomienka obsahuje konkrétny citát, slovné spojenie, názov kapitoly, číslo tabuľky, hypotézy alebo sekcie, ber to ako kotvu a uprav presne dané miesto.

ABSOLÚTNE PRAVIDLÁ:
- NESKRACUJ dokument na súhrn, abstrakt, osnovu ani krátku prepracovanú verziu.
- NIKDY nenahrádzaj pôvodný text komentárom typu „bolo upravené“, „odporúčam“, „je potrebné doplniť“ mimo prípadu, keď skutočne chýba nedodaný fakt.
- NEVYNECHÁVAJ odseky, podkapitoly, tabuľky, názvy tabuliek/grafov, citácie, výsledky alebo metodické informácie, pokiaľ ich odstránenie výslovne nevyžaduje pripomienka.
- Časti, ktorých sa žiadna pripomienka netýka, zachovaj čo najvernejšie, ideálne verbatim. Nerob samoúčelnú jazykovú parafrázu celého úseku.
- Každý spracovaný úsek musí po revízii reprezentovať celý obsah vstupného úseku, nie jeho zhrnutie.
- Zachovaj poradie kapitol a podkapitol. Číslovanie oprav iba vtedy, ak je chyba jednoznačná z textu alebo pripomienky.
- Zachovaj existujúce fakty, čísla, štatistiky, názvy nástrojov, výsledky a citácie. Ak sú rozporné, nevymýšľaj správnu hodnotu.
- Nevymýšľaj nové zdroje, DOI, URL, roky, bibliografické údaje, etické schválenie, termín alebo miesto zberu ani iný chýbajúci fakt.
- Ak pripomienka vyžaduje fakt, ktorý v podkladoch nie je, vlož na presné miesto neutrálne označenie „Údaj je potrebné doplniť: …“ a uveď, čo chýba.
- Pri reliabilite alebo metodologickom probléme interpretuj iba hodnoty, ktoré sú v podkladoch.
- Formuláciu „hypotézu potvrdzujeme/nepotvrdzujeme“ nahraď metodologicky primeraným vyjadrením o podpore alebo nepodpore hypotézy výsledkami.
- Existujúce citácie zachovaj. Citačný štýl: ${params.citationStyle}.
- Jazyk výsledku: ${params.outputLanguage}.

ZVÝRAZNENÁ VERZIA:
- HIGHLIGHTED_TEXT musí obsahovať celý výsledný úsek, nie iba zoznam zmien.
- Každý nový alebo nahradený text obaľ presne značkami:
  ${CHANGE_MARK_START}nové alebo upravené znenie${CHANGE_MARK_END}
- Nezmenený text nesmie byť označený.
- Pri čisto odstránenom texte nie je čo zvýrazniť; odstránené znenie uveď presne v protokole.
- Nepoužívaj HTML, Markdown zvýraznenie, farby ani iné značky.
- Po odstránení značiek musí byť HIGHLIGHTED_TEXT obsahovo totožný s REVISED_TEXT.

DETAILNÝ PROTOKOL:
Pre každú skutočne vykonanú zmenu vytvor samostatný blok v tomto presnom poradí:
ZMENA_ID: poradové číslo v aktuálnom úseku
MIESTO: kapitola, podkapitola, odsek, veta, tabuľka alebo najpresnejšia dostupná kotva
PÔVODNÁ_PRIPOMIENKA: presné znenie pripomienky pred zapracovaním; nič neprikrášľuj ani nepreformuluj
PÔVODNÉ_ZNENIE: presný pôvodný text z práce pred úpravou; pri doplnení uveď text bezprostredne pred miestom vloženia
NOVÉ_ZNENIE: presný výsledný text po úprave
SPÔSOB_ZAPRACOVANIA: stručne a vecne, čo sa vykonalo
STAV: ZAPRACOVANÉ | ČIASTOČNE_ZAPRACOVANÉ | NEZAPRACOVANÉ_CHÝBAJÚCI_ÚDAJ
---
Ak sa nič nemenilo, vráť iba:
BEZ_ZMENY – žiadna pripomienka sa na tento úsek nevzťahuje.

KONTROLA PRED ODOVZDANÍM:
1. Skontroluj každú pripomienku, ktorá sa vzťahuje na aktuálny úsek.
2. Over, že výsledok obsahuje skutočnú úpravu textu, nie iba opis odporúčania.
3. Over, že neboli stratené nesúvisiace odseky, fakty, čísla ani citácie.
4. Over, že každá zmena je zvýraznená iba v HIGHLIGHTED_TEXT.
5. Over, že protokol obsahuje presnú pripomienku a presné znenie pred aj po zmene.
6. Ak sa na aktuálny úsek nevzťahuje žiadna pripomienka, vráť pôvodný úsek BEZ PREPISOVANIA.

VÝSTUP MÁ VŽDY TRI ČASTI V PRESNOM FORMÁTE:
${REVISED_TEXT_START}
kompletný čistý výsledný text aktuálneho úseku po priamom zapracovaní pripomienok
${REVISED_TEXT_END}
${HIGHLIGHTED_TEXT_START}
ten istý kompletný výsledný text, ale nový alebo nahradený text označ značkami ${CHANGE_MARK_START} a ${CHANGE_MARK_END}
${HIGHLIGHTED_TEXT_END}
${CHANGE_PROTOCOL_START}
detailný protokol podľa povinných polí vyššie
${CHANGE_PROTOCOL_END}
`.trim();
}

function buildChunkUserPrompt(params: {
  chunk: RevisionChunk;
  chunkCount: number;
  feedback: string;
  profileBlock: string;
  feedbackSourceMode: 'auto' | 'separate' | 'embedded' | 'both';
  strictRetry: boolean;
}): string {
  const feedbackInstruction = params.feedback
    ? params.feedback
    : [
        '[Samostatné pripomienky neboli dodané.]',
        'Skontroluj CURRENT_CHUNK, či obsahuje jednoznačné vložené pripomienky, komentáre konzultanta, redakčné poznámky alebo TODO pokyny.',
        'Ak takéto pripomienky neobsahuje, vráť úsek presne bez zmeny.',
      ].join(' ');

  return `
ÚLOHA:
Toto je úsek ${params.chunk.index + 1} z ${params.chunkCount}. Urob chirurgickú revíziu podľa pripomienok.

REŽIM ZDROJA PRIPOMIENOK:
${params.feedbackSourceMode}

DÔLEŽITÉ:
- Najprv si interne spáruj každú relevantnú pripomienku s konkrétnym miestom v CURRENT_CHUNK.
- Potom text na danom mieste skutočne prepíš, oprav, doplň, odstráň alebo presuň podľa významu pripomienky.
- Nevracaj vysvetlenie toho, čo by sa malo urobiť. V REVISED_TEXT musí byť už hotová opravená verzia dokumentu.
- Čokoľvek mimo rozsahu pripomienok zachovaj čo najpresnejšie podľa originálu.
- Ak sa pripomienka na CURRENT_CHUNK nevzťahuje, CURRENT_CHUNK neparafrázuj.
- Ak je pripomienka napísaná priamo v CURRENT_CHUNK, po zapracovaní odstráň jej redakčné označenie z finálneho textu.
- V HIGHLIGHTED_TEXT označ iba reálne pridaný alebo nahradený text.
- V CHANGE_PROTOCOL skopíruj presné znenie pripomienky, presný pôvodný úryvok a presný nový úryvok.

AKTÍVNY PROFIL PRÁCE:
${params.profileBlock}

SAMOSTATNÉ A EXTRAHOVANÉ PRIPOMIENKY ŠKOLITEĽA / OPONENTA / KONZULTANTA:
<<<FEEDBACK>>>
${feedbackInstruction}
<<<END_FEEDBACK>>>

KONTEXT PRED ÚSEKOM – iba na orientáciu, nesmie sa kopírovať do výsledku:
<<<PREVIOUS_CONTEXT>>>
${params.chunk.previousContext || '[Začiatok dokumentu]'}
<<<END_PREVIOUS_CONTEXT>>>

AKTUÁLNY ÚSEK, KTORÝ SA MÁ PRIAMO EDITOVAŤ:
<<<CURRENT_CHUNK>>>
${params.chunk.text}
<<<END_CURRENT_CHUNK>>>

KONTEXT PO ÚSEKU – iba na orientáciu, nesmie sa kopírovať do výsledku:
<<<NEXT_CONTEXT>>>
${params.chunk.nextContext || '[Koniec dokumentu]'}
<<<END_NEXT_CONTEXT>>>

${
  params.strictRetry
    ? `KRITICKÁ OPRAVA PREDCHÁDZAJÚCEHO POKUSU:
Predchádzajúca odpoveď nebola prijateľná. Nesmieš sumarizovať ani len opísať pripomienky. Zachovaj celý CURRENT_CHUNK a každú relevantnú pripomienku aplikuj priamo do konkrétnej vety, odseku, tabuľky alebo sekcie. Nesúvisiaci text nechaj nedotknutý. Musíš vrátiť všetky tri časti: čistý dokument, zvýraznený dokument a detailný protokol pred/po.`
    : ''
}

Vráť iba presný formát REVISED_TEXT + HIGHLIGHTED_TEXT + CHANGE_PROTOCOL definovaný systémovou inštrukciou.
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

function stripChangeMarkers(value: string): string {
  return cleanInvisibleCharacters(
    String(value || '')
      .split(CHANGE_MARK_START)
      .join('')
      .split(CHANGE_MARK_END)
      .join(''),
  );
}

function normalizeHighlightedChunk(
  revisedText: string,
  highlightedText: string,
): string {
  const cleanHighlighted = cleanInvisibleCharacters(highlightedText);
  if (!cleanHighlighted) return revisedText;

  const withoutMarkers = stripChangeMarkers(cleanHighlighted);
  if (normalizeForComparison(withoutMarkers) !== normalizeForComparison(revisedText)) {
    // Bezpečnostný fallback: zvýraznená verzia nesmie obsahovo meniť dokument.
    return revisedText;
  }

  return cleanHighlighted;
}

function parseChunkOutput(raw: string): {
  revisedText: string;
  highlightedText: string;
  changeProtocol: string;
} {
  const cleaned = cleanEditorOutput(raw);
  const hasRevisedStart = cleaned.includes(REVISED_TEXT_START);
  const hasRevisedEnd = cleaned.includes(REVISED_TEXT_END);
  const hasHighlightedStart = cleaned.includes(HIGHLIGHTED_TEXT_START);
  const hasHighlightedEnd = cleaned.includes(HIGHLIGHTED_TEXT_END);
  const hasProtocolStart = cleaned.includes(CHANGE_PROTOCOL_START);
  const hasProtocolEnd = cleaned.includes(CHANGE_PROTOCOL_END);

  if (
    !hasRevisedStart ||
    !hasRevisedEnd ||
    !hasHighlightedStart ||
    !hasHighlightedEnd ||
    !hasProtocolStart ||
    !hasProtocolEnd
  ) {
    return {
      revisedText: '',
      highlightedText: '',
      changeProtocol: '',
    };
  }

  const revisedText = cleanEditorOutput(
    extractBetween(cleaned, REVISED_TEXT_START, REVISED_TEXT_END),
  );
  const highlightedText = cleanInvisibleCharacters(
    extractBetween(cleaned, HIGHLIGHTED_TEXT_START, HIGHLIGHTED_TEXT_END),
  );

  return {
    revisedText,
    highlightedText: normalizeHighlightedChunk(revisedText, highlightedText),
    changeProtocol: cleanInvisibleCharacters(
      extractBetween(cleaned, CHANGE_PROTOCOL_START, CHANGE_PROTOCOL_END),
    ),
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

function meaningfulParagraphCount(value: string): number {
  return cleanInvisibleCharacters(value)
    .split(/\n{2,}/g)
    .map((part) => part.trim())
    .filter((part) => part.length >= 80).length;
}

function paragraphRetentionRatio(source: string, revised: string): number {
  const sourceParagraphs = meaningfulParagraphCount(source);
  if (sourceParagraphs < 3) return 1;
  return meaningfulParagraphCount(revised) / sourceParagraphs;
}

function normalizeForComparison(value: string): string {
  return cleanInvisibleCharacters(value)
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function hasMaterialTextChange(source: string, revised: string): boolean {
  return normalizeForComparison(source) !== normalizeForComparison(revised);
}

async function reviseOneChunk(params: {
  chunk: RevisionChunk;
  chunkCount: number;
  feedback: string;
  profileBlock: string;
  systemPrompt: string;
  imageParts: any[];
  feedbackSourceMode: 'auto' | 'separate' | 'embedded' | 'both';
}): Promise<ChunkRevision> {
  const run = async (strictRetry: boolean) => {
    const generated = await generateChunkRevision({
      systemPrompt: params.systemPrompt,
      userPrompt: buildChunkUserPrompt({
        chunk: params.chunk,
        chunkCount: params.chunkCount,
        feedback: params.feedback,
        profileBlock: params.profileBlock,
        feedbackSourceMode: params.feedbackSourceMode,
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
      paragraphRatio: paragraphRetentionRatio(params.chunk.text, parsed.revisedText),
    };
  };

  let attempt = await run(false);
  let retried = false;

  const needsRetry =
    !attempt.revisedText ||
    !attempt.highlightedText ||
    !attempt.changeProtocol ||
    attempt.finishReason === 'length' ||
    looksLikeAuditOutput(attempt.revisedText) ||
    (params.chunk.text.length > 4_000 &&
      attempt.ratio < MIN_ACCEPTABLE_REWRITE_RATIO) ||
    (meaningfulParagraphCount(params.chunk.text) >= 3 &&
      attempt.paragraphRatio < MIN_PARAGRAPH_RETENTION_RATIO);

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

  if (
    meaningfulParagraphCount(params.chunk.text) >= 3 &&
    attempt.paragraphRatio < MIN_PARAGRAPH_RETENTION_RATIO
  ) {
    throw new Error(
      `Úsek ${params.chunk.index + 1} stratil príliš veľa pôvodných odsekov. ` +
        'Výstup bol zastavený, pretože sa podobal na sumarizáciu namiesto priamej revízie.',
    );
  }

  return {
    revisedText: attempt.revisedText,
    highlightedText: normalizeHighlightedChunk(
      attempt.revisedText,
      attempt.highlightedText,
    ),
    changeProtocol: attempt.changeProtocol,
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

function normalizeChangeProtocol(revisions: ChunkRevision[]): string {
  const sections: string[] = [];
  const seen = new Set<string>();

  revisions.forEach((revision, index) => {
    const protocol = cleanInvisibleCharacters(revision.changeProtocol);
    if (!protocol || /^BEZ_ZMENY\b/i.test(protocol)) return;

    const normalizedKey = protocol.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seen.has(normalizedKey)) return;
    seen.add(normalizedKey);

    sections.push(
      [
        `ÚSEK DOKUMENTU: ${index + 1}`,
        protocol.replace(/\n-{3,}\s*$/g, '').trim(),
      ].join('\n'),
    );
  });

  if (!sections.length) {
    return [
      'PROTOKOL ZAPRACOVANIA PRIPOMIENOK',
      '',
      'Nebola vykonaná žiadna textová zmena. Buď neboli dodané pripomienky, alebo sa dodané pripomienky nevzťahovali na spracovaný dokument.',
    ].join('\n');
  }

  return [
    'PROTOKOL ZAPRACOVANIA PRIPOMIENOK',
    '',
    'Každá položka obsahuje presné znenie pripomienky, pôvodný text a výsledný text po zapracovaní.',
    '',
    sections.join('\n\n============================================================\n\n'),
  ].join('\n');
}

function countChangeProtocolEntries(value: string): number {
  const explicitEntries = value.match(/^ZMENA_ID\s*:/gim)?.length || 0;
  if (explicitEntries > 0) return explicitEntries;

  return value.match(/^PÔVODNÁ_PRIPOMIENKA\s*:/gim)?.length || 0;
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

    const unreadableFeedback = feedbackAttachments.filter(
      (attachment) => !attachment.extractionAvailable && !attachment.imageDataUrl,
    );

    if (
      payload.feedbackFiles.length > 0 &&
      unreadableFeedback.length > 0 &&
      !payload.clientFeedbackExtractedText
    ) {
      return NextResponse.json<SupervisorResponse>(
        {
          ok: false,
          error:
            `Niektoré súbory s pripomienkami sa nepodarilo načítať (${unreadableFeedback.map((item) => item.name).join(', ')}). ` +
            'AI školiteľ nesmie pokračovať bez pripomienok, pretože by iba všeobecne prepisoval pôvodnú prácu. Použite DOCX, textové PDF alebo vložte pripomienky priamo.',
          warning: appendWarnings(unreadableFeedback),
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

    const embeddedFeedback = joinDistinctText(
      sourceAttachments.map((attachment) => attachment.embeddedFeedback || ''),
    );
    const embeddedFeedbackCount = sourceAttachments.reduce(
      (sum, attachment) => sum + (attachment.embeddedFeedbackCount || 0),
      0,
    );

    const sourceDocument = joinDistinctText([
      studentText,
      sourceAttachmentBlock.text,
    ]);

    const feedback = joinDistinctText([
      typedFeedback,
      feedbackAttachmentBlock.text,
      embeddedFeedback,
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
    const systemPrompt = buildSystemPrompt({
      outputLanguage,
      citationStyle,
      feedbackSourceMode: payload.feedbackSourceMode,
    });

    let revisions: ChunkRevision[] = [];
    let revisionChunks: RevisionChunk[] = [];

    if (sourceDocument) {
      const chunks = splitIntoRevisionChunks(sourceDocument);
      revisionChunks = chunks;
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
            feedbackSourceMode: payload.feedbackSourceMode,
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
          feedbackSourceMode: payload.feedbackSourceMode,
        }),
      ];
    }

    const revisedDocument = cleanEditorOutput(
      revisions.map((revision) => revision.revisedText).join('\n\n'),
    );
    const highlightedDocument = cleanInvisibleCharacters(
      revisions.map((revision) => revision.highlightedText).join('\n\n'),
    );
    const changeProtocol = normalizeChangeProtocol(revisions);
    const changeProtocolEntries = countChangeProtocolEntries(changeProtocol);
    const changedChunks = revisionChunks.length
      ? revisions.filter((revision, index) =>
          hasMaterialTextChange(revisionChunks[index]?.text || '', revision.revisedText),
        ).length
      : revisions.length;

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

    let warning = appendWarnings(allAttachments);

    if (feedback.trim() && changedChunks === 0) {
      const noChangeWarning =
        'Boli dodané pripomienky, ale model nevykonal žiadnu textovú zmenu. Skontrolujte, či pripomienky obsahujú konkrétne kotvy alebo či frontend posiela pripomienkové súbory cez feedbackFiles.';
      warning = warning ? `${warning} ${noChangeWarning}` : noChangeWarning;
    }

    return NextResponse.json<SupervisorResponse>({
      ok: true,
      revisedDocument,
      rewrittenText: revisedDocument,
      highlightedDocument,
      highlightedText: highlightedDocument,
      changeLog: changeProtocol,
      changeProtocol,
      detailedChangeProtocol: changeProtocol,
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
        embeddedFeedbackCount,
        embeddedFeedbackCharacters: embeddedFeedback.length,
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
        changedChunks,
        embeddedFeedbackCharacters: embeddedFeedback.length,
        embeddedFeedbackCount,
        feedbackSourceMode: payload.feedbackSourceMode,
        changeProtocolEntries,
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
