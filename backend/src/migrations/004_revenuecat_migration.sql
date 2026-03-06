-- Migration: Remove Stripe columns from profiles (Stripe → RevenueCat)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS stripe_customer_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS stripe_subscription_id;
DROP INDEX IF EXISTS idx_profiles_stripe_customer_id;
