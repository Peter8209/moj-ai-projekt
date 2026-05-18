'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Download,
  FileDown,
  FileSpreadsheet,
  FileText,
  Info,
  Printer,
  Table2,
  X,
} from 'lucide-react';

import AnalysisCharts from './AnalysisCharts';
import AnalysisTable from './AnalysisTable';
import type { AnalysisResult } from './analysisTypes';

type Props = {
  open: boolean;
  result: AnalysisResult | null;
  onClose: () => void;
};

type ModalTab = 'summary' | 'text' | 'tables' | 'charts' | 'tests' | 'sources';

type TabItem = {
  key: ModalTab;
  label: string;
  icon: React.ReactNode;
};

type TableLike = {
  title?: string;
  description?: string;
  columns?: Array<{
    key: string;
    label?: string;
  }>;
  rows?: Array<Record<string, any>>;
};

function safeArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function cleanText(value: unknown) {
  return String(value || '')
    .replace(/\uFEFF/g, '')
    .replace(/\u200B/g, '')
    .replace(/\u200C/g, '')
    .replace(/\u200D/g, '')
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/```[a-zA-Z]*\n?/g, '')
    .replace(/```/g, '')
    .replace(/^\s*[-*_]{3,}\s*$/gm, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function normalizeSourcesText(value: unknown) {
  const cleaned = cleanText(value);

  if (!cleaned) return '';

  return cleaned
    .replace(
      /A\.\s*Detegované\s+zdroje\s+z\s+extrahovaného\s+textu/gi,
      'A. Zdroje nájdené v priložených dokumentoch',
    )
    .replace(
      /Detegované\s+zdroje\s+z\s+extrahovaného\s+textu/gi,
      'Zdroje nájdené v priložených dokumentoch',
    )
    .replace(
      /A\.\s*Zdroje\s+z\s+extrahovaného\s+textu/gi,
      'A. Zdroje nájdené v priložených dokumentoch',
    )
    .replace(
      /Zdroje\s+z\s+extrahovaného\s+textu/gi,
      'Zdroje nájdené v priložených dokumentoch',
    )
    .trim();
}

function getTitle(result: AnalysisResult | null) {
  return cleanText((result as any)?.title || 'Výsledky analýzy dát');
}

function getSummary(result: AnalysisResult | null) {
  if (!result) return '';

  return cleanText(
    (result as any).summary ||
      (result as any).dataDescription ||
      (result as any).description ||
      '',
  );
}

function getPracticalText(result: AnalysisResult | null) {
  if (!result) return '';

  return cleanText((result as any).practicalText || '');
}

function getInterpretationText(result: AnalysisResult | null) {
  if (!result) return '';

  return cleanText((result as any).interpretation || '');
}

function getResultText(result: AnalysisResult | null) {
  if (!result) return '';

  const interpretation = getInterpretationText(result);
  const practicalText = getPracticalText(result);

  if (interpretation || practicalText) {
    return cleanText(
      [
        interpretation ? `Interpretácia výsledkov\n${interpretation}` : '',
        practicalText
          ? `Text do praktickej časti práce\n${practicalText}`
          : '',
      ]
        .filter(Boolean)
        .join('\n\n'),
    );
  }

  const candidates = [
    (result as any).fullText,
    (result as any).fullResult,
    (result as any).text,
    (result as any).output,
    (result as any).result,
    (result as any).summary,
  ];

  const value = candidates.find((item) => cleanText(item).length > 0);

  return cleanText(value || '');
}

function getSourcesText(result: AnalysisResult | null) {
  if (!result) return '';

  const candidates = [
    (result as any).sources,
    (result as any).sourceText,
    (result as any).bibliography,
    (result as any).formattedSources,
    (result as any).usedSources,
    (result as any).references,
  ];

  const value = candidates.find((item) => cleanText(item).length > 0);

  return normalizeSourcesText(value || '');
}

function getVariables(result: AnalysisResult | null) {
  return safeArray<any>(
    (result as any)?.variables || (result as any)?.detectedVariables,
  );
}

function getFrequencies(result: AnalysisResult | null) {
  return safeArray<TableLike>(
    (result as any)?.frequencies ||
      (result as any)?.frequencyTables ||
      (result as any)?.frequency_tables,
  );
}

function getRecommendedTests(result: AnalysisResult | null) {
  return safeArray<any>(
    (result as any)?.recommendedTests ||
      (result as any)?.tests ||
      (result as any)?.recommended_tests,
  );
}

function getRecommendedCharts(result: AnalysisResult | null) {
  return safeArray<any>(
    (result as any)?.recommendedCharts ||
      (result as any)?.charts ||
      (result as any)?.recommended_charts,
  );
}

function getExcelTables(result: AnalysisResult | null) {
  return safeArray<TableLike>(
    (result as any)?.excelTables ||
      (result as any)?.tables ||
      (result as any)?.excel_tables,
  );
}

function getDescriptiveStatistics(result: AnalysisResult | null) {
  return safeArray<TableLike>(
    (result as any)?.descriptiveStatistics ||
      (result as any)?.descriptive_statistics ||
      (result as any)?.statistics,
  );
}

function getHypothesisTests(result: AnalysisResult | null) {
  return safeArray<any>(
    (result as any)?.hypothesisTests ||
      (result as any)?.hypothesis_tests ||
      (result as any)?.testResults,
  );
}

function getSelectedAnalyses(result: AnalysisResult | null) {
  return safeArray<any>(
    (result as any)?.selectedAnalyses || (result as any)?.selected_analyses,
  );
}

function htmlEscape(value: string) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatCellValue(value: unknown) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function getTableColumns(table: TableLike) {
  if (Array.isArray(table.columns) && table.columns.length > 0) {
    return table.columns.map((column) => ({
      key: column.key,
      label: column.label || column.key,
    }));
  }

  const firstRow = table.rows?.[0];

  if (!firstRow) return [];

  return Object.keys(firstRow).map((key) => ({
    key,
    label: key,
  }));
}

function tableToText(table: TableLike, fallbackTitle: string) {
  const title = cleanText(table.title || fallbackTitle);
  const description = cleanText(table.description || '');
  const rows = safeArray<Record<string, any>>(table.rows);
  const columns = getTableColumns(table);

  if (rows.length === 0 || columns.length === 0) {
    return cleanText([title, description, 'Tabuľka neobsahuje riadky.'].join('\n'));
  }

  const header = columns.map((column) => column.label).join('\t');

  const body = rows
    .map((row) =>
      columns
        .map((column) => formatCellValue(row[column.key]).replace(/\s+/g, ' '))
        .join('\t'),
    )
    .join('\n');

  return cleanText([title, description, header, body].filter(Boolean).join('\n'));
}

function buildTablesExportBlock(result: AnalysisResult | null) {
  const descriptiveStatistics = getDescriptiveStatistics(result);
  const frequencies = getFrequencies(result);
  const excelTables = getExcelTables(result);

  const blocks: string[] = [];

  if (descriptiveStatistics.length > 0) {
    blocks.push('Deskriptívna štatistika');
    descriptiveStatistics.forEach((table, index) => {
      blocks.push(tableToText(table, `Deskriptívna štatistika ${index + 1}`));
    });
  }

  if (frequencies.length > 0) {
    blocks.push('Frekvenčná analýza');
    frequencies.forEach((table, index) => {
      blocks.push(tableToText(table, table.title || `Frekvenčná tabuľka ${index + 1}`));
    });
  }

  const remainingExcelTables = excelTables.filter((table) => {
    const title = cleanText(table.title);
    const isDuplicateDescriptive = descriptiveStatistics.some(
      (item) => cleanText(item.title) === title,
    );
    const isDuplicateFrequency = frequencies.some(
      (item) => cleanText(item.title) === title,
    );

    return !isDuplicateDescriptive && !isDuplicateFrequency;
  });

  if (remainingExcelTables.length > 0) {
    blocks.push('Excel tabuľky');
    remainingExcelTables.forEach((table, index) => {
      blocks.push(tableToText(table, table.title || `Excel tabuľka ${index + 1}`));
    });
  }

  return cleanText(blocks.join('\n\n'));
}

function buildChartsExportBlock(result: AnalysisResult | null) {
  const recommendedCharts = getRecommendedCharts(result);

  if (recommendedCharts.length === 0) return '';

  return cleanText(
    [
      'Odporúčané grafy',
      ...recommendedCharts.map((chart: any, index) => {
        const title = getObjectTitle(chart, `Graf ${index + 1}`);
        const description = getObjectDescription(chart);
        const type = chart?.type ? `Typ grafu: ${chart.type}` : '';
        const sourceTable = chart?.sourceTable
          ? `Zdrojová tabuľka: ${chart.sourceTable}`
          : '';
        const variables = Array.isArray(chart?.variables)
          ? `Premenné: ${chart.variables.join(', ')}`
          : '';

        return cleanText(
          [title, type, sourceTable, variables, description].filter(Boolean).join('\n'),
        );
      }),
    ].join('\n\n'),
  );
}

function buildTestsExportBlock(result: AnalysisResult | null) {
  const recommendedTests = getRecommendedTests(result);
  const hypothesisTests = getHypothesisTests(result);

  const blocks: string[] = [];

  if (recommendedTests.length > 0) {
    blocks.push('Odporúčané testy hypotéz');

    recommendedTests.forEach((item: any, index) => {
      const title = getObjectTitle(item, `Odporúčaný test ${index + 1}`);
      const description = getObjectDescription(item);
      const test = item?.test ? `Test: ${item.test}` : '';
      const variables = Array.isArray(item?.variables)
        ? `Premenné: ${item.variables.join(', ')}`
        : '';
      const reason = item?.reason ? `Odôvodnenie: ${item.reason}` : '';

      blocks.push(
        cleanText([title, test, variables, description, reason].filter(Boolean).join('\n')),
      );
    });
  }

  if (hypothesisTests.length > 0) {
    blocks.push('Výsledky testovania hypotéz');

    hypothesisTests.forEach((item: any, index) => {
      const title = getObjectTitle(item, `Hypotéza / test ${index + 1}`);
      const description = getObjectDescription(item);
      const test = item?.test ? `Test: ${item.test}` : '';
      const variables = Array.isArray(item?.variables)
        ? `Premenné: ${item.variables.join(', ')}`
        : '';
      const reason = item?.reason ? `Odôvodnenie: ${item.reason}` : '';

      blocks.push(
        cleanText([title, test, variables, description, reason].filter(Boolean).join('\n')),
      );
    });
  }

  return cleanText(blocks.join('\n\n'));
}

function createExportText(result: AnalysisResult | null) {
  if (!result) return '';

  const title = getTitle(result);
  const summary = getSummary(result);
  const warnings = safeArray<string>((result as any)?.warnings);
  const resultText = getResultText(result);
  const tablesBlock = buildTablesExportBlock(result);
  const chartsBlock = buildChartsExportBlock(result);
  const testsBlock = buildTestsExportBlock(result);
  const sourcesText = getSourcesText(result);

  const warningsBlock = warnings.length
    ? `Upozornenia:\n${warnings.map((item) => `- ${item}`).join('\n')}`
    : '';

  return cleanText(
    [
      title,
      '',
      summary ? `Súhrn\n${summary}` : '',
      '',
      warningsBlock,
      '',
      resultText ? `Interpretácia a text do praktickej časti\n${resultText}` : '',
      '',
      tablesBlock,
      '',
      chartsBlock,
      '',
      testsBlock,
      '',
      sourcesText
        ? `Použité zdroje a autori\n\n${sourcesText}`
        : `Použité zdroje a autori

A. Zdroje nájdené v priložených dokumentoch
Zdroje neboli dodané alebo sa ich nepodarilo overene načítať.

B. Formátované bibliografické záznamy
Údaj je potrebné overiť.

C. Varianty odkazov v texte
Údaj je potrebné overiť.

D. Priložené dokumenty použité ako podklad
Údaj je potrebné overiť.`,
    ]
      .filter(Boolean)
      .join('\n\n'),
  );
}

function createDocHtml(title: string, result: AnalysisResult | null) {
  const exportText = createExportText(result);
  const descriptiveStatistics = getDescriptiveStatistics(result);
  const frequencies = getFrequencies(result);
  const recommendedTests = getRecommendedTests(result);
  const hypothesisTests = getHypothesisTests(result);

  const paragraphs = cleanText(exportText)
    .split('\n')
    .map((line) => {
      if (!line.trim()) return '<p>&nbsp;</p>';

      const isHeading =
        /^(Súhrn|Interpretácia a text do praktickej časti|Interpretácia výsledkov|Text do praktickej časti práce|Použité zdroje a autori|Upozornenia|Tabuľky|Grafy|Testy|Deskriptívna štatistika|Frekvenčná analýza|Odporúčané grafy|Odporúčané testy hypotéz|Výsledky testovania hypotéz|Excel tabuľky)$/i.test(
          line.trim(),
        );

      if (isHeading) {
        return `<h2>${htmlEscape(line)}</h2>`;
      }

      return `<p>${htmlEscape(line)}</p>`;
    })
    .join('');

  const htmlTables = [
    ...descriptiveStatistics.map((table, index) =>
      createHtmlTable(table, `Deskriptívna štatistika ${index + 1}`),
    ),
    ...frequencies.map((table, index) =>
      createHtmlTable(table, table.title || `Frekvenčná tabuľka ${index + 1}`),
    ),
  ].join('');

  const testsHtml = [...recommendedTests, ...hypothesisTests]
    .map((item: any, index) => {
      const testTitle = getObjectTitle(item, `Test ${index + 1}`);
      const description = getObjectDescription(item);
      const test = item?.test ? `<p><strong>Test:</strong> ${htmlEscape(item.test)}</p>` : '';
      const variables = Array.isArray(item?.variables)
        ? `<p><strong>Premenné:</strong> ${htmlEscape(item.variables.join(', '))}</p>`
        : '';

      return `
        <div class="test-card">
          <h3>${htmlEscape(testTitle)}</h3>
          ${test}
          ${variables}
          ${description ? `<p>${htmlEscape(description)}</p>` : ''}
        </div>
      `;
    })
    .join('');

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${htmlEscape(title)}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #111827;
      padding: 40px;
    }

    h1 {
      font-size: 22pt;
      margin-bottom: 24px;
    }

    h2 {
      font-size: 16pt;
      margin: 26px 0 12px;
      page-break-after: avoid;
    }

    h3 {
      font-size: 13pt;
      margin: 18px 0 8px;
      page-break-after: avoid;
    }

    p {
      margin: 0 0 11px 0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0 28px;
      font-size: 10pt;
      page-break-inside: avoid;
    }

    th,
    td {
      border: 1px solid #d1d5db;
      padding: 7px 8px;
      vertical-align: top;
      text-align: left;
    }

    th {
      background: #f3f4f6;
      font-weight: bold;
    }

    .table-description {
      color: #4b5563;
      margin-bottom: 8px;
    }

    .test-card {
      border: 1px solid #d1d5db;
      padding: 12px;
      margin: 10px 0;
      border-radius: 8px;
    }
  </style>
</head>
<body>
  <h1>${htmlEscape(title)}</h1>
  ${paragraphs}
  ${htmlTables ? `<h2>Tabuľky v štruktúrovanom formáte</h2>${htmlTables}` : ''}
  ${testsHtml ? `<h2>Testy v štruktúrovanom formáte</h2>${testsHtml}` : ''}
</body>
</html>
`;
}

function createHtmlTable(table: TableLike, fallbackTitle: string) {
  const title = cleanText(table.title || fallbackTitle);
  const description = cleanText(table.description || '');
  const rows = safeArray<Record<string, any>>(table.rows);
  const columns = getTableColumns(table);

  if (rows.length === 0 || columns.length === 0) return '';

  const headerHtml = columns
    .map((column) => `<th>${htmlEscape(column.label)}</th>`)
    .join('');

  const rowsHtml = rows
    .map((row) => {
      const cells = columns
        .map((column) => `<td>${htmlEscape(formatCellValue(row[column.key]))}</td>`)
        .join('');

      return `<tr>${cells}</tr>`;
    })
    .join('');

  return `
    <h3>${htmlEscape(title)}</h3>
    ${description ? `<p class="table-description">${htmlEscape(description)}</p>` : ''}
    <table>
      <thead>
        <tr>${headerHtml}</tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  `;
}

function sanitizeFileName(value: string) {
  return (
    String(value || 'vysledky-analyzy')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'vysledky-analyzy'
  );
}

function downloadBlob({
  content,
  fileName,
  mimeType,
}: {
  content: BlobPart;
  fileName: string;
  mimeType: string;
}) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function csvEscape(value: unknown) {
  const text = formatCellValue(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  if (/[",;\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

function tableToCsv(table: TableLike, fallbackTitle: string) {
  const title = cleanText(table.title || fallbackTitle);
  const description = cleanText(table.description || '');
  const rows = safeArray<Record<string, any>>(table.rows);
  const columns = getTableColumns(table);

  const lines: string[] = [];

  lines.push(csvEscape(title));

  if (description) {
    lines.push(csvEscape(description));
  }

  if (columns.length > 0) {
    lines.push(columns.map((column) => csvEscape(column.label)).join(';'));
  }

  rows.forEach((row) => {
    lines.push(columns.map((column) => csvEscape(row[column.key])).join(';'));
  });

  return lines.join('\n');
}

function createExcelCsvExport(result: AnalysisResult | null) {
  const descriptiveStatistics = getDescriptiveStatistics(result);
  const frequencies = getFrequencies(result);
  const excelTables = getExcelTables(result);
  const recommendedCharts = getRecommendedCharts(result);
  const recommendedTests = getRecommendedTests(result);
  const hypothesisTests = getHypothesisTests(result);
  const summary = getSummary(result);
  const interpretation = getInterpretationText(result);
  const practicalText = getPracticalText(result);

  const blocks: string[] = [];

  blocks.push('Súhrn');
  blocks.push(`Názov;Hodnota`);
  blocks.push(`Súhrn;${csvEscape(summary)}`);
  blocks.push(`Interpretácia;${csvEscape(interpretation)}`);
  blocks.push(`Text do praktickej časti;${csvEscape(practicalText)}`);

  if (descriptiveStatistics.length > 0) {
    blocks.push('\n\nDeskriptívna štatistika');
    descriptiveStatistics.forEach((table, index) => {
      blocks.push(tableToCsv(table, `Deskriptívna štatistika ${index + 1}`));
    });
  }

  if (frequencies.length > 0) {
    blocks.push('\n\nFrekvenčná analýza');
    frequencies.forEach((table, index) => {
      blocks.push(tableToCsv(table, table.title || `Frekvenčná tabuľka ${index + 1}`));
    });
  }

  const remainingExcelTables = excelTables.filter((table) => {
    const title = cleanText(table.title);
    const isDuplicateDescriptive = descriptiveStatistics.some(
      (item) => cleanText(item.title) === title,
    );
    const isDuplicateFrequency = frequencies.some(
      (item) => cleanText(item.title) === title,
    );

    return !isDuplicateDescriptive && !isDuplicateFrequency;
  });

  if (remainingExcelTables.length > 0) {
    blocks.push('\n\nExcel tabuľky');
    remainingExcelTables.forEach((table, index) => {
      blocks.push(tableToCsv(table, table.title || `Excel tabuľka ${index + 1}`));
    });
  }

  if (recommendedCharts.length > 0) {
    blocks.push('\n\nOdporúčané grafy');
    blocks.push('Názov grafu;Typ;Zdrojová tabuľka;Premenné;Popis');

    recommendedCharts.forEach((chart: any, index) => {
      blocks.push(
        [
          csvEscape(getObjectTitle(chart, `Graf ${index + 1}`)),
          csvEscape(chart?.type || ''),
          csvEscape(chart?.sourceTable || ''),
          csvEscape(Array.isArray(chart?.variables) ? chart.variables.join(', ') : ''),
          csvEscape(getObjectDescription(chart)),
        ].join(';'),
      );
    });
  }

  const allTests = [...recommendedTests, ...hypothesisTests];

  if (allTests.length > 0) {
    blocks.push('\n\nOdporúčané testy hypotéz');
    blocks.push('Názov;Test;Premenné;Popis;Odôvodnenie');

    allTests.forEach((item: any, index) => {
      blocks.push(
        [
          csvEscape(getObjectTitle(item, `Test ${index + 1}`)),
          csvEscape(item?.test || ''),
          csvEscape(Array.isArray(item?.variables) ? item.variables.join(', ') : ''),
          csvEscape(getObjectDescription(item)),
          csvEscape(item?.reason || ''),
        ].join(';'),
      );
    });
  }

  return blocks.join('\n');
}

function getObjectTitle(value: any, fallback: string) {
  if (typeof value === 'string') return value;

  return (
    value?.title ||
    value?.name ||
    value?.test ||
    value?.analysis ||
    value?.variable ||
    fallback
  );
}

function getObjectDescription(value: any) {
  if (typeof value === 'string') return value;

  return (
    value?.description ||
    value?.interpretation ||
    value?.reason ||
    value?.hypothesis ||
    value?.result ||
    value?.summary ||
    ''
  );
}

function getCountLabel(value: number, one: string, many: string) {
  return value === 1 ? `${value} ${one}` : `${value} ${many}`;
}

function InfoCard({
  icon,
  title,
  value,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle?: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.055] p-5">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200">
          {icon}
        </div>

        <div className="text-sm font-black text-slate-200">{title}</div>
      </div>

      <div className="text-2xl font-black text-white">{value}</div>

      {subtitle ? (
        <div className="mt-1 text-xs leading-5 text-slate-400">{subtitle}</div>
      ) : null}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-6 text-sm leading-7 text-slate-400">
      {text}
    </div>
  );
}

function SectionBox({
  title,
  children,
  tone = 'default',
}: {
  title: string;
  children: React.ReactNode;
  tone?: 'default' | 'blue' | 'green' | 'amber';
}) {
  const toneClass =
    tone === 'blue'
      ? 'border-blue-400/20 bg-blue-500/10'
      : tone === 'green'
        ? 'border-emerald-400/20 bg-emerald-500/10'
        : tone === 'amber'
          ? 'border-amber-400/20 bg-amber-500/10'
          : 'border-white/10 bg-white/[0.055]';

  const titleClass =
    tone === 'blue'
      ? 'text-blue-100'
      : tone === 'green'
        ? 'text-emerald-100'
        : tone === 'amber'
          ? 'text-amber-100'
          : 'text-white';

  return (
    <div className={`rounded-3xl border p-5 ${toneClass}`}>
      <h3 className={`mb-4 text-lg font-black ${titleClass}`}>{title}</h3>
      {children}
    </div>
  );
}

function JsonPreview({ value }: { value: unknown }) {
  return (
    <pre className="max-h-[420px] overflow-auto rounded-2xl border border-white/10 bg-black/30 p-4 text-xs leading-6 text-slate-300">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export default function AnalysisResultsModal({ open, result, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<ModalTab>('summary');

  const title = useMemo(() => getTitle(result), [result]);
  const summary = useMemo(() => getSummary(result), [result]);
  const resultText = useMemo(() => getResultText(result), [result]);
  const interpretation = useMemo(() => getInterpretationText(result), [result]);
  const practicalText = useMemo(() => getPracticalText(result), [result]);
  const sourcesText = useMemo(() => getSourcesText(result), [result]);
  const exportText = useMemo(() => createExportText(result), [result]);

  const warnings = safeArray<string>((result as any)?.warnings);
  const variables = getVariables(result);
  const frequencies = getFrequencies(result);
  const recommendedTests = getRecommendedTests(result);
  const recommendedCharts = getRecommendedCharts(result);
  const excelTables = getExcelTables(result);
  const descriptiveStatistics = getDescriptiveStatistics(result);
  const hypothesisTests = getHypothesisTests(result);
  const selectedAnalyses = getSelectedAnalyses(result);

  const hasTables =
    frequencies.length > 0 ||
    excelTables.length > 0 ||
    descriptiveStatistics.length > 0 ||
    variables.length > 0;

  const hasCharts = recommendedCharts.length > 0 || frequencies.length > 0;
  const hasTests = recommendedTests.length > 0 || hypothesisTests.length > 0;

  useEffect(() => {
    if (open) {
      setActiveTab('summary');
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleDownloadTxt = () => {
    if (!exportText.trim()) return;

    downloadBlob({
      content: exportText,
      fileName: `${sanitizeFileName(title)}.txt`,
      mimeType: 'text/plain;charset=utf-8',
    });
  };

  const handleDownloadDoc = () => {
    if (!exportText.trim()) return;

    const html = createDocHtml(title, result);

    downloadBlob({
      content: html,
      fileName: `${sanitizeFileName(title)}.doc`,
      mimeType: 'application/msword;charset=utf-8',
    });
  };

  const handleDownloadExcel = () => {
    if (!result) return;

    const csv = createExcelCsvExport(result);

    downloadBlob({
      content: `\uFEFF${csv}`,
      fileName: `${sanitizeFileName(title)}.csv`,
      mimeType: 'text/csv;charset=utf-8',
    });
  };

  const handlePrintPdf = () => {
    if (!exportText.trim()) return;

    const printWindow = window.open('', '_blank', 'width=900,height=700');

    if (!printWindow) {
      alert('Prehliadač zablokoval otvorenie PDF okna. Povoľ pop-up okná.');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(createDocHtml(title, result));
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  const tabs: TabItem[] = [
    {
      key: 'summary',
      label: 'Súhrn',
      icon: <Info className="h-4 w-4" />,
    },
    {
      key: 'text',
      label: 'Text',
      icon: <FileText className="h-4 w-4" />,
    },
    {
      key: 'tables',
      label: 'Tabuľky',
      icon: <Table2 className="h-4 w-4" />,
    },
    {
      key: 'charts',
      label: 'Grafy',
      icon: <BarChart3 className="h-4 w-4" />,
    },
    {
      key: 'tests',
      label: 'Testy',
      icon: <ClipboardList className="h-4 w-4" />,
    },
    {
      key: 'sources',
      label: 'Zdroje',
      icon: <BookOpen className="h-4 w-4" />,
    },
  ];

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4 text-white backdrop-blur-sm">
      <div className="flex max-h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-[34px] border border-white/10 bg-[#070a16] shadow-2xl shadow-black/50">
        <div className="shrink-0 border-b border-white/10 bg-[#070a16] px-5 py-4 md:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-black text-emerald-100">
                <CheckCircle2 className="h-4 w-4" />
                Analýza dokončená
              </div>

              <h2 className="text-2xl font-black md:text-3xl">{title}</h2>

              <p className="mt-1 text-sm leading-6 text-slate-400">
                Výsledky analýzy dát sú rozdelené na súhrn, interpretáciu,
                tabuľky, grafy, odporúčané testy a exporty do Wordu, PDF a
                Excelu.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadTxt}
                disabled={!exportText.trim()}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-black text-slate-200 transition hover:bg-white/[0.11] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Download className="h-4 w-4" />
                TXT
              </button>

              <button
                type="button"
                onClick={handleDownloadDoc}
                disabled={!exportText.trim()}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-black text-slate-200 transition hover:bg-white/[0.11] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FileDown className="h-4 w-4" />
                Word
              </button>

              <button
                type="button"
                onClick={handleDownloadExcel}
                disabled={!result}
                className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/15 px-4 py-3 text-sm font-black text-emerald-100 transition hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </button>

              <button
                type="button"
                onClick={handlePrintPdf}
                disabled={!exportText.trim()}
                className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Printer className="h-4 w-4" />
                PDF
              </button>

              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl bg-red-500/90 p-3 text-white transition hover:bg-red-400"
                title="Zavrieť"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
            {tabs.map((tab) => {
              const active = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2 text-xs font-black transition ${
                    active
                      ? 'bg-violet-600 text-white shadow-lg shadow-violet-950/30'
                      : 'border border-white/10 bg-white/[0.055] text-slate-300 hover:bg-white/[0.1] hover:text-white'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 md:p-6">
          {!result && (
            <EmptyState text="Výsledok analýzy nie je dostupný. Skontroluj, či rodičovský súbor posiela do modalu hodnotu analysisResult." />
          )}

          {result && activeTab === 'summary' && (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <InfoCard
                  icon={<FileText className="h-5 w-5" />}
                  title="Premenné"
                  value={variables.length}
                  subtitle={getCountLabel(
                    variables.length,
                    'identifikovaná premenná',
                    'identifikovaných premenných',
                  )}
                />

                <InfoCard
                  icon={<Table2 className="h-5 w-5" />}
                  title="Tabuľky"
                  value={
                    frequencies.length +
                    excelTables.length +
                    descriptiveStatistics.length
                  }
                  subtitle="Frekvenčné tabuľky, Excel tabuľky a deskriptívna štatistika"
                />

                <InfoCard
                  icon={<BarChart3 className="h-5 w-5" />}
                  title="Grafy"
                  value={recommendedCharts.length}
                  subtitle="Stĺpcové grafy zo stĺpca Percent"
                />

                <InfoCard
                  icon={<ClipboardList className="h-5 w-5" />}
                  title="Testy"
                  value={recommendedTests.length + hypothesisTests.length}
                  subtitle="Odporúčané alebo vypočítané štatistické testy"
                />
              </div>

              {summary ? (
                <SectionBox title="Súhrn analýzy">
                  <div className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
                    {summary}
                  </div>
                </SectionBox>
              ) : (
                <EmptyState text="Súhrn analýzy nebol v odpovedi dostupný." />
              )}

              {warnings.length > 0 ? (
                <SectionBox title="Upozornenia" tone="amber">
                  <div className="space-y-2">
                    {warnings.map((warning, index) => (
                      <div
                        key={`warning-${index}`}
                        className="flex gap-3 rounded-2xl border border-amber-400/20 bg-black/20 px-4 py-3 text-sm leading-6 text-amber-50"
                      >
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" />
                        <div>{warning}</div>
                      </div>
                    ))}
                  </div>
                </SectionBox>
              ) : (
                <SectionBox title="Stav spracovania" tone="green">
                  <div className="text-sm leading-7 text-emerald-50">
                    Spracovanie prebehlo bez zásadných upozornení.
                  </div>
                </SectionBox>
              )}

              {selectedAnalyses.length > 0 && (
                <SectionBox title="Vybrané analýzy">
                  <div className="grid gap-3 md:grid-cols-2">
                    {selectedAnalyses.map((item: any, index) => (
                      <div
                        key={`selected-analysis-${index}`}
                        className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-300"
                      >
                        <div className="font-black text-white">
                          {getObjectTitle(item, `Analýza ${index + 1}`)}
                        </div>

                        {getObjectDescription(item) ? (
                          <div className="mt-2 text-slate-400">
                            {getObjectDescription(item)}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </SectionBox>
              )}
            </div>
          )}

          {result && activeTab === 'text' && (
            <div className="space-y-5">
              {interpretation ? (
                <SectionBox title="Interpretácia výsledkov">
                  <div className="whitespace-pre-wrap text-sm leading-8 text-slate-200">
                    {interpretation}
                  </div>
                </SectionBox>
              ) : (
                <EmptyState text="Interpretácia výsledkov nebola v odpovedi dostupná." />
              )}

              {practicalText ? (
                <SectionBox title="Text do praktickej časti práce" tone="blue">
                  <div className="whitespace-pre-wrap text-sm leading-8 text-blue-50/90">
                    {practicalText}
                  </div>
                </SectionBox>
              ) : (
                <EmptyState text="Text do praktickej časti nebol v odpovedi dostupný." />
              )}

              {!interpretation && !practicalText && resultText ? (
                <SectionBox title="Textový výstup">
                  <div className="whitespace-pre-wrap text-sm leading-8 text-slate-200">
                    {resultText}
                  </div>
                </SectionBox>
              ) : null}
            </div>
          )}

          {result && activeTab === 'tables' && (
            <div className="space-y-5">
              {hasTables ? (
                <AnalysisTable result={result} />
              ) : (
                <EmptyState text="Tabuľky neboli v odpovedi dostupné. Skontroluj, či /api/analyze-data vracia polia frequencies, excelTables, variables alebo descriptiveStatistics." />
              )}

              {!hasTables && (
                <SectionBox title="Technická kontrola dát">
                  <JsonPreview
                    value={{
                      variables,
                      frequencies,
                      excelTables,
                      descriptiveStatistics,
                    }}
                  />
                </SectionBox>
              )}
            </div>
          )}

          {result && activeTab === 'charts' && (
            <div className="space-y-5">
              {hasCharts ? (
                <AnalysisCharts result={result} />
              ) : (
                <EmptyState text="Grafy neboli v odpovedi dostupné. Skontroluj, či /api/analyze-data vracia pole recommendedCharts alebo frekvenčné tabuľky." />
              )}

              {!hasCharts && (
                <SectionBox title="Technická kontrola grafov">
                  <JsonPreview
                    value={{
                      recommendedCharts,
                      frequencies,
                    }}
                  />
                </SectionBox>
              )}
            </div>
          )}

          {result && activeTab === 'tests' && (
            <div className="space-y-5">
              {!hasTests && (
                <EmptyState text="Odporúčané alebo vypočítané štatistické testy neboli v odpovedi dostupné." />
              )}

              {recommendedTests.length > 0 && (
                <SectionBox title="Odporúčané testy hypotéz">
                  <div className="space-y-3">
                    {recommendedTests.map((item: any, index) => (
                      <div
                        key={`recommended-test-${index}`}
                        className="rounded-2xl border border-white/10 bg-black/20 p-4"
                      >
                        <div className="text-sm font-black text-white">
                          {getObjectTitle(item, `Test ${index + 1}`)}
                        </div>

                        {item?.test ? (
                          <div className="mt-2 text-xs font-black uppercase tracking-[0.18em] text-violet-200">
                            {item.test}
                          </div>
                        ) : null}

                        {Array.isArray(item?.variables) && item.variables.length > 0 ? (
                          <div className="mt-2 text-xs text-slate-400">
                            Premenné: {item.variables.join(', ')}
                          </div>
                        ) : null}

                        <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                          {getObjectDescription(item) ||
                            JSON.stringify(item, null, 2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionBox>
              )}

              {hypothesisTests.length > 0 && (
                <SectionBox title="Výsledky testovania hypotéz">
                  <div className="space-y-3">
                    {hypothesisTests.map((item: any, index) => (
                      <div
                        key={`hypothesis-test-${index}`}
                        className="rounded-2xl border border-white/10 bg-black/20 p-4"
                      >
                        <div className="text-sm font-black text-white">
                          {getObjectTitle(item, `Výsledok testu ${index + 1}`)}
                        </div>

                        {item?.test ? (
                          <div className="mt-2 text-xs font-black uppercase tracking-[0.18em] text-violet-200">
                            {item.test}
                          </div>
                        ) : null}

                        {Array.isArray(item?.variables) && item.variables.length > 0 ? (
                          <div className="mt-2 text-xs text-slate-400">
                            Premenné: {item.variables.join(', ')}
                          </div>
                        ) : null}

                        <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                          {getObjectDescription(item) ||
                            JSON.stringify(item, null, 2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionBox>
              )}
            </div>
          )}

          {result && activeTab === 'sources' && (
            <div className="space-y-5">
              <SectionBox title="Použité zdroje a autori" tone="green">
                {sourcesText ? (
                  <div className="whitespace-pre-wrap text-sm leading-8 text-emerald-50/90">
                    {sourcesText}
                  </div>
                ) : (
                  <div className="text-sm leading-7 text-emerald-50/80">
                    Zdroje neboli dodané alebo sa ich nepodarilo overene
                    načítať.
                  </div>
                )}
              </SectionBox>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}