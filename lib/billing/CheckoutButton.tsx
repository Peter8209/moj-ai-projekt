'use client';

import { useState } from 'react';

import type { PaidPlanId } from '@/lib/billing/paid-plans';

type CheckoutButtonProps = {
  planId: PaidPlanId;
  locale?: string;
  children: React.ReactNode;
  className?: string;
};

export default function CheckoutButton({
  planId,
  locale = 'sk',
  children,
  className,
}: CheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    null,
  );

  async function startCheckout() {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/payments/checkout', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          locale,
        }),
      });

      const result = (await response.json().catch(() => null)) as
        | {
            url?: string;
            error?: string;
          }
        | null;

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