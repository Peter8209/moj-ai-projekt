'use client';

import { useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowDownToLine,
  BarChart3,
  FileSearch,
  FileText,
  Loader2,
  Percent,
  Printer,
  Search,
  ShieldAlert,
  Trash2,
  UploadCloud,
} from 'lucide-react';

// =====================================================
// TYPES
// =====================================================

type CorpusMatch = {
  name: string;
  percent: number;
  count?: number;
};

type SimilarDocument = {
  id?: string | number;
  order?: number;
  citation: string;
  source?: string;
  plagId?: string;
  workType?: string;
  percent: number;
};

type SimilarityPassage = {
  id?: string | number;
  paragraph?: string;
  reliability?: string;
  percent?: number;
  controlledText: string;
  matchedText?: string;
  sourceTitle?: string;
  sourceUrl?: string;
  sourceDocNumber?: number;
  reason?: string;
};

type DictionaryStats = {
  extractedChars?: number;
  totalWords?: number;
  dictionaryWords?: number;
  dictionaryWordsRatio?: number;
  dictionaryLengthSum?: number;
  dictionaryLengthRatio?: number;
};

type HistogramItem = {
  length: number;
  count?: number;
  deviation?: '=' | '>>' | '<<' | string;
};

type OriginalityResult = {
  ok?: boolean;
  id?: string | null;

  score: number;
  title?: string;
  author?: string;
  authorName?: string;
  school?: string;
  faculty?: string;
  studyProgram?: string;
  supervisor?: string;
  workType?: string;
  citationStyle?: string;
  language?: string;
  createdAt?: string;

  metadataUrl?: string;
  webProtocolUrl?: string;
  protocolVersion?: string;

  corpuses: CorpusMatch[];
  dictionaryStats?: DictionaryStats;
  histogram?: HistogramItem[];
  documents: SimilarDocument[];
  passages: SimilarityPassage[];

  summary?: string;
  recommendation?: string;
  report?: string;
  plaintext?: string;
  extractedText?: string;
};

type UploadedFile = {
  id: string;
  file: File;
  name: string;
  size: number;
  extension: string;
};

// =====================================================
// CONSTANTS
// =====================================================

const allowedExtensions = [
  '.pdf',
  '.doc',
  '.docx',
  '.txt',
  '.rtf',
  '.odt',
  '.md',
];

const maxFileSizeMb = 30;
const maxFileSizeBytes = maxFileSizeMb * 1024 * 1024;

const defaultCorpuses: CorpusMatch[] = [
  { name: 'Korpus CRZP', percent: 0, count: 0 },
  { name: 'Internet', percent: 0, count: 0 },
  { name: 'Wiki', percent: 0, count: 0 },
  { name: 'Slov-Lex', percent: 0, count: 0 },
];

const intervalRows = [
  {
    interval: '100%-70%',
    effect: 'žiadny',
  },
  {
    interval: '70%-60%',
    effect: 'malý',
  },
  {
    interval: '60%-50%',
    effect: 'stredný',
  },
  {
    interval: '40%-30%',
    effect: 'veľký',
  },
  {
    interval: '30%-0%',
    effect: 'zásadný',
  },
];

// =====================================================
// PAGE
// =====================================================

