'use client';

import { useState } from 'react';

import type { PaidPlanId } from '@/lib/billing/paid-plans';

type CheckoutButtonProps = {
  planId: PaidPlanId;
  locale?: string;
  children: React.ReactNode;
  className?: string;
};

type CheckoutResponse = {
  url?: string;
  error?: string;
  displayMessage?: string;
};

function createRequestId(planId: PaidPlanId): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `checkout-plan-${planId}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

export default function CheckoutButton({
  planId,
  locale = 'sk',
  children,
  className,
}: CheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function startCheckout() {
    if (isLoading) {
      return;
    }

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
          plan: planId,
          planId,
          addons: [],
          addonIds: [],
          locale,
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
          result = { error: rawBody };
        }
      }

      if (response.status === 401) {
        const returnUrl = `/?lang=${encodeURIComponent(
          locale,
        )}&checkout=${encodeURIComponent(planId)}`;

        window.sessionStorage.setItem(
          'zedpera.pendingPlanId',
          planId,
        );

        window.location.assign(
          `/login?lang=${encodeURIComponent(
            locale,
          )}&next=${encodeURIComponent(returnUrl)}`,
        );

        return;
      }

      if (!response.ok || !result?.url) {
        throw new Error(
          result?.displayMessage ||
            result?.error ||
            'Nepodarilo sa pripraviť platobnú stránku.',
        );
      }

      window.location.assign(result.url);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Pri spustení platby nastala chyba.',
      );

      setIsLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        className={className}
        disabled={isLoading}
        onClick={startCheckout}
      >
        {isLoading ? 'Presmerovanie na platbu…' : children}
      </button>

      {errorMessage ? (
        <p role="alert" className="mt-3 text-sm text-red-400">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
