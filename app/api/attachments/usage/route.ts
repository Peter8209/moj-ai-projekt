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

export async function GET() {
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
}

/**
 * Zapíše prílohy hneď po ich výbere v AI chate.
 * /api/chat rovnaké klientské ID iba idempotentne potvrdí,
 * preto sa jedna príloha nezapočíta dvakrát.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const requestId = String(
      body?.requestId ||
        request.headers.get('x-request-id') ||
        '',
    ).trim();

    const items: AttachmentUsageItem[] = Array.isArray(
      body?.items,
    )
      ? body.items
      : [];

    if (!requestId) {
      return noStoreJson(
        {
          ok: false,
          code: 'MISSING_REQUEST_ID',
          message:
            'Chýba identifikátor nahratia príloh.',
        },
        400,
      );
    }

    if (!items.length) {
      return noStoreJson(
        {
          ok: false,
          code: 'MISSING_ATTACHMENTS',
          message:
            'Neboli odoslané žiadne prílohy na započítanie.',
        },
        400,
      );
    }

    const usage =
      await recordCurrentUserAttachmentUsage({
        requestId,
        projectId:
          typeof body?.projectId === 'string'
            ? body.projectId
            : null,
        module:
          typeof body?.module === 'string'
            ? body.module
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
    console.error(
      'ATTACHMENT_USAGE_POST_ERROR:',
      error,
    );

    return noStoreJson(
      {
        ok: false,
        code: 'ATTACHMENT_USAGE_WRITE_FAILED',
        message:
          'Počítadlo príloh sa nepodarilo aktualizovať.',
      },
      500,
    );
  }
}