export default function OriginalityProtocolPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [title, setTitle] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [school, setSchool] = useState('');
  const [faculty, setFaculty] = useState('');
  const [studyProgram, setStudyProgram] = useState('');
  const [supervisor, setSupervisor] = useState('');
  const [workType, setWorkType] = useState('bakalárska');
  const [citationStyle, setCitationStyle] = useState('ISO 690');
  const [language, setLanguage] = useState('SK');
  const [text, setText] = useState('');

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [fileError, setFileError] = useState('');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OriginalityResult | null>(null);
  const [error, setError] = useState('');

  const textLength = text.trim().length;

  const riskLabel = useMemo(() => {
    if (!result) return '';

    if (result.score >= 50) return 'Vysoká podobnosť';
    if (result.score >= 25) return 'Stredná podobnosť';
    return 'Nízka podobnosť';
  }, [result]);

  function getExtension(fileName: string) {
    const index = fileName.lastIndexOf('.');
    if (index === -1) return '';
    return fileName.slice(index).toLowerCase();
  }

  function formatFileSize(size: number) {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }

  function addFiles(fileList: FileList | null) {
    setFileError('');

    if (!fileList) return;

    const incoming = Array.from(fileList);

    setFiles((current) => {
      const next = [...current];

      for (const file of incoming) {
        const extension = getExtension(file.name);

        if (!allowedExtensions.includes(extension)) {
          setFileError(
            `Súbor "${file.name}" má nepodporovaný formát. Povolené sú PDF, DOC, DOCX, TXT, RTF, ODT a MD.`,
          );
          continue;
        }

        if (file.size > maxFileSizeBytes) {
          setFileError(
            `Súbor "${file.name}" je príliš veľký. Maximálna veľkosť je ${maxFileSizeMb} MB.`,
          );
          continue;
        }

        const duplicate = next.some(
          (item) => item.name === file.name && item.file.size === file.size,
        );

        if (duplicate) continue;

        next.push({
          id:
            typeof crypto !== 'undefined' && 'randomUUID' in crypto
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random()}`,
          file,
          name: file.name,
          size: file.size,
          extension,
        });
      }

      return next;
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function removeFile(id: string) {
    setFiles((current) => current.filter((file) => file.id !== id));
  }

  function createFallbackHistogram(): HistogramItem[] {
    return Array.from({ length: 23 }).map((_, index) => ({
      length: index + 3,
      count: 0,
      deviation: index === 6 ? '>>' : '=',
    }));
  }

  function normalizeHistogram(value: unknown): HistogramItem[] {
    if (!Array.isArray(value) || value.length === 0) {
      return createFallbackHistogram();
    }

    const mapped = value.map((item: any, index: number) => ({
      length: Number(item?.length || item?.wordLength || index + 3),
      count: Number(item?.count || item?.value || 0),
      deviation: item?.deviation || item?.indicator || '=',
    }));

    const lengths = new Set(mapped.map((item) => item.length));
    const completed = [...mapped];

    for (let length = 3; length <= 25; length += 1) {
      if (!lengths.has(length)) {
        completed.push({
          length,
          count: 0,
          deviation: '=',
        });
      }
    }

    return completed.sort((a, b) => a.length - b.length);
  }

  function normalizeApiResult(data: any): OriginalityResult {
    const documents: SimilarDocument[] = Array.isArray(data?.documents)
      ? data.documents.map((doc: any, index: number) => ({
          id: doc.id || index + 1,
          order: Number(doc.order || index + 1),
          citation:
            doc.citation ||
            doc.title ||
            doc.name ||
            doc.documentTitle ||
            'Neznámy dokument',
          source: doc.source || doc.database || '',
          plagId: doc.plagId || doc.plagID || doc.id || '',
          workType: doc.workType || doc.type || '',
          percent: clampNumber(
            Number(doc.percent || doc.score || doc.similarity || 0),
            0,
            100,
          ),
        }))
      : [];

    const passages: SimilarityPassage[] = Array.isArray(data?.passages)
      ? data.passages.map((passage: any, index: number) => ({
          id: passage.id || index + 1,
          paragraph: passage.paragraph || `${index + 1}. odsek`,
          reliability: passage.reliability || '',
          percent: clampNumber(
            Number(passage.percent || passage.score || 0),
            0,
            100,
          ),
          controlledText:
            passage.controlledText ||
            passage.text ||
            passage.inputText ||
            passage.originalText ||
            '',
          matchedText:
            passage.matchedText ||
            passage.sourceText ||
            passage.matchText ||
            '',
          sourceTitle:
            passage.sourceTitle ||
            passage.source ||
            passage.documentTitle ||
            '',
          sourceUrl: passage.sourceUrl || passage.url || '',
          sourceDocNumber: passage.sourceDocNumber,
          reason: passage.reason || passage.comment || '',
        }))
      : [];

    const corpuses: CorpusMatch[] = Array.isArray(data?.corpuses)
      ? data.corpuses.map((item: any) => ({
          name: item.name || item.corpus || 'Neznámy korpus',
          percent: clampNumber(Number(item.percent || item.score || 0), 0, 100),
          count:
            item.count !== undefined && item.count !== null
              ? Number(item.count)
              : undefined,
        }))
      : [
          {
            name: 'Korpus CRZP',
            percent: clampNumber(
              Number(data?.crzpPercent || data?.internalPercent || 0),
              0,
              100,
            ),
            count: data?.crzpCount || data?.internalCount || 0,
          },
          {
            name: 'Internet',
            percent: clampNumber(Number(data?.internetPercent || 0), 0, 100),
            count: data?.internetCount || 0,
          },
          {
            name: 'Wiki',
            percent: clampNumber(Number(data?.wikiPercent || 0), 0, 100),
            count: data?.wikiCount || 0,
          },
          {
            name: 'Slov-Lex',
            percent: clampNumber(Number(data?.slovLexPercent || 0), 0, 100),
            count: data?.slovLexCount || 0,
          },
        ];

    const stats: DictionaryStats = data?.dictionaryStats || {
      extractedChars: data?.extractedChars,
      totalWords: data?.totalWords,
      dictionaryWords: data?.dictionaryWords,
      dictionaryWordsRatio: data?.dictionaryWordsRatio,
      dictionaryLengthSum: data?.dictionaryLengthSum,
      dictionaryLengthRatio: data?.dictionaryLengthRatio,
    };

    const resultId = data?.id || data?.plagId || data?.protocolId || null;

    const score = clampNumber(
      Number(
        data?.score ||
          data?.similarityRiskScore ||
          data?.similarityScore ||
          data?.percent ||
          data?.overallPercent ||
          0,
      ),
      0,
      100,
    );

    return {
      ok: data?.ok ?? true,
      id: resultId,

      score,

      title: data?.title || title || 'Kontrolovaná práca',
      author: data?.author || data?.authorName || authorName || '',
      authorName: data?.authorName || data?.author || authorName || '',
      school: data?.school || school || '',
      faculty: data?.faculty || faculty || '',
      studyProgram: data?.studyProgram || studyProgram || '',
      supervisor: data?.supervisor || supervisor || '',
      workType: data?.workType || workType || '',
      citationStyle: data?.citationStyle || citationStyle || 'ISO 690',
      language: data?.language || language || 'SK',
      createdAt: data?.createdAt || new Date().toISOString(),

      metadataUrl:
        data?.metadataUrl ||
        data?.metadata ||
        (resultId
          ? `https://opac.crzp.sk/?fn=detailBiblioForm&sid=${resultId}`
          : ''),
      webProtocolUrl:
        data?.webProtocolUrl ||
        data?.webprotokol ||
        (resultId ? `https://www.crzp.sk/eprotokol?pid=${resultId}` : ''),
      protocolVersion: data?.protocolVersion || '3.0',

      corpuses,
      dictionaryStats: stats,
      histogram: normalizeHistogram(data?.histogram),
      documents,
      passages,

      summary:
        data?.summary ||
        'Výsledok je orientačná kontrola originality a podobnosti textu.',
      recommendation:
        data?.recommendation ||
        'Skontrolujte označené pasáže, doplňte zdroje, citácie a vlastný autorský komentár.',
      report: data?.report || '',
      plaintext: data?.plaintext || data?.extractedText || text || '',
      extractedText: data?.extractedText || data?.plaintext || text || '',
    };
  }

  async function checkOriginality() {
    setError('');
    setResult(null);

    if (!text.trim() && files.length === 0) {
      setError('Vlož text práce alebo nahraj súbor na kontrolu originality.');
      return;
    }

    if (text.trim() && text.trim().length < 300 && files.length === 0) {
      setError(
        'Text je príliš krátky. Vlož aspoň 300 znakov alebo nahraj súbor.',
      );
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      formData.append('title', title);
      formData.append('author', authorName);
      formData.append('authorName', authorName);
      formData.append('school', school);
      formData.append('faculty', faculty);
      formData.append('studyProgram', studyProgram);
      formData.append('supervisor', supervisor);
      formData.append('workType', workType);
      formData.append('citationStyle', citationStyle);
      formData.append('language', language);
      formData.append('text', text);
      formData.append('agent', 'gemini');
      formData.append('checkAuthenticity', 'true');

      files.forEach((item) => {
        formData.append('files', item.file, item.name);
      });

      const response = await fetch('/api/originality', {
        method: 'POST',
        body: formData,
      });

      const contentType = response.headers.get('content-type') || '';

      if (!contentType.includes('application/json')) {
        const errorText = await response.text();

        throw new Error(
          errorText ||
            'API /api/originality nevrátilo JSON. Skontroluj backend route.',
        );
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || data?.message || 'Kontrola originality zlyhala.',
        );
      }

      setResult(normalizeApiResult(data));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Nastala neznáma chyba pri kontrole originality.',
      );
    } finally {
      setLoading(false);
    }
  }

  function printProtocol() {
    window.print();
  }

  function downloadJson() {
    if (!result) return;

    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: 'application/json;charset=utf-8',
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `protokol-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-[#020617] px-4 py-6 text-white md:px-8">
      <ProtocolPrintStyles />

      <div className="mx-auto max-w-7xl space-y-8">
        <section className="no-print rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30 md:p-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-black text-red-200">
                <ShieldAlert size={18} />
                Protokol
              </div>

              <h1 className="text-4xl font-black tracking-tight md:text-5xl">
                Protokol
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-400 md:text-base">
                Výstup obsahuje štruktúru protokolu: metadata, webprotokol,
                kontrolovaná práca, percento, zhoda v korpusoch, informácie o
                extrahovanom texte, intervaly, histogram, grafy, práce s
                nadprahovou hodnotou podobnosti, detaily zistených podobností a
                plaintext dokumentu na kontrolu.
              </p>

              {result && (
                <div className="mt-4 inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-white">
                  {riskLabel}: {formatPercent(result.score, 2)}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:flex">
              <button
                type="button"
                onClick={printProtocol}
                disabled={!result}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-bold text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Printer size={18} />
                Tlač / PDF
              </button>

              <button
                type="button"
                onClick={downloadJson}
                disabled={!result}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-bold text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowDownToLine size={18} />
                JSON
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="no-print rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <div className="mb-5 flex items-center gap-3">
              <FileText className="text-purple-300" size={26} />
              <div>
                <h2 className="text-2xl font-black">Vstup pre protokol</h2>
                <p className="text-sm text-gray-400">
                  Vyplň údaje a nahraj alebo vlož text práce.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <Input
                label="Názov práce"
                value={title}
                onChange={setTitle}
                placeholder="Napr. Korporátny dizajn malej prevádzky"
              />

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Autor"
                  value={authorName}
                  onChange={setAuthorName}
                  placeholder="Meno autora"
                />

                <Input
                  label="Školiteľ"
                  value={supervisor}
                  onChange={setSupervisor}
                  placeholder="Meno školiteľa"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Škola"
                  value={school}
                  onChange={setSchool}
                  placeholder="Napr. EU Bratislava"
                />

                <Input
                  label="Fakulta"
                  value={faculty}
                  onChange={setFaculty}
                  placeholder="Napr. FM / UDM"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Študijný program"
                  value={studyProgram}
                  onChange={setStudyProgram}
                  placeholder="Napr. masmediálne štúdiá"
                />

                <Input
                  label="Citačná norma"
                  value={citationStyle}
                  onChange={setCitationStyle}
                  placeholder="ISO 690"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <div className="mb-2 text-sm font-semibold text-gray-300">
                    Typ práce
                  </div>

                  <select
                    value={workType}
                    onChange={(event) => setWorkType(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-[#0f1324] px-4 py-4 text-white outline-none focus:border-purple-500"
                  >
                    <option value="bakalárska">bakalárska</option>
                    <option value="magisterská_inžinierska">
                      magisterská_inžinierska
                    </option>
                    <option value="diplomová">diplomová</option>
                    <option value="seminárna">seminárna</option>
                    <option value="dizertačná">dizertačná</option>
                    <option value="rigorózna">rigorózna</option>
                  </select>
                </label>

                <Input
                  label="Jazyk"
                  value={language}
                  onChange={setLanguage}
                  placeholder="SK"
                />
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-black text-white">
                      Nahrať dokument práce
                    </div>
                    <p className="mt-1 text-sm text-gray-400">
                      Podporované: PDF, DOC, DOCX, TXT, RTF, ODT, MD.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-purple-600 px-5 py-3 text-sm font-black text-white hover:bg-purple-500"
                  >
                    <UploadCloud size={18} />
                    Nahrať
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={allowedExtensions.join(',')}
                  className="hidden"
                  onChange={(event) => addFiles(event.target.files)}
                />

                <div
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    addFiles(event.dataTransfer.files);
                  }}
                  className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-5 text-center text-sm text-gray-400"
                >
                  Pretiahni dokument sem alebo klikni na „Nahrať“.
                  <div className="mt-2 text-xs text-gray-500">
                    Max. veľkosť súboru: {maxFileSizeMb} MB.
                  </div>
                </div>

                {fileError && (
                  <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">
                    {fileError}
                  </div>
                )}

                {files.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {files.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0f1324] p-3"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-white">
                            {item.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {item.extension.toUpperCase()} ·{' '}
                            {formatFileSize(item.size)}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFile(item.id)}
                          className="rounded-xl border border-red-500/30 bg-red-500/10 p-2 text-red-200 hover:bg-red-500/20"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <label className="block">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-300">
                    Text práce
                  </div>

                  <div
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      textLength >= 300 || files.length > 0
                        ? 'bg-green-500/10 text-green-300'
                        : 'bg-yellow-500/10 text-yellow-300'
                    }`}
                  >
                    {textLength} znakov
                  </div>
                </div>

                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="Vlož text práce alebo plaintext dokumentu..."
                  className="h-72 w-full rounded-2xl border border-white/10 bg-black/30 p-4 text-sm leading-7 text-white outline-none placeholder:text-gray-600 focus:border-purple-500"
                />
              </label>

              {error && (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={checkOriginality}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-600 to-orange-600 px-6 py-4 font-black text-white shadow-lg shadow-red-950/30 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Generujem protokol...
                  </>
                ) : (
                  <>
                    <Search size={20} />
                    Vygenerovať protokol
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 md:p-6">
            {!result ? <EmptyPreview /> : <ProtocolDocument result={result} />}
          </div>
        </section>
      </div>
    </main>
  );
}

