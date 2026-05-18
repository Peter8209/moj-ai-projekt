import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;

// ================= TYPES =================

type ExportFormat = 'doc' | 'word' | 'pdf' | 'xlsx' | 'excel';

type ExportBody = {
  format?: ExportFormat;
  title?: string;
  result?: any;
};

type TableColumn = {
  key: string;
  label?: string;
};

type TableLike = {
  title?: string;
  description?: string;
  columns?: TableColumn[];
  rows?: Record<string, any>[];
};

// ================= HELPERS =================

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
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function safeArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
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

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
}

function getTitleFromResult(result: any, fallback?: string) {
  return cleanText(fallback || result?.title || 'Výsledky analýzy dát');
}

function getSummary(result: any) {
  return cleanText(
    result?.summary ||
      result?.dataDescription ||
      result?.description ||
      '',
  );
}

function getInterpretation(result: any) {
  return cleanText(result?.interpretation || '');
}

function getPracticalText(result: any) {
  return cleanText(result?.practicalText || '');
}

function getFullText(result: any) {
  return cleanText(
    result?.fullText ||
      result?.fullResult ||
      result?.text ||
      result?.output ||
      result?.result ||
      '',
  );
}

function getDescriptiveStatistics(result: any): TableLike[] {
  return safeArray<TableLike>(
    result?.descriptiveStatistics ||
      result?.descriptive_statistics ||
      result?.statistics,
  );
}

function getFrequencies(result: any): TableLike[] {
  return safeArray<TableLike>(
    result?.frequencies ||
      result?.frequencyTables ||
      result?.frequency_tables,
  );
}

function getExcelTables(result: any): TableLike[] {
  return safeArray<TableLike>(
    result?.excelTables ||
      result?.tables ||
      result?.excel_tables,
  );
}

function getRecommendedCharts(result: any) {
  return safeArray<any>(
    result?.recommendedCharts ||
      result?.charts ||
      result?.recommended_charts,
  );
}

function getRecommendedTests(result: any) {
  return safeArray<any>(
    result?.recommendedTests ||
      result?.tests ||
      result?.recommended_tests,
  );
}

function getHypothesisTests(result: any) {
  return safeArray<any>(
    result?.hypothesisTests ||
      result?.hypothesis_tests ||
      result?.testResults,
  );
}

function getWarnings(result: any) {
  return safeArray<string>(result?.warnings);
}

function getObjectTitle(value: any, fallback: string) {
  if (typeof value === 'string') return value;

  return cleanText(
    value?.title ||
      value?.name ||
      value?.test ||
      value?.analysis ||
      value?.variable ||
      fallback,
  );
}

