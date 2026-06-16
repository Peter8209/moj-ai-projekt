import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

type ApiUsage = {
  endpoint: string;
  method: 'POST';
  body: 'FormData';
  requiredFileFields: string[];
  exportFields: string[];
  exportFormats: string[];
};

const MAIN_ENDPOINT = '/api/analyze-data';

const usage: ApiUsage = {
  endpoint: MAIN_ENDPOINT,
  method: 'POST',
  body: 'FormData',
  requiredFileFields: ['file', 'files'],
  exportFields: ['exportFormat', 'format', 'type'],
  exportFormats: ['excel', 'raw', 'json'],
};

function jsonDisabledRouteResponse(status = 410) {
  return NextResponse.json(
    {
      ok: false,
      disabled: true,
      route: '/api/analyze-data/export',
      error:
        'Táto export route je vypnutá. Export aj analýza dát sa robia cez /api/analyze-data.',
      message:
        'Dashboard nemá volať /api/analyze-data/export. Dashboard má iba poslať priložený súbor na /api/analyze-data cez FormData.',
      useInstead: MAIN_ENDPOINT,
      usage,
    },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
        'X-Zedpera-Deprecated-Route': 'true',
        'X-Zedpera-Use-Instead': MAIN_ENDPOINT,
      },
    },
  );
}

export async function GET() {
  return jsonDisabledRouteResponse(410);
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') || '';

  if (!contentType.toLowerCase().includes('multipart/form-data')) {
    return jsonDisabledRouteResponse(410);
  }

  return NextResponse.json(
    {
      ok: false,
      disabled: true,
      route: '/api/analyze-data/export',
      error:
        'Export route je vypnutá. Súbor si prijal na starej route /api/analyze-data/export, ale správna route je /api/analyze-data.',
      message:
        'Uprav DashboardClient.tsx tak, aby Excel/Raw export aj analýza dát volali iba /api/analyze-data. Táto route zostáva iba ako ochranná brzda, aby bolo jasné, že sa používa stará pipeline.',
      useInstead: MAIN_ENDPOINT,
      usage,
      receivedContentType: contentType,
    },
    {
      status: 410,
      headers: {
        'Cache-Control': 'no-store',
        'X-Zedpera-Deprecated-Route': 'true',
        'X-Zedpera-Use-Instead': MAIN_ENDPOINT,
      },
    },
  );
}

export async function PUT() {
  return jsonDisabledRouteResponse(405);
}

export async function PATCH() {
  return jsonDisabledRouteResponse(405);
}

export async function DELETE() {
  return jsonDisabledRouteResponse(405);
}
