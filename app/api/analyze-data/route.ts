import { NextResponse } from 'next/server';

import {
  analyzeUploadedDataFile,
  type AnalyzeDataApiResponse,
} from '@/components/analysis/analysisStats';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function jsonResponse(payload: AnalyzeDataApiResponse, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const result = await analyzeUploadedDataFile(formData);

    if (!result.ok) {
      return jsonResponse(result, 400);
    }

    return jsonResponse(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Neznáma chyba pri analýze dát.';

    console.error('[api/analyze-data] Chyba:', error);

    return jsonResponse(
      {
        ok: false,
        title: 'Analýza dát',
        summary: '',
        dataDescription: '',
        warnings: [],
        variables: [],
        frequencies: [],
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
        message: 'Analýza dát zlyhala.',
        error: message,
      },
      500,
    );
  }
}