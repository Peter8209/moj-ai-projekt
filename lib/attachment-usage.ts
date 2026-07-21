import { createAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const ATTACHMENT_USAGE_TABLE = 'zedpera_attachment_usage_log';

export type AttachmentUsageItem = {
  id?: string | null;
  name?: string | null;
  size?: number | null;
  type?: string | null;
  uploadedAt?: string | null;
};

export type AttachmentUsageSnapshot = {
  attachmentsUsed: number;
  attachmentsAdded: number;
  lastUploadedAt: string | null;
  trackingAvailable: boolean;
};

export type AuthenticatedAttachmentUsageSnapshot = AttachmentUsageSnapshot & {
  authenticated: boolean;
};

function emptySnapshot(
  trackingAvailable = true,
): AttachmentUsageSnapshot {
  return {
    attachmentsUsed: 0,
    attachmentsAdded: 0,
    lastUploadedAt: null,
    trackingAvailable,
  };
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function safeInteger(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.round(value))
    : 0;
}

async function getCurrentUserId(): Promise<string | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error('ATTACHMENT_USAGE_AUTH_ERROR:', error);
      return null;
    }

    return user?.id || null;
  } catch (error) {
    console.error('ATTACHMENT_USAGE_AUTH_FATAL_ERROR:', error);
    return null;
  }
}

async function getUsageForUser(
  userId: string,
): Promise<AttachmentUsageSnapshot> {
  try {
    const admin = createAdminClient();

    const [countResult, latestResult] = await Promise.all([
      admin
        .from(ATTACHMENT_USAGE_TABLE)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
      admin
        .from(ATTACHMENT_USAGE_TABLE)
        .select('created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (countResult.error || latestResult.error) {
      console.error(
        'ATTACHMENT_USAGE_READ_ERROR:',
        countResult.error || latestResult.error,
      );

      return emptySnapshot(false);
    }

    return {
      attachmentsUsed: countResult.count || 0,
      attachmentsAdded: 0,
      lastUploadedAt:
        cleanText(latestResult.data?.created_at) || null,
      trackingAvailable: true,
    };
  } catch (error) {
    console.error('ATTACHMENT_USAGE_READ_FATAL_ERROR:', error);
    return emptySnapshot(false);
  }
}

export async function getCurrentUserAttachmentUsage(): Promise<AuthenticatedAttachmentUsageSnapshot> {
  const userId = await getCurrentUserId();

  if (!userId) {
    return {
      ...emptySnapshot(true),
      authenticated: false,
    };
  }

  return {
    ...(await getUsageForUser(userId)),
    authenticated: true,
  };
}

export async function recordCurrentUserAttachmentUsage({
  requestId,
  projectId,
  module,
  items,
  fallbackCount,
}: {
  requestId: string;
  projectId?: string | null;
  module?: string | null;
  items: AttachmentUsageItem[];
  fallbackCount?: number;
}): Promise<AuthenticatedAttachmentUsageSnapshot> {
  const userId = await getCurrentUserId();

  if (!userId) {
    return {
      ...emptySnapshot(true),
      authenticated: false,
    };
  }

  const safeRequestId = cleanText(requestId);
  const safeItems = Array.isArray(items) ? items : [];
  const uniqueItems = new Map<string, AttachmentUsageItem>();

  safeItems.forEach((item, index) => {
    const name = cleanText(item?.name) || `priloha-${index + 1}`;
    const size = safeInteger(item?.size);
    const suppliedId = cleanText(item?.id);

    // Stabilné klientské ID zabezpečí, že rovnaká príloha sa pri výbere
    // a následnom odoslaní do /api/chat nezapočíta dvakrát.
    const attachmentKey =
      suppliedId ||
      `${safeRequestId || 'request'}|${name}|${size}|${index}`;

    if (!uniqueItems.has(attachmentKey)) {
      uniqueItems.set(attachmentKey, {
        id: suppliedId || null,
        name,
        size,
        type: cleanText(item?.type) || null,
        uploadedAt: cleanText(item?.uploadedAt) || null,
      });
    }
  });

  const expectedCount = Math.max(
    uniqueItems.size,
    safeInteger(fallbackCount),
  );

  for (
    let index = uniqueItems.size;
    index < expectedCount;
    index += 1
  ) {
    uniqueItems.set(
      `${safeRequestId || 'request'}|fallback-${index}`,
      {
        id: null,
        name: `priloha-${index + 1}`,
        size: 0,
        type: null,
        uploadedAt: null,
      },
    );
  }

  if (!safeRequestId || uniqueItems.size === 0) {
    return {
      ...(await getUsageForUser(userId)),
      authenticated: true,
    };
  }

  try {
    const admin = createAdminClient();

    const beforeResult = await admin
      .from(ATTACHMENT_USAGE_TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (beforeResult.error) {
      console.error(
        'ATTACHMENT_USAGE_BEFORE_COUNT_ERROR:',
        beforeResult.error,
      );
    }

    const rows = Array.from(uniqueItems.entries()).map(
      ([attachmentKey, item], index) => ({
        user_id: userId,
        request_id: safeRequestId,
        attachment_key: attachmentKey,
        file_name:
          cleanText(item.name) || `priloha-${index + 1}`,
        file_size: safeInteger(item.size),
        file_type: cleanText(item.type) || null,
        project_id: cleanText(projectId) || null,
        module: cleanText(module) || 'chat',
        client_uploaded_at:
          cleanText(item.uploadedAt) || null,
      }),
    );

    const insertResult = await admin
      .from(ATTACHMENT_USAGE_TABLE)
      .upsert(rows, {
        onConflict: 'user_id,attachment_key',
        ignoreDuplicates: true,
      });

    if (insertResult.error) {
      console.error(
        'ATTACHMENT_USAGE_INSERT_ERROR:',
        insertResult.error,
      );

      return {
        ...(await getUsageForUser(userId)),
        authenticated: true,
        trackingAvailable: false,
      };
    }

    const afterResult = await admin
      .from(ATTACHMENT_USAGE_TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (afterResult.error) {
      console.error(
        'ATTACHMENT_USAGE_AFTER_COUNT_ERROR:',
        afterResult.error,
      );
    }

    const snapshot = await getUsageForUser(userId);

    return {
      ...snapshot,
      attachmentsAdded: Math.max(
        (afterResult.count || 0) -
          (beforeResult.count || 0),
        0,
      ),
      authenticated: true,
    };
  } catch (error) {
    console.error(
      'ATTACHMENT_USAGE_RECORD_FATAL_ERROR:',
      error,
    );

    return {
      ...(await getUsageForUser(userId)),
      authenticated: true,
      trackingAvailable: false,
    };
  }
}
