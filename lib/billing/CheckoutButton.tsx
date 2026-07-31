'use client';

import { useState } from 'react';

import {
  normalizeLocale,
  type AppLocale,
} from '@/lib/billing/checkout-locale';
import type { PaidPlanId } from '@/lib/billing/paid-plans';

type CheckoutButtonProps = {
  planId: PaidPlanId;

  /**
   * Aktuálny jazyk stránky.
   *
   * Odporúčané je posielať ho explicitne z language switchera / page state.
   * Ak sa nepošle, komponent sa ho pokúsi zistiť z:
   * 1. ?lang= / ?locale= / ?language=
   * 2. prvého segmentu URL
   * 3. <html lang="...">
   * 4. navigator.language
   */
  locale?: string;

  children: React.ReactNode;
  className?: string;
};

type CheckoutResponse = {
  url?: string;
  redirectUrl?: string;
  error?: string;
  code?: string;
  message?: string;
  displayMessage?: string;
};

const UI_TEXT: Readonly<
  Record<AppLocale, { loading: string; genericError: string }>
> = {
  sk: {
    loading: 'Presmerovanie na platbu…',
    genericError: 'Pri spustení platby nastala chyba.',
  },
  cs: {
    loading: 'Přesměrování k platbě…',
    genericError: 'Při spuštění platby došlo k chybě.',
  },
  en: {
    loading: 'Redirecting to payment…',
    genericError: 'An error occurred while starting the payment.',
  },
  de: {
    loading: 'Weiterleitung zur Zahlung…',
    genericError: 'Beim Starten der Zahlung ist ein Fehler aufgetreten.',
  },
  pl: {
    loading: 'Przekierowanie do płatności…',
    genericError: 'Wystąpił błąd podczas uruchamiania płatności.',
  },
  hu: {
    loading: 'Átirányítás a fizetéshez…',
    genericError: 'Hiba történt a fizetés indításakor.',
  },
};

function createRequestId(planId: PaidPlanId): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `checkout-plan-${planId}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

/**
 * Určí aktuálny jazyk čo najspoľahlivejšie bez väzby
 * na konkrétnu i18n knižnicu.
 */
function resolveCurrentLocale(explicitLocale?: string): AppLocale {
  if (explicitLocale?.trim()) {
    return normalizeLocale(explicitLocale);
  }

  if (typeof window !== 'undefined') {
    const searchParams = new URLSearchParams(window.location.search);

    const queryLocale =
      searchParams.get('lang') ||
      searchParams.get('locale') ||
      searchParams.get('language');

    if (queryLocale) {
      return normalizeLocale(queryLocale);
    }

    const firstPathSegment = window.location.pathname
      .split('/')
      .filter(Boolean)[0];

    if (firstPathSegment) {
      const normalizedSegment = normalizeLocale(firstPathSegment, 'sk');

      // Použijeme segment iba vtedy, ak vyzerá ako jazykový segment.
      const segment = firstPathSegment.toLowerCase();

      if (
        ['sk', 'cs', 'cz', 'en', 'de', 'pl', 'hu'].includes(segment)
      ) {
        return normalizedSegment;
      }
    }
  }

  if (typeof document !== 'undefined') {
    const htmlLang = document.documentElement.lang;

    if (htmlLang) {
      return normalizeLocale(htmlLang);
    }
  }

  if (typeof navigator !== 'undefined' && navigator.language) {
    return normalizeLocale(navigator.language);
  }

  return 'sk';
}

export default function CheckoutButton({
  planId,
  locale,
  children,
  className,
}: CheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function startCheckout() {
    if (isLoading) {
      return;
    }

    const activeLocale = resolveCurrentLocale(locale);
    const text = UI_TEXT[activeLocale];

    setIsLoading(true);
    setErrorMessage(null);

    const requestId = createRequestId(planId);

    try {
      const response = await fetch('/api/payments/checkout', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Idempotency-Key': requestId,
        },
        body: JSON.stringify({
          checkoutType: 'plan',

          // Spätná kompatibilita so serverovou route.
          plan: planId,
          planId,

          addons: [],
          addonIds: [],

          // Toto je rozhodujúce pre jazyk a menu Stripe Checkoutu.
          locale: activeLocale,
          language: activeLocale,
          lang: activeLocale,

          requestId,
          checkoutRequestId: requestId,
        }),
      });

      const rawBody = await response.text();
      let result: CheckoutResponse | null = null;

      if (rawBody) {
        try {
          result = JSON.parse(rawBody) as CheckoutResponse;
        } catch {
          result = {
            error: rawBody,
          };
        }
      }

      /**
       * Route v aktuálnej implementácii povoľuje guest Checkout,
       * ale túto vetvu ponechávame pre spätnú kompatibilitu,
       * ak sa autentifikačná politika neskôr zmení.
       */
      if (response.status === 401) {
        const returnUrl =
          `/?lang=${encodeURIComponent(activeLocale)}` +
          `&checkout=${encodeURIComponent(planId)}`;

        window.sessionStorage.setItem(
          'zedpera.pendingPlanId',
          planId,
        );
        window.sessionStorage.setItem(
          'zedpera.pendingCheckoutLocale',
          activeLocale,
        );

        window.location.assign(
          `/login?lang=${encodeURIComponent(activeLocale)}` +
            `&next=${encodeURIComponent(returnUrl)}`,
        );

        return;
      }

      const checkoutUrl = result?.url || result?.redirectUrl;

      if (!response.ok || !checkoutUrl) {
        throw new Error(
          result?.displayMessage ||
            result?.message ||
            result?.error ||
            text.genericError,
        );
      }

      window.location.assign(checkoutUrl);
    } catch (error) {
      const activeLocale = resolveCurrentLocale(locale);

      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : UI_TEXT[activeLocale].genericError,
      );

      setIsLoading(false);
    }
  }

  const activeLocale = resolveCurrentLocale(locale);

  return (
    <div>
      <button
        type="button"
        className={className}
        disabled={isLoading}
        aria-busy={isLoading}
        onClick={startCheckout}
      >
        {isLoading ? UI_TEXT[activeLocale].loading : children}
      </button>

      {errorMessage ? (
        <p role="alert" className="mt-3 text-sm text-red-400">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