// =====================================================
// PROTOCOL DOCUMENT
// =====================================================

function ProtocolDocument({ result }: { result: OriginalityResult }) {
  return (
    <article className="protocol-paper">
      <ProtocolPageHeader result={result} page={1} />

      <h1 className="protocol-main-title">Protokol</h1>

      <h2 className="protocol-title">Protokolokontroleoriginality</h2>

      <ProtocolMetadata result={result} />

      <ProtocolControlledWork result={result} />

      <ProtocolCorpusGraph result={result} />

      <ProtocolExtractedTextInfo result={result} />

      <ProtocolIntervalGraph />

      <ProtocolWordHistogram result={result} />

      <ProtocolDocuments result={result} />

      <ProtocolSimilarityDetails result={result} />

      <ProtocolPlaintext result={result} />
    </article>
  );
}

function ProtocolPageHeader({
  result,
  page,
}: {
  result: OriginalityResult;
  page: number;
}) {
  return (
    <div className="protocol-page-line">
      {formatProtocolDate(result.createdAt)} (verzia{' '}
      {result.protocolVersion || '3.0'}) - {page > 1 ? `${page} - ` : ''}
      www.crzp.sk/vysvetlivky30.pdf
    </div>
  );
}

function ProtocolMetadata({ result }: { result: OriginalityResult }) {
  return (
    <section className="protocol-meta-links">
      <div>
        <strong>metadata</strong>
        {result.metadataUrl ? `: ${result.metadataUrl}` : ''}
      </div>
      <div>
        <strong>webprotokol</strong>
        {result.webProtocolUrl ? `: ${result.webProtocolUrl}` : ''}
      </div>
    </section>
  );
}

