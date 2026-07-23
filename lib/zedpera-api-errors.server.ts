import {
  NextResponse,
  type NextRequest,
} from "next/server";

import {
  createZedperaError,
  createZedperaErrorFromPayload,
  createZedperaErrorFromUnknown,
  normalizeZedperaLanguage,
  toZedperaApiErrorBody,
  type ZedperaErrorCode,
  type ZedperaErrorContext,
  type ZedperaErrorInfo,
  type ZedperaLanguage,
} from "@/lib/api-error-messages";

type RouteContext =
  Record<string, unknown>;

export type ZedperaRouteHandler<
  TContext = RouteContext,
> = (
  request: NextRequest,
  context: TContext,
) =>
  | Response
  | NextResponse
  | Promise<Response | NextResponse>;

function clean(
  value: unknown,
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

export function getRequestLanguage(
  request?: Request | null,
): ZedperaLanguage {
  if (!request) return "sk";

  const explicit =
    request.headers.get(
      "x-zedpera-language",
    ) ||
    request.headers.get(
      "x-language",
    );

  if (explicit) {
    return normalizeZedperaLanguage(
      explicit,
    );
  }

  const acceptLanguage =
    request.headers.get(
      "accept-language",
    ) || "";

  return normalizeZedperaLanguage(
    acceptLanguage
      .split(",")[0]
      ?.split("-")[0],
  );
}

export function getRequestId(
  request?: Request | null,
): string {
  if (!request) return "";

  return clean(
    request.headers.get(
      "x-request-id",
    ) ||
      request.headers.get(
        "x-zedpera-request-id",
      ),
  );
}

function responseHeaders(
  descriptor: ZedperaErrorInfo,
  extraHeaders?: HeadersInit,
): Headers {
  const headers =
    new Headers(extraHeaders);

  headers.set(
    "Cache-Control",
    "no-store",
  );
  headers.set(
    "X-Zedpera-Error-Code",
    descriptor.technicalCode,
  );

  if (descriptor.requestId) {
    headers.set(
      "X-Zedpera-Request-Id",
      descriptor.requestId,
    );
  }

  if (
    descriptor.retryAfterSeconds !==
      null &&
    descriptor.retryAfterSeconds !==
      undefined
  ) {
    headers.set(
      "Retry-After",
      String(
        descriptor.retryAfterSeconds,
      ),
    );
  }

  return headers;
}

export function zedperaErrorJson(
  code: ZedperaErrorCode,
  context: ZedperaErrorContext = {},
  options: {
    request?: Request | null;
    language?:
      | ZedperaLanguage
      | string
      | null;
    status?: number | null;
    title?: string | null;
    message?: string | null;
    reason?: string | null;
    solution?: string | null;
    userAction?: string | null;
    adminAction?: string | null;
    detail?: string | null;
    headers?: HeadersInit;
  } = {},
): NextResponse {
  const language =
    options.language ||
    getRequestLanguage(
      options.request,
    );

  const requestId =
    clean(context.requestId) ||
    getRequestId(
      options.request,
    );

  const descriptor =
    createZedperaError(
      code,
      {
        ...context,
        requestId,
      },
      {
        language,
        status: options.status,
        title: options.title,
        message: options.message,
        reason: options.reason,
        solution: options.solution,
        userAction:
          options.userAction,
        adminAction:
          options.adminAction,
        detail: options.detail,
      },
    );

  return NextResponse.json(
    toZedperaApiErrorBody(
      descriptor,
      {
        includeAdminDetail:
          process.env.NODE_ENV !==
          "production",
        includeTechnicalDetail:
          process.env.NODE_ENV !==
          "production",
      },
    ),
    {
      status:
        descriptor.status,
      headers: responseHeaders(
        descriptor,
        options.headers,
      ),
    },
  );
}

export function zedperaUnknownErrorJson(
  error: unknown,
  options: {
    request?: Request | null;
    language?:
      | ZedperaLanguage
      | string
      | null;
    status?: number | null;
    endpoint?: string | null;
    module?: string | null;
    requestId?: string | null;
    headers?: HeadersInit;
  } = {},
): NextResponse {
  const language =
    options.language ||
    getRequestLanguage(
      options.request,
    );

  const requestId =
    clean(options.requestId) ||
    getRequestId(
      options.request,
    );

  const descriptor =
    createZedperaErrorFromUnknown(
      error,
      {
        language,
        status: options.status,
        endpoint: options.endpoint,
        module: options.module,
        requestId,
      },
    );

  return NextResponse.json(
    toZedperaApiErrorBody(
      descriptor,
      {
        includeAdminDetail:
          process.env.NODE_ENV !==
          "production",
        includeTechnicalDetail:
          process.env.NODE_ENV !==
          "production",
      },
    ),
    {
      status:
        descriptor.status,
      headers: responseHeaders(
        descriptor,
        options.headers,
      ),
    },
  );
}

export class ZedperaRouteError extends Error {
  readonly code:
    ZedperaErrorCode;
  readonly status?: number;
  readonly context:
    ZedperaErrorContext;

  constructor(
    code: ZedperaErrorCode,
    context:
      ZedperaErrorContext = {},
    options: {
      message?: string;
      status?: number;
      cause?: unknown;
    } = {},
  ) {
    super(
      options.message ||
        String(code),
    );

    this.name =
      "ZedperaRouteError";

    if (
      options.cause !== undefined
    ) {
      (
        this as Error & {
          cause?: unknown;
        }
      ).cause = options.cause;
    }
    this.code = code;
    this.status =
      options.status;
    this.context = context;
  }
}

export function throwZedperaError(
  code: ZedperaErrorCode,
  context:
    ZedperaErrorContext = {},
  options: {
    message?: string;
    status?: number;
    cause?: unknown;
  } = {},
): never {
  throw new ZedperaRouteError(
    code,
    context,
    options,
  );
}

/**
 * Bezpečný wrapper pre ľubovoľnú Next.js API route.
 *
 * Použitie:
 * export const POST = withZedperaApiErrors(
 *   async (request) => { ... },
 *   { endpoint: "/api/example", module: "chat" },
 * );
 */
export function withZedperaApiErrors<
  TContext = RouteContext,
>(
  handler:
    ZedperaRouteHandler<TContext>,
  metadata: {
    endpoint: string;
    module?: string | null;
  },
): ZedperaRouteHandler<TContext> {
  return async (
    request,
    context,
  ) => {
    try {
      return await handler(
        request,
        context,
      );
    } catch (error) {
      if (
        error instanceof
        ZedperaRouteError
      ) {
        return zedperaErrorJson(
          error.code,
          {
            ...error.context,
            endpoint:
              error.context
                .endpoint ||
              metadata.endpoint,
            module:
              error.context
                .module ||
              metadata.module,
            rawMessage:
              error.message,
          },
          {
            request,
            status:
              error.status,
          },
        );
      }

      const record =
        error &&
        typeof error === "object"
          ? (error as Record<
              string,
              unknown
            >)
          : null;

      const explicitCode =
        clean(record?.code);

      if (explicitCode) {
        const descriptor =
          createZedperaErrorFromPayload(
            {
              ...record,
              code:
                explicitCode,
            },
            {
              status:
                typeof record?.status ===
                  "number"
                  ? record.status
                  : undefined,
              language:
                getRequestLanguage(
                  request,
                ),
              endpoint:
                metadata.endpoint,
              module:
                metadata.module,
              requestId:
                getRequestId(
                  request,
                ),
            },
          );

        return NextResponse.json(
          toZedperaApiErrorBody(
            descriptor,
            {
              includeAdminDetail:
                process.env
                  .NODE_ENV !==
                "production",
              includeTechnicalDetail:
                process.env
                  .NODE_ENV !==
                "production",
            },
          ),
          {
            status:
              descriptor.status,
            headers:
              responseHeaders(
                descriptor,
              ),
          },
        );
      }

      return zedperaUnknownErrorJson(
        error,
        {
          request,
          endpoint:
            metadata.endpoint,
          module:
            metadata.module,
        },
      );
    }
  };
}
