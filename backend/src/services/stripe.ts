import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('Missing STRIPE_SECRET_KEY environment variable');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

// Price IDs should be set in environment variables after creating them in Stripe Dashboard
export const PRICE_IDS = {
  lite: process.env.STRIPE_PRICE_LITE || '',
  standard: process.env.STRIPE_PRICE_STANDARD || '',
};

export function getPlanFromPriceId(priceId: string): 'lite' | 'standard' | null {
  if (priceId === PRICE_IDS.lite) return 'lite';
  if (priceId === PRICE_IDS.standard) return 'standard';
  return null;
}
