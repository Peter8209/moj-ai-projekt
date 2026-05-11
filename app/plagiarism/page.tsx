'use client';

import { useRef, useState } from 'react';
import {
  ArrowUpRight,
  FileText,
  Loader2,
  Search,
  Trash2,
  UploadCloud,
} from 'lucide-react';

const STORAGE_KEY = 'zedpera_originality_protocol_result';

type UploadedFile = {
  id: string;
  file: File;
  name: string;
  size: number;
  extension: string;
};

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

export default function OriginalityPage() {
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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [lastResult, setLastResult] = useState<any | null>(null);

  const textLength = text.trim().length;

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
          (item) => item.name === file.name && item.size === file.size,
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

  function openProtocolInNewWindow(result: any) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(result));

    const protocolWindow = window.open(
      '/originality/protocol',
      '_blank',
      'noopener,noreferrer,width=1300,height=900',
    );

    if (!protocolWindow) {
      setError(
        'Prehliadač zablokoval nové okno. Povoľ vyskakovacie okná alebo klikni na tlačidlo „Otvoriť posledný protokol“.',
      );
    }
  }

  async function checkOriginality() {
    setError('');
    setLastResult(null);

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

      const normalizedResult = normalizeProtocolResult(data);

      setLastResult(normalizedResult);
      openProtocolInNewWindow(normalizedResult);
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

  function openLastProtocol() {
    if (!lastResult) {
      const stored = window.localStorage.getItem(STORAGE_KEY);

      if (!stored) {
        setError('Zatiaľ nie je uložený žiadny protokol.');
        return;
      }
    }

    window.open(
      '/originality/protocol',
      '_blank',
      'noopener,noreferrer,width=1300,height=900',
    );
  }

  return (
    <main className="min-h-screen bg-[#020617] px-4 py-6 text-white md:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30 md:p-8">
          <div className="mb-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-black text-red-200">
              <FileText size={18} />
              Kontrola originality
            </div>

            <h1 className="text-4xl font-black tracking-tight md:text-5xl">
              Protokol originality
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-400 md:text-base">
              Po vygenerovaní sa protokol automaticky otvorí v novom okne cez
              komponent <strong>OriginalityProtocolView</strong> vrátane grafov,
              histogramu, percent, tabuliek a plaintextu.
            </p>
          </div>

          <div className="space-y-5">
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
                placeholder="Napr. manažment"
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

            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
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
                    Vygenerovať protokol v novom okne
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={openLastProtocol}
                className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-6 py-4 font-black text-white hover:bg-white/15"
              >
                <ArrowUpRight size={20} />
                Otvoriť posledný
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
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

function normalizeProtocolResult(data: any) {
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

  const plaintext = data?.plaintext || data?.extractedText || '';

  return {
    ok: data?.ok ?? true,
    id: resultId,

    score,

    title: data?.title || 'Kontrolovaná práca',
    author: data?.author || data?.authorName || '',
    authorName: data?.authorName || data?.author || '',
    school: data?.school || '',
    faculty: data?.faculty || '',
    studyProgram: data?.studyProgram || '',
    supervisor: data?.supervisor || '',
    workType: data?.workType || '',
    citationStyle: data?.citationStyle || 'ISO 690',
    language: data?.language || 'SK',
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

    corpuses: normalizeCorpuses(data),
    dictionaryStats: data?.dictionaryStats || createDictionaryStats(plaintext),
    histogram: normalizeHistogram(data?.histogram, plaintext),
    documents: normalizeDocuments(data),
    passages: normalizePassages(data),

    summary:
      data?.summary ||
      'Výsledok je orientačná kontrola originality a podobnosti textu.',
    recommendation:
      data?.recommendation ||
      'Skontrolujte označené pasáže, doplňte zdroje, citácie a vlastný autorský komentár.',
    report: data?.report || '',
    plaintext,
    extractedText: plaintext,
  };
}

function normalizeCorpuses(data: any) {
  if (Array.isArray(data?.corpuses) && data.corpuses.length > 0) {
    return data.corpuses.map((item: any) => ({
      name: item.name || item.corpus || 'Neznámy korpus',
      percent: clampNumber(Number(item.percent || item.score || 0), 0, 100),
      count:
        item.count !== undefined && item.count !== null
          ? Number(item.count)
          : undefined,
    }));
  }

  return [
    {
      name: 'Korpus CRZP',
      percent: clampNumber(
        Number(data?.crzpPercent || data?.internalPercent || data?.score || 0),
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
}

function normalizeDocuments(data: any) {
  if (!Array.isArray(data?.documents)) return [];

  return data.documents.map((doc: any, index: number) => ({
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
  }));
}

function normalizePassages(data: any) {
  if (!Array.isArray(data?.passages)) return [];

  return data.passages.map((passage: any, index: number) => ({
    id: passage.id || index + 1,
    paragraph: passage.paragraph || `${index + 1}. odsek`,
    reliability: passage.reliability || '',
    percent: clampNumber(Number(passage.percent || passage.score || 0), 0, 100),
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
  }));
}

function normalizeHistogram(value: unknown, fallbackText: string) {
  const computed = createHistogramFromText(fallbackText);

  if (!Array.isArray(value) || value.length === 0) {
    return computed;
  }

  const mapped = value.map((item: any, index: number) => ({
    length: Number(item?.length || item?.wordLength || index + 3),
    count: Number(item?.count || item?.value || 0),
    deviation: item?.deviation || item?.indicator || '=',
  }));

  const hasAnyCount = mapped.some((item) => Number(item.count || 0) > 0);

  if (!hasAnyCount) {
    return computed;
  }

  const completed = [...mapped];
  const lengths = new Set(mapped.map((item) => item.length));

  for (let length = 3; length <= 25; length += 1) {
    if (!lengths.has(length)) {
      const fallback = computed.find((item) => item.length === length);

      completed.push({
        length,
        count: fallback?.count || 0,
        deviation: fallback?.deviation || '=',
      });
    }
  }

  return completed
    .filter((item) => item.length >= 3 && item.length <= 25)
    .sort((a, b) => a.length - b.length);
}

function createHistogramFromText(text: string) {
  const words = String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/[.,;:!?()[\]{}"'„“”‘’<>/\\|+=*_~`^%$#@]/g, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

  const counts = new Map<number, number>();

  for (const word of words) {
    const length = word.length;

    if (length >= 3 && length <= 25) {
      counts.set(length, (counts.get(length) || 0) + 1);
    }
  }

  const values = Array.from({ length: 23 }).map((_, index) => {
    const length = index + 3;
    return counts.get(length) || 0;
  });

  const average =
    values.length > 0
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : 0;

  return Array.from({ length: 23 }).map((_, index) => {
    const length = index + 3;
    const count = counts.get(length) || 0;

    let deviation: '=' | '>>' | '<<' = '=';

    if (average > 0 && count > average * 1.9) deviation = '>>';
    if (average > 0 && count < average * 0.25) deviation = '<<';

    return {
      length,
      count,
      deviation,
    };
  });
}

function createDictionaryStats(text: string) {
  const cleanWords = String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/[.,;:!?()[\]{}"'„“”‘’<>/\\|+=*_~`^%$#@]/g, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

  const dictionaryWords = cleanWords.filter((word) =>
    /^[A-Za-zÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽáäčďéíĺľňóôŕšťúýžÜÖÄüöäßÉÈÊÀÙÇÑñ]+$/.test(
      word,
    ),
  );

  const dictionaryLengthSum = dictionaryWords.reduce(
    (sum, word) => sum + word.length,
    0,
  );

  const allLengthSum = cleanWords.reduce((sum, word) => sum + word.length, 0);

  return {
    extractedChars: text.length,
    totalWords: cleanWords.length,
    dictionaryWords: dictionaryWords.length,
    dictionaryWordsRatio:
      cleanWords.length > 0
        ? Number(((dictionaryWords.length / cleanWords.length) * 100).toFixed(1))
        : 0,
    dictionaryLengthSum,
    dictionaryLengthRatio:
      allLengthSum > 0
        ? Number(((dictionaryLengthSum / allLengthSum) * 100).toFixed(1))
        : 0,
  };
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number(value || 0)));
}