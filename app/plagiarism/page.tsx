'use client';

import { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownToLine,
  CheckCircle2,
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

type OriginalityResult = {
  ok?: boolean;
  score: number;
  title?: string;
  author?: string;
  school?: string;
  workType?: string;
  createdAt?: string;
  corpuses: CorpusMatch[];
  dictionaryStats?: DictionaryStats;
  documents: SimilarDocument[];
  passages: SimilarityPassage[];
  summary?: string;
  recommendation?: string;
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

// =====================================================
// PAGE
// =====================================================

export default function PlagiarismPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [school, setSchool] = useState('');
  const [workType, setWorkType] = useState('Bakalárska práca');
  const [text, setText] = useState('');

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [fileError, setFileError] = useState('');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OriginalityResult | null>(null);
  const [error, setError] = useState('');

  const textLength = text.trim().length;

  const riskLevel = useMemo(() => {
    if (!result) return null;

    if (result.score >= 50) {
      return {
        label: 'Vysoká podobnosť',
        color: 'text-red-300',
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
      };
    }

    if (result.score >= 25) {
      return {
        label: 'Stredná podobnosť',
        color: 'text-yellow-300',
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/30',
      };
    }

    return {
      label: 'Nízka podobnosť',
      color: 'text-green-300',
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
    };
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
            `Súbor "${file.name}" má nepodporovaný formát. Povolené sú PDF, Word, TXT, RTF, ODT a MD.`,
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

  function normalizeApiResult(data: any): OriginalityResult {
    const documents: SimilarDocument[] = Array.isArray(data?.documents)
      ? data.documents.map((doc: any, index: number) => ({
          order: doc.order || index + 1,
          citation:
            doc.citation ||
            doc.title ||
            doc.name ||
            doc.documentTitle ||
            'Neznámy dokument',
          source: doc.source || doc.database || '',
          plagId: doc.plagId || doc.plagID || doc.id || '',
          workType: doc.workType || doc.type || '',
          percent: Number(doc.percent || doc.score || doc.similarity || 0),
        }))
      : [];

    const issues = Array.isArray(data?.issues) ? data.issues : [];

    const passages: SimilarityPassage[] = Array.isArray(data?.passages)
      ? data.passages.map((passage: any, index: number) => ({
          id: passage.id || index + 1,
          paragraph: passage.paragraph || `${index + 1}. odsek`,
          reliability: passage.reliability || '',
          percent: Number(passage.percent || passage.score || 0),
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
      : issues.map((issue: any, index: number) => ({
          id: index + 1,
          paragraph: issue.paragraph || `${index + 1}. odsek`,
          reliability: issue.reliability || '',
          percent: Number(issue.percent || issue.score || 0),
          controlledText: issue.text || issue.controlledText || '',
          matchedText: issue.reason || issue.matchedText || '',
          sourceTitle: issue.sourceTitle || issue.source || 'Neznámy zdroj',
          sourceUrl: issue.sourceUrl || '',
          reason: issue.reason || '',
        }));

    const corpuses: CorpusMatch[] = Array.isArray(data?.corpuses)
      ? data.corpuses.map((item: any) => ({
          name: item.name || item.corpus || 'Neznámy korpus',
          percent: Number(item.percent || item.score || 0),
          count: item.count,
        }))
      : [
          {
            name: 'Interná databáza / korpus prác',
            percent: Number(data?.internalPercent || data?.crzpPercent || 0),
            count: data?.internalCount,
          },
          {
            name: 'Internet',
            percent: Number(data?.internetPercent || 0),
            count: data?.internetCount,
          },
          {
            name: 'Wiki / verejné zdroje',
            percent: Number(data?.wikiPercent || 0),
            count: data?.wikiCount,
          },
        ];

    return {
      ok: data?.ok ?? true,
      score: Number(
        data?.score ||
          data?.similarityScore ||
          data?.percent ||
          data?.overallPercent ||
          0,
      ),
      title: data?.title || title || 'Kontrolovaná práca',
      author: data?.author || author || '',
      school: data?.school || school || '',
      workType: data?.workType || workType || '',
      createdAt: data?.createdAt || new Date().toISOString(),
      corpuses,
      dictionaryStats: data?.dictionaryStats || {
        extractedChars: data?.extractedChars,
        totalWords: data?.totalWords,
        dictionaryWords: data?.dictionaryWords,
        dictionaryWordsRatio: data?.dictionaryWordsRatio,
        dictionaryLengthSum: data?.dictionaryLengthSum,
        dictionaryLengthRatio: data?.dictionaryLengthRatio,
      },
      documents,
      passages,
      summary:
        data?.summary ||
        'Výsledok predstavuje orientačnú kontrolu podobnosti textu s dostupnými dokumentmi a zdrojmi.',
      recommendation:
        data?.recommendation ||
        'Skontrolujte zvýraznené pasáže, doplňte citácie, upravte parafrázy vlastnými slovami a overte správnosť uvedenia zdrojov.',
    };
  }

  async function checkPlagiarism() {
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
      formData.append('author', author);
      formData.append('school', school);
      formData.append('workType', workType);
      formData.append('text', text);

      files.forEach((item) => {
        formData.append('files', item.file, item.name);
      });

      const response = await fetch('/api/plagiarism', {
        method: 'POST',
        body: formData,
      });

      const contentType = response.headers.get('content-type') || '';

      if (!contentType.includes('application/json')) {
        const errorText = await response.text();

        throw new Error(
          errorText ||
            'API /api/plagiarism nevrátilo JSON. Skontroluj backend route.',
        );
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || data?.message || 'Kontrola originality zlyhala.',
        );
      }

      const normalized = normalizeApiResult(data);

      setResult(normalized);
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
    link.download = `protokol-originality-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-[#020617] px-4 py-6 text-white md:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30 md:p-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-black text-red-200">
                <ShieldAlert size={18} />
                Kontrola originality z priloženej práce
              </div>

              <h1 className="text-4xl font-black tracking-tight md:text-5xl">
                Protokol kontroly originality
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-400 md:text-base">
                Nahraj prácu alebo vlož text. Systém odošle dokument na backend
                a vygeneruje protokol s percentom podobnosti, zoznamom
                podobných dokumentov a konkrétnymi zhodnými pasážami.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:flex">
              <button
                type="button"
                onClick={printProtocol}
                disabled={!result}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-bold text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Printer size={18} />
                Tlač
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

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <div className="mb-5 flex items-center gap-3">
              <FileText className="text-purple-300" size={26} />
              <div>
                <h2 className="text-2xl font-black">Kontrolovaná práca</h2>
                <p className="text-sm text-gray-400">
                  Vyplň údaje a vlož text alebo nahraj súbor.
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
                  value={author}
                  onChange={setAuthor}
                  placeholder="Meno autora"
                />

                <Input
                  label="Škola / fakulta"
                  value={school}
                  onChange={setSchool}
                  placeholder="Napr. TUKE"
                />
              </div>

              <label className="block">
                <div className="mb-2 text-sm font-semibold text-gray-300">
                  Typ práce
                </div>

                <select
                  value={workType}
                  onChange={(event) => setWorkType(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#0f1324] px-4 py-4 text-white outline-none focus:border-purple-500"
                >
                  <option>Bakalárska práca</option>
                  <option>Diplomová práca</option>
                  <option>Seminárna práca</option>
                  <option>Dizertačná práca</option>
                  <option>Rigorózna práca</option>
                  <option>Odborný článok</option>
                </select>
              </label>

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
                  Pretiahni sem dokument alebo klikni na tlačidlo „Nahrať“.
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
                  placeholder="Vlož text práce, kapitolu alebo celý plaintext z dokumentu..."
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
                onClick={checkPlagiarism}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-600 to-orange-600 px-6 py-4 font-black text-white shadow-lg shadow-red-950/30 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Analyzujem originalitu...
                  </>
                ) : (
                  <>
                    <Search size={20} />
                    Skontrolovať originalitu
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            {!result ? (
              <EmptyPreview />
            ) : (
              <div className="space-y-6">
                <div
                  className={`rounded-[2rem] border p-6 ${
                    riskLevel?.bg || 'bg-white/5'
                  } ${riskLevel?.border || 'border-white/10'}`}
                >
                  <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                    <div>
                      <div className="text-sm font-black uppercase tracking-[0.18em] text-gray-400">
                        Výsledok
                      </div>

                      <h2 className="mt-2 text-3xl font-black">
                        {riskLevel?.label}
                      </h2>

                      <p className="mt-3 text-sm leading-7 text-gray-300">
                        {result.summary}
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <div className="text-sm text-gray-400">Podobnosť</div>
                      <div
                        className={`mt-1 text-6xl font-black ${
                          riskLevel?.color || 'text-white'
                        }`}
                      >
                        {formatPercent(result.score)}
                      </div>
                    </div>
                  </div>
                </div>

                <ProtocolMeta result={result} />

                <CorpusSection corpuses={result.corpuses} />

                <DictionarySection stats={result.dictionaryStats} />

                <SimilarDocumentsSection documents={result.documents} />

                <PassagesSection passages={result.passages} />

                <Recommendation text={result.recommendation} />
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

// =====================================================
// EMPTY PREVIEW
// =====================================================

function EmptyPreview() {
  return (
    <div className="flex min-h-[760px] flex-col items-center justify-center rounded-[2rem] border border-dashed border-white/15 bg-black/20 p-8 text-center">
      <FileSearch className="mb-5 text-gray-500" size={54} />

      <h2 className="text-2xl font-black">Náhľad protokolu originality</h2>

      <p className="mt-3 max-w-xl text-sm leading-7 text-gray-400">
        Po kontrole sa tu zobrazí protokol vytvorený z priloženej práce:
        celkové percento, korpusy, dokumenty nad prahom podobnosti a presné
        zhodné pasáže.
      </p>

      <div className="mt-8 grid w-full max-w-xl gap-3 sm:grid-cols-3">
        <PreviewBox icon={<Percent size={22} />} title="Percento" />
        <PreviewBox icon={<FileText size={22} />} title="Dokumenty" />
        <PreviewBox icon={<AlertTriangle size={22} />} title="Pasáže" />
      </div>
    </div>
  );
}

function PreviewBox({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex justify-center text-purple-300">{icon}</div>
      <div className="text-sm font-black">{title}</div>
    </div>
  );
}

// =====================================================
// RESULT SECTIONS
// =====================================================

function ProtocolMeta({ result }: { result: OriginalityResult }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#0f1324] p-6">
      <div className="mb-5 flex items-center gap-3">
        <FileText className="text-purple-300" size={24} />
        <h3 className="text-2xl font-black">Kontrolovaná práca</h3>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <MetaRow label="Názov" value={result.title || 'Nezadané'} />
        <MetaRow label="Autor" value={result.author || 'Nezadané'} />
        <MetaRow label="Škola" value={result.school || 'Nezadané'} />
        <MetaRow label="Typ práce" value={result.workType || 'Nezadané'} />
        <MetaRow
          label="Dátum kontroly"
          value={
            result.createdAt
              ? new Date(result.createdAt).toLocaleString('sk-SK')
              : 'Nezadané'
          }
        />
      </div>
    </section>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-xs font-black uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="mt-1 font-bold text-white">{value}</div>
    </div>
  );
}

function CorpusSection({ corpuses }: { corpuses: CorpusMatch[] }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#0f1324] p-6">
      <h3 className="mb-5 text-2xl font-black">Zhoda v korpusoch</h3>

      {corpuses.length === 0 ? (
        <EmptyResult text="API zatiaľ nevrátilo zhody v korpusoch." />
      ) : (
        <div className="space-y-4">
          {corpuses.map((item) => (
            <div key={item.name}>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <div className="font-bold text-white">
                  {item.name}
                  {typeof item.count === 'number' && (
                    <span className="ml-2 text-gray-500">({item.count})</span>
                  )}
                </div>

                <div className="font-black text-red-300">
                  {formatPercent(item.percent)}
                </div>
              </div>

              <ProgressBar value={item.percent} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function DictionarySection({ stats }: { stats?: DictionaryStats }) {
  if (!stats) return null;

  const rows = [
    {
      label: 'Dĺžka extrahovaného textu v znakoch',
      value: stats.extractedChars,
    },
    {
      label: 'Celkový počet slov textu',
      value: stats.totalWords,
    },
    {
      label: 'Počet slov v slovníku',
      value: stats.dictionaryWords,
    },
    {
      label: 'Pomer počtu slovníkových slov',
      value:
        typeof stats.dictionaryWordsRatio === 'number'
          ? `${formatPercent(stats.dictionaryWordsRatio)}`
          : undefined,
    },
    {
      label: 'Súčet dĺžky slov v slovníku',
      value: stats.dictionaryLengthSum,
    },
    {
      label: 'Pomer dĺžky slovníkových slov',
      value:
        typeof stats.dictionaryLengthRatio === 'number'
          ? `${formatPercent(stats.dictionaryLengthRatio)}`
          : undefined,
    },
  ].filter(
    (row) => row.value !== undefined && row.value !== null && row.value !== '',
  );

  if (rows.length === 0) return null;

  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#0f1324] p-6">
      <h3 className="mb-5 text-2xl font-black">
        Informácie o extrahovanom texte
      </h3>

      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="rounded-2xl border border-white/10 bg-black/20 p-4"
          >
            <div className="text-xs font-black uppercase tracking-wide text-gray-500">
              {row.label}
            </div>
            <div className="mt-1 text-lg font-black text-white">
              {row.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SimilarDocumentsSection({
  documents,
}: {
  documents: SimilarDocument[];
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#0f1324] p-6">
      <h3 className="mb-5 text-2xl font-black">
        Práce s nadprahovou hodnotou podobnosti
      </h3>

      {documents.length === 0 ? (
        <EmptyResult text="API zatiaľ nevrátilo zoznam podobných dokumentov. Backend musí porovnať prácu s databázou dokumentov, internetom alebo vlastným korpusom." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-separate border-spacing-y-3">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-3">Dok.</th>
                <th className="px-3">Citácia / zdroj</th>
                <th className="px-3 text-right">Percento</th>
              </tr>
            </thead>

            <tbody>
              {documents.map((doc, index) => (
                <tr key={`${doc.citation}-${index}`} className="align-top">
                  <td className="rounded-l-2xl border-y border-l border-white/10 bg-black/20 px-3 py-4 font-black">
                    {doc.order || index + 1}
                  </td>

                  <td className="border-y border-white/10 bg-black/20 px-3 py-4">
                    <div className="font-bold text-white">{doc.citation}</div>

                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-400">
                      {doc.plagId && (
                        <span className="rounded-full bg-white/10 px-2 py-1">
                          plagID: {doc.plagId}
                        </span>
                      )}

                      {doc.workType && (
                        <span className="rounded-full bg-white/10 px-2 py-1">
                          typ: {doc.workType}
                        </span>
                      )}

                      {doc.source && (
                        <span className="rounded-full bg-white/10 px-2 py-1">
                          zdroj: {doc.source}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="rounded-r-2xl border-y border-r border-white/10 bg-black/20 px-3 py-4 text-right">
                    <div className="text-xl font-black text-red-300">
                      {formatPercent(doc.percent)}
                    </div>

                    <div className="mt-2">
                      <MiniBlocks value={doc.percent} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function PassagesSection({ passages }: { passages: SimilarityPassage[] }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#0f1324] p-6">
      <h3 className="mb-5 text-2xl font-black">Detaily zistených podobností</h3>

      {passages.length === 0 ? (
        <EmptyResult text="API zatiaľ nevrátilo konkrétne podobné pasáže. Backend musí vrátiť pole passages s controlledText a matchedText." />
      ) : (
        <div className="space-y-5">
          {passages.map((passage, index) => (
            <article
              key={`${passage.paragraph}-${index}`}
              className="overflow-hidden rounded-3xl border border-white/10 bg-black/20"
            >
              <div className="flex flex-col justify-between gap-3 border-b border-white/10 bg-white/5 p-4 md:flex-row md:items-center">
                <div>
                  <div className="text-lg font-black">
                    {passage.paragraph || `${index + 1}. odsek`}
                  </div>

                  <div className="mt-1 text-sm text-gray-400">
                    Zdroj:{' '}
                    <span className="font-semibold text-white">
                      {passage.sourceTitle || 'Neznámy zdroj'}
                    </span>
                    {passage.sourceDocNumber && (
                      <span className="ml-2 text-gray-500">
                        dokument č. {passage.sourceDocNumber}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {passage.reliability && (
                    <Badge label={`spoľahlivosť ${passage.reliability}`} />
                  )}

                  {typeof passage.percent === 'number' &&
                    passage.percent > 0 && (
                      <Badge label={formatPercent(passage.percent)} danger />
                    )}
                </div>
              </div>

              <div className="grid gap-0 md:grid-cols-2">
                <div className="border-b border-white/10 p-5 md:border-b-0 md:border-r">
                  <div className="mb-3 text-sm font-black uppercase tracking-wide text-purple-300">
                    Text kontrolovanej práce
                  </div>

                  <HighlightedText text={passage.controlledText} />
                </div>

                <div className="p-5">
                  <div className="mb-3 text-sm font-black uppercase tracking-wide text-red-300">
                    Zhodná / podobná pasáž zo zdroja
                  </div>

                  {passage.matchedText ? (
                    <HighlightedText text={passage.matchedText} />
                  ) : (
                    <p className="text-sm leading-7 text-gray-500">
                      Zdrojová pasáž nebola v odpovedi API vrátená.
                    </p>
                  )}
                </div>
              </div>

              {passage.reason && (
                <div className="border-t border-white/10 bg-red-500/5 p-4 text-sm leading-7 text-red-100">
                  <strong>Upozornenie:</strong> {passage.reason}
                </div>
              )}

              {passage.sourceUrl && (
                <div className="border-t border-white/10 p-4 text-sm">
                  <a
                    href={passage.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-300 underline underline-offset-4"
                  >
                    Otvoriť zdroj
                  </a>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function Recommendation({ text }: { text?: string }) {
  if (!text) return null;

  return (
    <section className="rounded-[2rem] border border-green-500/30 bg-green-500/10 p-6">
      <div className="mb-3 flex items-center gap-2 text-green-300">
        <CheckCircle2 size={22} />
        <h3 className="text-2xl font-black">Odporúčanie</h3>
      </div>

      <p className="text-sm leading-7 text-green-100">{text}</p>
    </section>
  );
}

// =====================================================
// SMALL COMPONENTS
// =====================================================

function EmptyResult({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm leading-7 text-gray-400">
      {text}
    </div>
  );
}

function HighlightedText({ text }: { text: string }) {
  const parts = splitMarkers(text);

  return (
    <p className="whitespace-pre-wrap text-sm leading-8 text-gray-200">
      {parts.map((part, index) => {
        if (part.type === 'marker') {
          return (
            <span
              key={`${part.value}-${index}`}
              className="mx-1 rounded bg-red-500 px-1.5 py-0.5 text-xs font-black text-white"
            >
              {part.value}
            </span>
          );
        }

        if (part.type === 'highlight') {
          return (
            <mark
              key={`${part.value}-${index}`}
              className="rounded bg-red-500/30 px-1 py-0.5 text-red-50"
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
  const rawParts = text.split(regex).filter(Boolean);

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

function ProgressBar({ value }: { value: number }) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div className="h-3 overflow-hidden rounded-full bg-white/10">
      <div
        className={`h-full rounded-full ${
          safeValue >= 50
            ? 'bg-red-500'
            : safeValue >= 25
              ? 'bg-yellow-500'
              : 'bg-green-500'
        }`}
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}

function MiniBlocks({ value }: { value: number }) {
  const filled = Math.max(1, Math.min(5, Math.ceil(value / 20)));

  return (
    <div className="flex justify-end gap-1">
      {[1, 2, 3, 4, 5].map((block) => (
        <span
          key={block}
          className={`h-3 w-3 rounded-sm border border-red-400/60 ${
            block <= filled ? 'bg-red-500' : 'bg-red-500/10'
          }`}
        />
      ))}
    </div>
  );
}

function Badge({ label, danger }: { label: string; danger?: boolean }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ${
        danger ? 'bg-red-500/15 text-red-200' : 'bg-white/10 text-gray-200'
      }`}
    >
      {label}
    </span>
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

function formatPercent(value: number) {
  return `${Number(value || 0).toFixed(2).replace('.', ',')}%`;
}