import { NextRequest } from 'next/server';
import { handleExportRequest } from '../_shared/export-core';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  return handleExportRequest(request, 'pdf');
}

export async function GET() {
  return Response.json({ ok: true, format: 'pdf', endpoint: '/api/analyze-data/export/pdf', chartLimit: 1 });
}
