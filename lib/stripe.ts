import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

/**
 * Lazy Stripe klient.
 *
 * Neinicializujeme ho pri importe modulu, aby build alebo statické časti
 * aplikácie nespadli iba preto, že STRIPE_SECRET_KEY nie je dostupný v čase
 * zostavenia. Kľúč sa vyžaduje až pri reálnom serverovom volaní Stripe.
 */
export function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new Error('STRIPE_CONFIG_MISSING: Missing STRIPE_SECRET_KEY');
  }

  if (!secretKey.startsWith('sk_')) {
    throw new Error(
      'STRIPE_CONFIG_INVALID: STRIPE_SECRET_KEY must start with "sk_"',
    );
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      maxNetworkRetries: 2,
      timeout: 20_000,
    });
  }

  return stripeClient;
}

/**
 * Pomocná funkcia pre testy, ktoré menia process.env medzi test cases.
 */
export function resetStripeClientForTests(): void {
  stripeClient = null;
}