function getObjectDescription(value: any) {
  if (typeof value === 'string') return value;

  return cleanText(
    value?.description ||
      value?.interpretation ||
      value?.reason ||
      value?.hypothesis ||
      value?.result ||
      value?.summary ||
      '',
  );
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

function deduplicateTables(tables: TableLike[]) {
  const seen = new Set<string>();
  const result: TableLike[] = [];

  for (const table of tables) {
    const title = cleanText(table.title || '');
    const key = title || JSON.stringify(table.columns || []);

    if (seen.has(key)) continue;

    seen.add(key);
    result.push(table);
  }

  return result;
}

function getAllTables(result: any) {
  return deduplicateTables([
    ...getDescriptiveStatistics(result),
    ...getFrequencies(result),
    ...getExcelTables(result),
  ]);
}

// ================= TEXT EXPORT =================

function tableToPlainText(table: TableLike, fallbackTitle: string) {
  const title = cleanText(table.title || fallbackTitle);
  const description = cleanText(table.description || '');
  const rows = safeArray<Record<string, any>>(table.rows);
  const columns = getTableColumns(table);

  const blocks: string[] = [];

  blocks.push(title);

  if (description) {
    blocks.push(description);
  }

  if (rows.length === 0 || columns.length === 0) {
    blocks.push('Tabuľka neobsahuje riadky.');
    return cleanText(blocks.join('\n'));
  }

  blocks.push(columns.map((column) => column.label).join('\t'));

  rows.forEach((row) => {
    blocks.push(
      columns
        .map((column) => formatCellValue(row[column.key]).replace(/\s+/g, ' '))
        .join('\t'),
    );
  });

  return cleanText(blocks.join('\n'));
}

function buildExportText(result: any, title: string) {
  const summary = getSummary(result);
  const interpretation = getInterpretation(result);
  const practicalText = getPracticalText(result);
  const fullText = getFullText(result);
  const warnings = getWarnings(result);
  const tables = getAllTables(result);
  const charts = getRecommendedCharts(result);
  const recommendedTests = getRecommendedTests(result);
  const hypothesisTests = getHypothesisTests(result);

  const blocks: string[] = [];

  blocks.push(title);

  if (summary) {
    blocks.push(`Súhrn\n${summary}`);
  }

  if (warnings.length > 0) {
    blocks.push(
      `Upozornenia\n${warnings.map((item) => `- ${item}`).join('\n')}`,
    );
  }

  if (interpretation) {
    blocks.push(`Interpretácia výsledkov\n${interpretation}`);
  }

  if (practicalText) {
    blocks.push(`Text do praktickej časti práce\n${practicalText}`);
  }

  if (!interpretation && !practicalText && fullText) {
    blocks.push(`Textový výstup\n${fullText}`);
  }

  if (tables.length > 0) {
    blocks.push('Tabuľky');

    tables.forEach((table, index) => {
      blocks.push(tableToPlainText(table, table.title || `Tabuľka ${index + 1}`));
    });
  }

  if (charts.length > 0) {
    blocks.push('Odporúčané grafy');

    charts.forEach((chart: any, index) => {
      const chartTitle = getObjectTitle(chart, `Graf ${index + 1}`);
      const chartType = chart?.type ? `Typ grafu: ${chart.type}` : '';
      const sourceTable = chart?.sourceTable
        ? `Zdrojová tabuľka: ${chart.sourceTable}`
        : '';
      const variables = Array.isArray(chart?.variables)
        ? `Premenné: ${chart.variables.join(', ')}`
        : '';
      const description = getObjectDescription(chart);

      blocks.push(
        cleanText(
          [chartTitle, chartType, sourceTable, variables, description]
            .filter(Boolean)
            .join('\n'),
        ),
      );
    });
  }

  const allTests = [...recommendedTests, ...hypothesisTests];

  if (allTests.length > 0) {
    blocks.push('Odporúčané testy hypotéz');

    allTests.forEach((test: any, index) => {
      const testTitle = getObjectTitle(test, `Test ${index + 1}`);
      const testName = test?.test ? `Test: ${test.test}` : '';
      const variables = Array.isArray(test?.variables)
        ? `Premenné: ${test.variables.join(', ')}`
        : '';
      const description = getObjectDescription(test);
      const reason = test?.reason ? `Odôvodnenie: ${test.reason}` : '';

      blocks.push(
        cleanText(
          [testTitle, testName, variables, description, reason]
            .filter(Boolean)
            .join('\n'),
        ),
      );
    });
  }

  return cleanText(blocks.join('\n\n'));
}

// ================= WORD EXPORT =================

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
        .map(
          (column) =>
            `<td>${htmlEscape(formatCellValue(row[column.key]))}</td>`,
        )
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

function createWordHtml(title: string, result: any) {
  const exportText = buildExportText(result, title);
  const tables = getAllTables(result);

  const paragraphs = exportText
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();

      if (!trimmed) return '<p>&nbsp;</p>';

      const isHeading =
        /^(Súhrn|Upozornenia|Interpretácia výsledkov|Text do praktickej časti práce|Textový výstup|Tabuľky|Odporúčané grafy|Odporúčané testy hypotéz|Deskriptívna štatistika|Frekvenčná analýza|Excel tabuľky)$/i.test(
          trimmed,
        );

      if (isHeading) {
        return `<h2>${htmlEscape(trimmed)}</h2>`;
      }

      return `<p>${htmlEscape(trimmed)}</p>`;
    })
    .join('');

  const tablesHtml = tables
    .map((table, index) =>
      createHtmlTable(table, table.title || `Tabuľka ${index + 1}`),
    )
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
      line-height: 1.55;
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
      margin: 20px 0 8px;
      page-break-after: avoid;
    }

    p {
      margin: 0 0 10px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0 26px;
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
  </style>
</head>
<body>
  <h1>${htmlEscape(title)}</h1>
  ${paragraphs}
  ${tablesHtml ? `<h2>Tabuľky v štruktúrovanom formáte</h2>${tablesHtml}` : ''}
</body>
</html>
`;
}

// ================= EXCEL EXPORT =================

function safeSheetName(value: string, fallback: string) {
  const name = cleanText(value || fallback)
    .replace(/[:\\/?*\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 31);

  return name || fallback.slice(0, 31);
}

function tableToSheetRows(table: TableLike) {
  const rows = safeArray<Record<string, any>>(table.rows);
  const columns = getTableColumns(table);

  if (columns.length === 0) {
    return [['Tabuľka neobsahuje stĺpce']];
  }

  const output: any[][] = [];

  output.push(columns.map((column) => column.label));

  rows.forEach((row) => {
    output.push(columns.map((column) => row[column.key] ?? ''));
  });

  return output;
}

async function createExcelBuffer(title: string, result: any) {
  const XLSX = await import('xlsx');

  const workbook = XLSX.utils.book_new();

  const summaryRows: any[][] = [
    ['Názov', title],
    ['Súhrn', getSummary(result)],
    ['Interpretácia', getInterpretation(result)],
    ['Text do praktickej časti', getPracticalText(result)],
    ['Vygenerované', new Date().toLocaleString('sk-SK')],
  ];

  const warnings = getWarnings(result);

  if (warnings.length > 0) {
    summaryRows.push([]);
    summaryRows.push(['Upozornenia']);
    warnings.forEach((warning) => summaryRows.push([warning]));
  }

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Súhrn');

  const descriptiveStatistics = getDescriptiveStatistics(result);
  const frequencies = getFrequencies(result);
  const excelTables = getExcelTables(result);

  const addTablesToWorkbook = (tables: TableLike[], prefix: string) => {
    tables.forEach((table, index) => {
      const rows = tableToSheetRows(table);

      const titleRow = [[cleanText(table.title || `${prefix} ${index + 1}`)]];
      const description = cleanText(table.description || '');
      const descriptionRows = description ? [[description], []] : [[]];

      const sheet = XLSX.utils.aoa_to_sheet([
        ...titleRow,
        ...descriptionRows,
        ...rows,
      ]);

      const sheetName = safeSheetName(
        table.title || `${prefix} ${index + 1}`,
        `${prefix} ${index + 1}`,
      );

      let finalSheetName = sheetName;
      let counter = 2;

      while (workbook.SheetNames.includes(finalSheetName)) {
        finalSheetName = safeSheetName(
          `${sheetName} ${counter}`,
          `${prefix} ${counter}`,
        );
        counter += 1;
      }

      XLSX.utils.book_append_sheet(workbook, sheet, finalSheetName);
    });
  };

  addTablesToWorkbook(descriptiveStatistics, 'Deskriptívna');
  addTablesToWorkbook(frequencies, 'Frekvencia');

  const remainingExcelTables = excelTables.filter((table) => {
    const tableTitle = cleanText(table.title);

    const duplicateInDescriptive = descriptiveStatistics.some(
      (item) => cleanText(item.title) === tableTitle,
    );

    const duplicateInFrequencies = frequencies.some(
      (item) => cleanText(item.title) === tableTitle,
    );

    return !duplicateInDescriptive && !duplicateInFrequencies;
  });

  addTablesToWorkbook(remainingExcelTables, 'Tabuľka');

  const charts = getRecommendedCharts(result);

  if (charts.length > 0) {
    const chartRows = [
      ['Názov grafu', 'Typ', 'Zdrojová tabuľka', 'Premenné', 'Popis'],
      ...charts.map((chart: any, index) => [
        getObjectTitle(chart, `Graf ${index + 1}`),
        chart?.type || '',
        chart?.sourceTable || '',
        Array.isArray(chart?.variables) ? chart.variables.join(', ') : '',
        getObjectDescription(chart),
      ]),
    ];

    const chartSheet = XLSX.utils.aoa_to_sheet(chartRows);
    XLSX.utils.book_append_sheet(workbook, chartSheet, 'Grafy');
  }

  const allTests = [
    ...getRecommendedTests(result),
    ...getHypothesisTests(result),
  ];

  if (allTests.length > 0) {
    const testRows = [
      ['Názov', 'Test', 'Premenné', 'Popis', 'Odôvodnenie'],
      ...allTests.map((test: any, index) => [
        getObjectTitle(test, `Test ${index + 1}`),
        test?.test || '',
        Array.isArray(test?.variables) ? test.variables.join(', ') : '',
        getObjectDescription(test),
        test?.reason || '',
      ]),
    ];

    const testSheet = XLSX.utils.aoa_to_sheet(testRows);
    XLSX.utils.book_append_sheet(workbook, testSheet, 'Testy');
  }

  const output = XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
  });

  return Buffer.from(output);
}

// ================= PDF EXPORT =================

function addPdfParagraph(
  doc: PDFKit.PDFDocument,
  text: string,
  options: PDFKit.Mixins.TextOptions = {},
) {
  const cleaned = cleanText(text);

  if (!cleaned) {
    doc.moveDown(0.5);
    return;
  }

  doc.font('Helvetica').fontSize(10).fillColor('#111827');
  doc.text(cleaned, {
    align: 'left',
    lineGap: 3,
    ...options,
  });

  doc.moveDown(0.8);
}

function addPdfHeading(
  doc: PDFKit.PDFDocument,
  text: string,
  level: 1 | 2 | 3 = 2,
) {
  const size = level === 1 ? 20 : level === 2 ? 15 : 12;

  doc.moveDown(level === 1 ? 0.4 : 0.8);
  doc.font('Helvetica-Bold').fontSize(size).fillColor('#111827');
  doc.text(cleanText(text), {
    align: 'left',
  });
  doc.moveDown(0.5);
}

function addPdfTable(
  doc: PDFKit.PDFDocument,
  table: TableLike,
  fallbackTitle: string,
) {
  const title = cleanText(table.title || fallbackTitle);
  const description = cleanText(table.description || '');
  const rows = safeArray<Record<string, any>>(table.rows);
  const columns = getTableColumns(table).slice(0, 6);

  addPdfHeading(doc, title, 3);

  if (description) {
    addPdfParagraph(doc, description);
  }

  if (rows.length === 0 || columns.length === 0) {
    addPdfParagraph(doc, 'Tabuľka neobsahuje riadky.');
    return;
  }

  const header = columns.map((column) => column.label).join(' | ');
  addPdfParagraph(doc, header);

  rows.slice(0, 80).forEach((row) => {
    const line = columns
      .map((column) => formatCellValue(row[column.key]).replace(/\s+/g, ' '))
      .join(' | ');

    addPdfParagraph(doc, line);
  });

  if (rows.length > 80) {
    addPdfParagraph(
      doc,
      `Poznámka: Tabuľka obsahuje ${rows.length} riadkov, v PDF náhľade je zobrazených prvých 80 riadkov. Kompletné tabuľky sú v Excel exporte.`,
    );
  }
}

async function createPdfBuffer(title: string, result: any) {
  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        bufferPages: true,
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });

      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      doc.on('error', (error) => {
        reject(error);
      });

      addPdfHeading(doc, title, 1);

      const summary = getSummary(result);
      const interpretation = getInterpretation(result);
      const practicalText = getPracticalText(result);
      const warnings = getWarnings(result);

      if (summary) {
        addPdfHeading(doc, 'Súhrn', 2);
        addPdfParagraph(doc, summary);
      }

      if (warnings.length > 0) {
        addPdfHeading(doc, 'Upozornenia', 2);
        warnings.forEach((warning) => addPdfParagraph(doc, `• ${warning}`));
      }

      if (interpretation) {
        addPdfHeading(doc, 'Interpretácia výsledkov', 2);
        addPdfParagraph(doc, interpretation);
      }

      if (practicalText) {
        addPdfHeading(doc, 'Text do praktickej časti práce', 2);
        addPdfParagraph(doc, practicalText);
      }

      const tables = getAllTables(result);

      if (tables.length > 0) {
        addPdfHeading(doc, 'Tabuľky', 2);

        tables.forEach((table, index) => {
          addPdfTable(doc, table, table.title || `Tabuľka ${index + 1}`);
        });
      }

      const charts = getRecommendedCharts(result);

      if (charts.length > 0) {
        addPdfHeading(doc, 'Odporúčané grafy', 2);

        charts.forEach((chart: any, index) => {
          addPdfHeading(doc, getObjectTitle(chart, `Graf ${index + 1}`), 3);
          addPdfParagraph(
            doc,
            [
              chart?.type ? `Typ grafu: ${chart.type}` : '',
              chart?.sourceTable ? `Zdrojová tabuľka: ${chart.sourceTable}` : '',
              Array.isArray(chart?.variables)
                ? `Premenné: ${chart.variables.join(', ')}`
                : '',
              getObjectDescription(chart),
            ]
              .filter(Boolean)
              .join('\n'),
          );
        });
      }

      const allTests = [
        ...getRecommendedTests(result),
        ...getHypothesisTests(result),
      ];

      if (allTests.length > 0) {
        addPdfHeading(doc, 'Odporúčané testy hypotéz', 2);

        allTests.forEach((test: any, index) => {
          addPdfHeading(doc, getObjectTitle(test, `Test ${index + 1}`), 3);
          addPdfParagraph(
            doc,
            [
              test?.test ? `Test: ${test.test}` : '',
              Array.isArray(test?.variables)
                ? `Premenné: ${test.variables.join(', ')}`
                : '',
              getObjectDescription(test),
              test?.reason ? `Odôvodnenie: ${test.reason}` : '',
            ]
              .filter(Boolean)
              .join('\n'),
          );
        });
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// ================= RESPONSE HELPERS =================

function bufferToArrayBuffer(buffer: Buffer): ArrayBuffer {
  const copied = new Uint8Array(buffer.byteLength);
  copied.set(buffer);

  return copied.buffer;
}

function fileResponse({
  buffer,
  fileName,
  contentType,
}: {
  buffer: Buffer | string;
  fileName: string;
  contentType: string;
}) {
  const body: BodyInit =
    typeof buffer === 'string' ? buffer : bufferToArrayBuffer(buffer);

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    },
  });
}

// ================= ROUTE =================

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as ExportBody;

    const result = body.result;

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

    const requestedFormat = cleanText(body.format || 'xlsx').toLowerCase();

    const format: ExportFormat =
      requestedFormat === 'word' || requestedFormat === 'doc'
        ? 'doc'
        : requestedFormat === 'pdf'
          ? 'pdf'
          : requestedFormat === 'excel' || requestedFormat === 'xlsx'
            ? 'xlsx'
            : 'xlsx';

    const title = getTitleFromResult(result, body.title);
    const baseFileName = sanitizeFileName(title);

    if (format === 'doc') {
      const html = createWordHtml(title, result);

      return fileResponse({
        buffer: html,
        fileName: `${baseFileName}.doc`,
        contentType: 'application/msword; charset=utf-8',
      });
    }

    if (format === 'pdf') {
      const buffer = await createPdfBuffer(title, result);

      return fileResponse({
        buffer,
        fileName: `${baseFileName}.pdf`,
        contentType: 'application/pdf',
      });
    }

    const buffer = await createExcelBuffer(title, result);

    return fileResponse({
      buffer,
      fileName: `${baseFileName}.xlsx`,
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  } catch (error) {
    console.error('ANALYZE_DATA_EXPORT_ERROR:', error);

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

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: '/api/analyze-data/export',
    methods: ['POST'],
    formats: ['word', 'doc', 'pdf', 'excel', 'xlsx'],
    bodyExample: {
      format: 'xlsx',
      title: 'Výsledky analýzy dát',
      result: {
        title: 'Výsledky analýzy dát',
        summary: 'Súhrn výsledkov',
        descriptiveStatistics: [],
        frequencies: [],
        recommendedCharts: [],
        recommendedTests: [],
        hypothesisTests: [],
        interpretation: '',
        practicalText: '',
      },
    },
  });
}