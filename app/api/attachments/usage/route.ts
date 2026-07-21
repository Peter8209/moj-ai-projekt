import { NextResponse } from 'next/server';
import {
  getCurrentUserAttachmentUsage,
  recordCurrentUserAttachmentUsage,
  type AttachmentUsageItem,
} from '@/lib/attachment-usage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function noStoreJson(
  body: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

function degradedResponse(message: string) {
  return noStoreJson({
    ok: true,
    degraded: true,
    code: 'ATTACHMENT_TRACKING_UNAVAILABLE',
    message,
    attachmentsUsed: 0,
    attachmentsAdded: 0,
    lastUploadedAt: null,
    trackingAvailable: false,
  });
}

export async function GET() {
  try {
    const usage = await getCurrentUserAttachmentUsage();

    if (!usage.authenticated) {
      return noStoreJson(
        {
          ok: false,
          code: 'UNAUTHENTICATED',
          message: 'Používateľ nie je prihlásený.',
          ...usage,
        },
        401,
      );
    }

    return noStoreJson({
      ok: true,
      ...usage,
    });
  } catch (error) {
    console.error('ATTACHMENT_USAGE_GET_ROUTE_ERROR:', error);
    return degradedResponse(
      'Evidencia príloh je dočasne nedostupná. AI chat pokračuje bez blokovania.',
    );
  }
}

/**
 * Počítadlo je pomocná telemetria. Aj keď zápis zlyhá, endpoint vráti
 * neblokujúcu odpoveď a frontend môže pokračovať v práci s AI chatom.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== 'object') {
      return degradedResponse(
        'Požiadavku počítadla nebolo možné prečítať. AI chat pokračuje.',
      );
    }

    const requestId = String(
      (body as any)?.requestId ||
        request.headers.get('x-request-id') ||
        '',
    ).trim();

    const items: AttachmentUsageItem[] = Array.isArray(
      (body as any)?.items,
    )
      ? (body as any).items
      : [];

    if (!requestId || !items.length) {
      const current = await getCurrentUserAttachmentUsage();

      return noStoreJson({
        ok: true,
        skipped: true,
        ...current,
      });
    }

    const usage = await recordCurrentUserAttachmentUsage({
      requestId,
      projectId:
        typeof (body as any)?.projectId === 'string'
          ? (body as any).projectId
          : null,
      module:
        typeof (body as any)?.module === 'string'
          ? (body as any).module
          : 'chat',
      items,
      fallbackCount: items.length,
    });

    if (!usage.authenticated) {
      return noStoreJson(
        {
          ok: false,
          code: 'UNAUTHENTICATED',
          message: 'Používateľ nie je prihlásený.',
          ...usage,
        },
        401,
      );
    }

    return noStoreJson({
      ok: true,
      ...usage,
    });
  } catch (error) {
    console.error('ATTACHMENT_USAGE_POST_ROUTE_ERROR:', error);

    return degradedResponse(
      'Počítadlo príloh sa nepodarilo aktualizovať, ale AI chat pokračuje bez obmedzenia.',
    );
  }
}
