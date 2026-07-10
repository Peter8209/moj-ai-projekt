import { NextRequest } from 'next/server';
import { handleExportRequest } from '../_shared/export-core';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  return handleExportRequest(request, 'raw');
}

export async function GET() {
  return Response.json({ ok: true, format: 'raw', endpoint: '/api/analyze-data/export/raw-data', chartLimit: 0 });
}