function ProtocolControlledWork({ result }: { result: OriginalityResult }) {
  return (
    <section className="protocol-section">
      <table className="protocol-main-table">
        <thead>
          <tr>
            <th colSpan={2}>Kontrolovanápráca</th>
            <th>Percento*</th>
          </tr>
          <tr>
            <th>Citácia</th>
            <th />
            <th />
          </tr>
        </thead>

        <tbody>
          <tr>
            <td colSpan={2}>
              <strong>{result.title || 'Kontrolovaná práca'}</strong>
              {result.supervisor && <> / - školiteľ {result.supervisor}</>}
              <br />

              {result.author && <>autor: {result.author}; </>}
              {result.faculty && <>{result.faculty}. - </>}
              {result.school && <>{result.school}. - </>}
              {result.createdAt && (
                <>{new Date(result.createdAt).getFullYear()}.</>
              )}

              <br />

              {result.id && <>plagID: {result.id} </>}
              {result.workType && <>typ práce: {result.workType} </>}
              {result.school && <>zdroj: {result.school}</>}
            </td>

            <td className="protocol-big-percent">
              {formatPercent(result.score, 2)}
              <ProtocolRedBlocks value={result.score} />
            </td>
          </tr>

          <tr>
            <td colSpan={3} className="protocol-note-cell">
              *Číslo vyjadruje percentuálny podiel textu, ktorý má prekryv s
              indexom prác korpusu CRZP. Intervaly grafického zvýraznenia
              prekryvu sú nastavené na [0-20, 21-40, 41-60, 61-80, 81-100].
            </td>
          </tr>

          <tr>
            <td colSpan={3} className="protocol-corpuses">
              <strong>Zhoda v korpusoch: </strong>
              {getProtocolCorpuses(result)
                .map(
                  (item) =>
                    `${item.name}:${formatPercent(item.percent, 2)}${
                      typeof item.count === 'number' ? ` (${item.count})` : ''
                    }`,
                )
                .join(', ')}
            </td>
          </tr>
        </tbody>
      </table>

      <ProtocolPercentScale value={result.score} />
    </section>
  );
}

function ProtocolPercentScale({ value }: { value: number }) {
  const safeValue = clampNumber(value, 0, 100);

  return (
    <div className="protocol-scale-wrap">
      <div className="protocol-scale-title">Grafické zvýraznenie prekryvu</div>

      <div className="protocol-scale">
        <div className="protocol-scale-segment is-s1">0-20</div>
        <div className="protocol-scale-segment is-s2">21-40</div>
        <div className="protocol-scale-segment is-s3">41-60</div>
        <div className="protocol-scale-segment is-s4">61-80</div>
        <div className="protocol-scale-segment is-s5">81-100</div>
        <div
          className="protocol-scale-pointer"
          style={{ left: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}

function ProtocolCorpusGraph({ result }: { result: OriginalityResult }) {
  const corpuses = getProtocolCorpuses(result);

  return (
    <section className="protocol-section">
      <h2>Graf zhody v korpusoch</h2>

      <table className="protocol-graph-table">
        <tbody>
          {corpuses.map((item) => (
            <tr key={item.name}>
              <td className="protocol-graph-label">{item.name}</td>
              <td>
                <div className="protocol-bar-line">
                  <span
                    className={getCorpusBarClass(item.percent)}
                    style={{ width: `${clampNumber(item.percent, 0, 100)}%` }}
                  />
                </div>
              </td>
              <td className="protocol-graph-value">
                {formatPercent(item.percent, 2)}
                {typeof item.count === 'number' ? ` (${item.count})` : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function ProtocolExtractedTextInfo({ result }: { result: OriginalityResult }) {
  const stats = result.dictionaryStats || {};

  return (
    <section className="protocol-section">
      <h2>Informácieoextrahovanomtextedodanomnakontrolu</h2>

      <table className="protocol-info-table">
        <tbody>
          <tr>
            <td>Dĺžka extrahovaného textu v znakoch:</td>
            <td>{numberOrDash(stats.extractedChars)}</td>
            <td>Celkový počet slov textu:</td>
            <td>{numberOrDash(stats.totalWords)}</td>
          </tr>

          <tr>
            <td>Počet slov v slovníku (SK, CZ, EN, HU, DE):</td>
            <td>{numberOrDash(stats.dictionaryWords)}</td>
            <td>Pomer počtu slovníkových slov:</td>
            <td>
              {typeof stats.dictionaryWordsRatio === 'number'
                ? formatPercent(stats.dictionaryWordsRatio, 1)
                : '-'}
            </td>
          </tr>

          <tr>
            <td>Súčet dĺžky slov v slovníku (SK, CZ, EN, HU, DE):</td>
            <td>{numberOrDash(stats.dictionaryLengthSum)}</td>
            <td>Pomer dĺžky slovníkových slov:</td>
            <td>
              {typeof stats.dictionaryLengthRatio === 'number'
                ? formatPercent(stats.dictionaryLengthRatio, 1)
                : '-'}
            </td>
          </tr>
        </tbody>
      </table>

      <table className="protocol-interval-table">
        <tbody>
          <tr>
            <th>Interval</th>
            {intervalRows.map((row) => (
              <td key={row.interval}>{row.interval}</td>
            ))}
          </tr>

          <tr>
            <th>Vplyv na KO*</th>
            {intervalRows.map((row) => (
              <td key={row.effect}>{row.effect}</td>
            ))}
          </tr>
        </tbody>
      </table>

      <p className="protocol-small-note">
        *Kontrola originality je výrazne oplyvnená kvalitou dodaného textu.
        Slovníkový test vyjadruje mieru zhody slov kontrolovanej práce so
        slovníkom referenčných slov podporovaných jazykov. Nízka zhoda môže byť
        spôsobená: nepodporovaný jazyk, chyba prevodu PDF alebo úmyselná
        manipulácia textu. Text práce na vizuálnu kontrolu je na konci
        protokolu.
      </p>
    </section>
  );
}

function ProtocolIntervalGraph() {
  return (
    <section className="protocol-section">
      <h2>Graf vplyvu slovníkového testu na KO*</h2>

      <div className="protocol-interval-graph">
        {intervalRows.map((row, index) => (
          <div key={row.interval} className="protocol-interval-box">
            <div className={`protocol-interval-color interval-${index + 1}`} />
            <div className="protocol-interval-text">
              <strong>{row.interval}</strong>
              <span>{row.effect}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProtocolWordHistogram({ result }: { result: OriginalityResult }) {
  const histogram =
    result.histogram && result.histogram.length > 0
      ? result.histogram
      : Array.from({ length: 23 }).map((_, index) => ({
          length: index + 3,
          deviation: index === 6 ? '>>' : '=',
          count: 0,
        }));

  const maxCount = Math.max(
    1,
    ...histogram.map((item) => Number(item.count || 0)),
  );

  return (
    <section className="protocol-section">
      <h2>Početnosť slov-histogram</h2>

      <table className="protocol-histogram-table">
        <tbody>
          <tr>
            <th>Dĺžka slova</th>
            {histogram.map((item) => (
              <td key={`length-${item.length}`}>{item.length}</td>
            ))}
          </tr>

          <tr>
            <th>Indik. odchylka</th>
            {histogram.map((item) => (
              <td
                key={`deviation-${item.length}`}
                className={
                  item.deviation === '>>'
                    ? 'is-more-cell'
                    : item.deviation === '<<'
                      ? 'is-less-cell'
                      : ''
                }
              >
                {item.deviation || getDeviationFromCount(item.count)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      <div className="protocol-histogram-graph">
        {histogram.map((item) => {
          const height = Math.max(
            4,
            Math.round((Number(item.count || 0) / maxCount) * 56),
          );

          return (
            <div key={`graph-${item.length}`} className="protocol-histogram-col">
              <div className="protocol-histogram-number">
                {Number(item.count || 0)}
              </div>
              <div
                className={`protocol-histogram-bar ${
                  item.deviation === '>>'
                    ? 'is-more'
                    : item.deviation === '<<'
                      ? 'is-less'
                      : ''
                }`}
                style={{ height }}
              />
              <span>{item.length}</span>
            </div>
          );
        })}
      </div>

      <p className="protocol-small-note">
        *Odchýlky od priemerných hodnôt početnosti slov. Profil početností slov
        je počítaný pre korpus slovenských prác. Značka &quot;&gt;&gt;&quot;
        indikuje výrazne viac slov danej dĺžky ako priemer a značka
        &quot;&lt;&lt;&quot; výrazne menej slov danej dĺžky ako priemer.
        Výrazné odchylky môžu indikovať manipuláciu textu. Je potrebné
        skontrolovať &quot;plaintext&quot;! Priveľa krátkych slov indikuje
        vkladanie oddelovačov, alebo znakov netradičného kódovania. Priveľa
        dlhých slov indikuje vkladanie bielych znakov, prípadne iný jazyk
        práce.
      </p>
    </section>
  );
}

function ProtocolDocuments({ result }: { result: OriginalityResult }) {
  const documents = result.documents || [];

  return (
    <section className="protocol-section protocol-page-break-avoid">
      <h2>Prácesnadprahovouhodnotoupodobnosti</h2>

      <table className="protocol-documents-table">
        <thead>
          <tr>
            <th>Dok.</th>
            <th>Citácia</th>
            <th>Percento*</th>
          </tr>
        </thead>

        <tbody>
          {documents.length === 0 ? (
            <tr>
              <td colSpan={3}>
                Neboli vrátené žiadne práce s nadprahovou hodnotou podobnosti.
              </td>
            </tr>
          ) : (
            documents.map((doc, index) => (
              <tr key={`${doc.citation}-${index}`}>
                <td>{doc.order || index + 1}</td>

                <td>
                  <strong>{doc.citation}</strong>
                  <br />
                  <span className="protocol-doc-meta">
                    {doc.plagId && <>plagID: {doc.plagId} </>}
                    {doc.workType && <>typ práce: {doc.workType} </>}
                    {doc.source && <>zdroj: {doc.source}</>}
                  </span>
                </td>

                <td className="protocol-percent-cell">
                  {formatPercent(doc.percent, 2)}
                  <ProtocolRedBlocks value={doc.percent} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <p className="protocol-small-note">
        *Číslo vyjadruje percentuálny prekryv testovaného dokumentu len s
        dokumentom uvedeným v príslušnom riadku.
      </p>

      <p className="protocol-small-note">
        :Dokument má prekryv s veľkým počtom dokumentov. Zoznam dokumentov je
        krátený a usporiadaný podľa percenta zostupne. Celkový počet dokumentov
        je [{documents.length}]. V prípade veľkého počtu je často príčinou zhoda
        v texte, ktorý je predpísaný pre daný typ práce položky tabuliek,
        záhlavia, poďakovania. Vo výpise dokumentov sa preferujú dokumenty,
        ktoré do výsledku prinášajú nový odsek. Pri prekročení maxima počtu
        prezentovateľných dokumentov sa v zarážke zobrazuje znak ∞.
      </p>
    </section>
  );
}

function ProtocolSimilarityDetails({ result }: { result: OriginalityResult }) {
  const passages = result.passages || [];

  return (
    <section className="protocol-section">
      <h2>Detaily-zistenépodobnosti</h2>

      {passages.length === 0 ? (
        <p className="protocol-empty">
          Backend zatiaľ nevrátil konkrétne zistené podobnosti. API musí vrátiť
          pole passages s controlledText, matchedText a reliability.
        </p>
      ) : (
        <div className="protocol-passages">
          {passages.map((passage, index) => (
            <article
              key={`${passage.paragraph}-${index}`}
              className="protocol-passage"
            >
              <h3>
                {index + 1}. odsek : spoľahlivosť [
                {passage.reliability ||
                  (typeof passage.percent === 'number'
                    ? formatPercent(passage.percent, 0)
                    : 'orientačná')}
                ]
              </h3>

              <ProtocolHighlightedText text={passage.controlledText} />

              {passage.matchedText && (
                <div className="protocol-source-text">
                  <strong>Zdrojový / zhodný text:</strong>
                  <ProtocolHighlightedText text={passage.matchedText} />
                </div>
              )}

              {(passage.sourceTitle || passage.sourceUrl || passage.reason) && (
                <div className="protocol-passage-meta">
                  {passage.sourceTitle && (
                    <>
                      Zdroj: <strong>{passage.sourceTitle}</strong>
                      <br />
                    </>
                  )}

                  {passage.sourceUrl && (
                    <>
                      URL: {passage.sourceUrl}
                      <br />
                    </>
                  )}

                  {passage.reason && (
                    <>
                      Dôvod: {passage.reason}
                      <br />
                    </>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ProtocolPlaintext({ result }: { result: OriginalityResult }) {
  const plaintext = result.plaintext || result.extractedText || '';

  return (
    <section className="protocol-section protocol-plaintext-section">
      <div className="protocol-plaintext-count">11-</div>

      <h2>Plaintext dokumentunakontrolu</h2>

      <p className="protocol-small-note">
        Skontroluje extrahovaný text práce na konci protokolu! Plaintext čistý
        text - extrahovaný text dokumentuje základom pre textový analyzátor.
        Tento text môže byť poškodený úmyselne vkladaním znakov, používaním
        neštandardných znakových sád alebo neúmyselne napr. pri konverzii na PDF
        nekvalitným programom. Nepoškodený text je čitateľný, slová sú správne
        oddelené, diakritické znaky sú správne, množstvo textu je primerané
        rozsahu práce.
      </p>

      <div className="protocol-plaintext">
        {plaintext ? (
          <ProtocolHighlightedText text={plaintext.slice(0, 70000)} />
        ) : (
          'Plaintext nebol vrátený z API.'
        )}
      </div>

      <div className="protocol-end-links">
        <div>metadata:{result.metadataUrl || ''}</div>
        <div>webprotokol:{result.webProtocolUrl || ''}</div>
      </div>
    </section>
  );
}

// =====================================================
// EMPTY PREVIEW
// =====================================================

function EmptyPreview() {
  return (
    <div className="no-print flex min-h-[760px] flex-col items-center justify-center rounded-[2rem] border border-dashed border-white/15 bg-black/20 p-8 text-center">
      <FileSearch className="mb-5 text-gray-500" size={54} />

      <h2 className="text-2xl font-black">Náhľad protokolu</h2>

      <p className="mt-3 max-w-xl text-sm leading-7 text-gray-400">
        Po kontrole sa zobrazí výsledok s názvom Protokol a kompletnou
        štruktúrou podľa vzoru protokolu originality.
      </p>

      <div className="mt-8 grid w-full max-w-xl gap-3 sm:grid-cols-3">
        <PreviewBox icon={<Percent size={22} />} title="Percento" />
        <PreviewBox icon={<BarChart3 size={22} />} title="Grafy" />
        <PreviewBox icon={<AlertTriangle size={22} />} title="Pasáže" />
      </div>
    </div>
  );
}

function PreviewBox({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex justify-center text-purple-300">{icon}</div>
      <div className="text-sm font-black">{title}</div>
    </div>
  );
}

// =====================================================
// SMALL COMPONENTS
// =====================================================

function ProtocolHighlightedText({ text }: { text: string }) {
  const parts = splitMarkers(text);

  return (
    <p className="protocol-highlighted-text">
      {parts.map((part, index) => {
        if (part.type === 'marker') {
          return (
            <span key={`${part.value}-${index}`} className="protocol-marker">
              {part.value}
            </span>
          );
        }

        if (part.type === 'highlight') {
          return (
            <mark
              key={`${part.value}-${index}`}
              className="protocol-highlight"
            >
              {part.value}
            </mark>
          );
        }

        return <span key={`${part.value}-${index}`}>{part.value}</span>;
      })}
    </p>
  );
}

function splitMarkers(text: string) {
  const regex = /(\[[^\]]*(?:»|«)[^\]]*\]|<mark>.*?<\/mark>)/g;
  const rawParts = String(text || '').split(regex).filter(Boolean);

  return rawParts.map((part) => {
    if (/^\[[^\]]*(?:»|«)[^\]]*\]$/.test(part)) {
      return {
        type: 'marker',
        value: part,
      };
    }

    if (part.startsWith('<mark>') && part.endsWith('</mark>')) {
      return {
        type: 'highlight',
        value: part.replace('<mark>', '').replace('</mark>', ''),
      };
    }

    return {
      type: 'text',
      value: part,
    };
  });
}

function ProtocolRedBlocks({ value }: { value: number }) {
  const filled = Math.max(1, Math.min(5, Math.ceil(Number(value || 0) / 20)));

  return (
    <div className="protocol-red-blocks" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((block) => (
        <span
          key={block}
          className={block <= filled ? 'is-filled' : undefined}
        />
      ))}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-semibold text-gray-300">{label}</div>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-[#0f1324] px-4 py-4 text-white outline-none placeholder:text-gray-600 focus:border-purple-500"
      />
    </label>
  );
}

function getProtocolCorpuses(result: OriginalityResult) {
  const incoming =
    result.corpuses && result.corpuses.length > 0
      ? result.corpuses
      : defaultCorpuses;

  const map = new Map<string, CorpusMatch>();

  defaultCorpuses.forEach((item) => {
    map.set(item.name.toLowerCase(), item);
  });

  incoming.forEach((item) => {
    const normalizedName = item.name.toLowerCase();

    if (normalizedName.includes('crzp') || normalizedName.includes('korpus')) {
      map.set('korpus crzp', {
        ...item,
        name: 'Korpus CRZP',
      });
      return;
    }

    if (normalizedName.includes('internet')) {
      map.set('internet', {
        ...item,
        name: 'Internet',
      });
      return;
    }

    if (normalizedName.includes('wiki')) {
      map.set('wiki', {
        ...item,
        name: 'Wiki',
      });
      return;
    }

    if (normalizedName.includes('slov')) {
      map.set('slov-lex', {
        ...item,
        name: 'Slov-Lex',
      });
      return;
    }

    map.set(item.name.toLowerCase(), item);
  });

  return Array.from(map.values()).slice(0, 8);
}

function getCorpusBarClass(value: number) {
  const percent = clampNumber(value, 0, 100);

  if (percent >= 60) return 'protocol-bar-fill is-high';
  if (percent >= 40) return 'protocol-bar-fill is-medium-high';
  if (percent >= 20) return 'protocol-bar-fill is-medium';
  return 'protocol-bar-fill is-low';
}

function formatPercent(value: number, digits = 2) {
  return `${Number(value || 0).toFixed(digits).replace('.', ',')}%`;
}

function formatProtocolDate(value?: string) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleDateString('sk-SK');
  }

  return date.toLocaleDateString('sk-SK');
}

function numberOrDash(value: unknown) {
  if (value === undefined || value === null || value === '') return '-';

  if (typeof value === 'number') {
    return new Intl.NumberFormat('sk-SK').format(value);
  }

  return String(value);
}

function getDeviationFromCount(count?: number) {
  if (!count) return '=';
  if (count > 20) return '>>';
  if (count < 2) return '<<';
  return '=';
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number(value || 0)));
}

// =====================================================
// CSS
// =====================================================

function ProtocolPrintStyles() {
  return (
    <style jsx global>{`
      .protocol-paper {
        width: 100%;
        max-width: 860px;
        margin: 0 auto;
        background: #ffffff;
        color: #000000;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 10.5px;
        line-height: 1.25;
        padding: 30px 36px;
        box-shadow: 0 22px 80px rgba(0, 0, 0, 0.42);
      }

      .protocol-page-line {
        text-align: left;
        color: #111111;
        font-size: 10px;
        margin-bottom: 8px;
      }

      .protocol-main-title {
        margin: 4px 0 4px;
        text-align: center;
        font-size: 22px;
        font-weight: 900;
        letter-spacing: -0.3px;
      }

      .protocol-title {
        margin: 4px 0 12px;
        text-align: center;
        font-size: 18px;
        font-weight: 800;
        letter-spacing: -0.2px;
      }

      .protocol-meta-links {
        margin-bottom: 10px;
        font-size: 10px;
        line-height: 1.4;
        word-break: break-all;
      }

      .protocol-section {
        margin-top: 14px;
      }

      .protocol-section h2 {
        margin: 0 0 6px;
        font-size: 12.5px;
        font-weight: 800;
      }

      .protocol-main-table,
      .protocol-info-table,
      .protocol-interval-table,
      .protocol-histogram-table,
      .protocol-documents-table,
      .protocol-graph-table {
        width: 100%;
        border-collapse: collapse;
        color: #000000;
      }

      .protocol-main-table th,
      .protocol-main-table td,
      .protocol-info-table td,
      .protocol-interval-table th,
      .protocol-interval-table td,
      .protocol-histogram-table th,
      .protocol-histogram-table td,
      .protocol-documents-table th,
      .protocol-documents-table td,
      .protocol-graph-table td {
        border: 1px solid #777777;
        padding: 4px 5px;
        vertical-align: top;
      }

      .protocol-main-table th,
      .protocol-documents-table th {
        background: #f3f3f3;
        font-weight: 800;
        text-align: left;
      }

      .protocol-main-table th:nth-child(3),
      .protocol-main-table td:nth-child(3) {
        width: 88px;
        text-align: center;
      }

      .protocol-big-percent {
        font-size: 17px;
        font-weight: 800;
        text-align: center;
        color: #dc2626;
      }

      .protocol-note-cell {
        font-size: 9.5px;
        color: #111111;
      }

      .protocol-corpuses {
        font-size: 10px;
      }

      .protocol-red-blocks {
        display: flex;
        justify-content: center;
        gap: 3px;
        margin-top: 5px;
      }

      .protocol-red-blocks span {
        display: block;
        width: 8px;
        height: 8px;
        border: 1px solid #ef4444;
        background: #fee2e2;
      }

      .protocol-red-blocks span.is-filled {
        background: #ef4444;
      }

      .protocol-scale-wrap {
        margin-top: 8px;
        border: 1px solid #777777;
        padding: 5px;
      }

      .protocol-scale-title {
        font-size: 9.5px;
        font-weight: 800;
        margin-bottom: 4px;
      }

      .protocol-scale {
        position: relative;
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        height: 24px;
        border: 1px solid #777777;
      }

      .protocol-scale-segment {
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 8.5px;
        border-right: 1px solid #777777;
      }

      .protocol-scale-segment:last-child {
        border-right: 0;
      }

      .protocol-scale-segment.is-s1 {
        background: #fff1f2;
      }

      .protocol-scale-segment.is-s2 {
        background: #ffe4e6;
      }

      .protocol-scale-segment.is-s3 {
        background: #fecdd3;
      }

      .protocol-scale-segment.is-s4 {
        background: #fda4af;
      }

      .protocol-scale-segment.is-s5 {
        background: #fb7185;
      }

      .protocol-scale-pointer {
        position: absolute;
        top: -6px;
        width: 2px;
        height: 36px;
        background: #000000;
        transform: translateX(-1px);
      }

      .protocol-scale-pointer::before {
        content: '';
        position: absolute;
        top: -3px;
        left: -4px;
        width: 0;
        height: 0;
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
        border-bottom: 6px solid #000000;
      }

      .protocol-graph-table td {
        border-color: #888888;
      }

      .protocol-graph-label {
        width: 160px;
        font-weight: 800;
      }

      .protocol-graph-value {
        width: 95px;
        text-align: right;
        font-weight: 800;
      }

      .protocol-bar-line {
        position: relative;
        height: 14px;
        border: 1px solid #777777;
        background: #ffffff;
        overflow: hidden;
      }

      .protocol-bar-fill {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        display: block;
        background: repeating-linear-gradient(
          90deg,
          #ef4444,
          #ef4444 6px,
          #fee2e2 6px,
          #fee2e2 10px
        );
      }

      .protocol-bar-fill.is-high {
        background: repeating-linear-gradient(
          90deg,
          #dc2626,
          #dc2626 6px,
          #fecaca 6px,
          #fecaca 10px
        );
      }

      .protocol-bar-fill.is-medium-high {
        background: repeating-linear-gradient(
          90deg,
          #f97316,
          #f97316 6px,
          #fed7aa 6px,
          #fed7aa 10px
        );
      }

      .protocol-bar-fill.is-medium {
        background: repeating-linear-gradient(
          90deg,
          #eab308,
          #eab308 6px,
          #fef3c7 6px,
          #fef3c7 10px
        );
      }

      .protocol-bar-fill.is-low {
        background: repeating-linear-gradient(
          90deg,
          #16a34a,
          #16a34a 6px,
          #dcfce7 6px,
          #dcfce7 10px
        );
      }

      .protocol-info-table td {
        width: 25%;
      }

      .protocol-interval-table {
        margin-top: 8px;
      }

      .protocol-interval-table th {
        width: 100px;
        background: #f3f3f3;
        text-align: left;
      }

      .protocol-interval-table td {
        text-align: center;
      }

      .protocol-interval-graph {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        border: 1px solid #777777;
      }

      .protocol-interval-box {
        border-right: 1px solid #777777;
      }

      .protocol-interval-box:last-child {
        border-right: 0;
      }

      .protocol-interval-color {
        height: 20px;
      }

      .interval-1 {
        background: #f3f4f6;
      }

      .interval-2 {
        background: #fee2e2;
      }

      .interval-3 {
        background: #fecaca;
      }

      .interval-4 {
        background: #fca5a5;
      }

      .interval-5 {
        background: #f87171;
      }

      .protocol-interval-text {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        padding: 4px 2px;
        font-size: 9px;
      }

      .protocol-small-note {
        margin: 5px 0 0;
        font-size: 9.4px;
        color: #222222;
      }

      .protocol-histogram-table th {
        width: 88px;
        background: #f3f3f3;
        text-align: left;
      }

      .protocol-histogram-table td {
        width: 24px;
        text-align: center;
        font-size: 9px;
        padding: 3px 2px;
      }

      .protocol-histogram-table td.is-more-cell {
        background: #fee2e2;
        color: #991b1b;
        font-weight: 800;
      }

      .protocol-histogram-table td.is-less-cell {
        background: #ffedd5;
        color: #9a3412;
        font-weight: 800;
      }

      .protocol-histogram-graph {
        display: flex;
        align-items: flex-end;
        gap: 3px;
        height: 92px;
        margin-top: 8px;
        border: 1px solid #777777;
        padding: 14px 6px 16px;
        background: linear-gradient(
          to top,
          #ffffff,
          #ffffff 24%,
          #f8fafc 24%,
          #f8fafc 25%,
          #ffffff 25%,
          #ffffff 49%,
          #f8fafc 49%,
          #f8fafc 50%,
          #ffffff 50%,
          #ffffff 74%,
          #f8fafc 74%,
          #f8fafc 75%,
          #ffffff 75%
        );
      }

      .protocol-histogram-col {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-end;
        height: 100%;
        position: relative;
      }

      .protocol-histogram-col span {
        position: absolute;
        bottom: -13px;
        font-size: 7.5px;
      }

      .protocol-histogram-number {
        position: absolute;
        top: -12px;
        font-size: 7px;
        color: #475569;
      }

      .protocol-histogram-bar {
        width: 100%;
        min-width: 4px;
        background: #cfcfcf;
        border: 1px solid #777777;
      }

      .protocol-histogram-bar.is-more {
        background: #ef4444;
      }

      .protocol-histogram-bar.is-less {
        background: #fed7aa;
      }

      .protocol-documents-table th:nth-child(1),
      .protocol-documents-table td:nth-child(1) {
        width: 38px;
        text-align: center;
        font-weight: 800;
      }

      .protocol-documents-table th:nth-child(3),
      .protocol-documents-table td:nth-child(3) {
        width: 90px;
        text-align: center;
      }

      .protocol-doc-meta {
        font-size: 9.4px;
        color: #222222;
      }

      .protocol-percent-cell {
        font-weight: 800;
        color: #dc2626;
      }

      .protocol-empty {
        border: 1px solid #777777;
        padding: 6px;
        font-size: 10px;
      }

      .protocol-passages {
        display: grid;
        gap: 12px;
      }

      .protocol-passage {
        page-break-inside: avoid;
        break-inside: avoid;
        border-top: 1px solid #cccccc;
        padding-top: 6px;
      }

      .protocol-passage h3 {
        margin: 0 0 5px;
        font-size: 11px;
        font-weight: 800;
      }

      .protocol-highlighted-text {
        margin: 0;
        white-space: pre-wrap;
        font-size: 10.2px;
        line-height: 1.36;
      }

      .protocol-marker {
        display: inline-block;
        margin: 0 1px;
        padding: 0 2px;
        background: #ef4444;
        color: #ffffff;
        font-weight: 800;
      }

      .protocol-highlight {
        background: #fee2e2;
        color: #991b1b;
        padding: 0 2px;
      }

      .protocol-source-text {
        margin-top: 6px;
        padding-top: 5px;
        border-top: 1px solid #cccccc;
      }

      .protocol-passage-meta {
        margin-top: 5px;
        font-size: 9.5px;
        color: #222222;
      }

      .protocol-plaintext-section {
        margin-top: 18px;
        page-break-before: always;
        break-before: page;
      }

      .protocol-plaintext-count {
        font-size: 11px;
        font-weight: 800;
        margin-bottom: 4px;
      }

      .protocol-plaintext {
        margin-top: 8px;
        border-top: 1px solid #777777;
        padding-top: 8px;
      }

      .protocol-end-links {
        margin-top: 16px;
        font-size: 9.5px;
        word-break: break-all;
      }

      .protocol-page-break-avoid {
        page-break-inside: avoid;
        break-inside: avoid;
      }

      @media (max-width: 900px) {
        .protocol-paper {
          padding: 22px 16px;
        }

        .protocol-histogram-table {
          font-size: 8px;
        }

        .protocol-histogram-table td {
          padding: 2px 1px;
        }

        .protocol-interval-graph {
          grid-template-columns: 1fr;
        }

        .protocol-interval-box {
          border-right: 0;
          border-bottom: 1px solid #777777;
        }

        .protocol-interval-box:last-child {
          border-bottom: 0;
        }
      }

      @media print {
        @page {
          size: A4;
          margin: 12mm;
        }

        html,
        body {
          background: #ffffff !important;
        }

        body * {
          visibility: hidden;
        }

        .protocol-paper,
        .protocol-paper * {
          visibility: visible;
        }

        .protocol-paper {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          max-width: none;
          margin: 0;
          padding: 0;
          box-shadow: none;
          background: #ffffff !important;
          color: #000000 !important;
        }

        .no-print {
          display: none !important;
        }
      }
    `}</style>
  );
}