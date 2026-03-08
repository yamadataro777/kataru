import { Capacitor } from '@capacitor/core';

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

let purchasesModule: typeof import('@revenuecat/purchases-capacitor') | null = null;

async function getPurchases() {
  if (!purchasesModule) {
    purchasesModule = await import('@revenuecat/purchases-capacitor');
  }
  return purchasesModule.Purchases;
}

export async function initRevenueCat(userId: string): Promise<void> {
  if (!isNativePlatform()) return;

  const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY;
  if (!apiKey) {
    console.warn('Missing NEXT_PUBLIC_REVENUECAT_IOS_KEY');
    return;
  }

  if (apiKey.startsWith('test_')) {
    console.warn('[RevenueCat] Using TEST API key. Switch to production key before App Store submission.');
  }

  const Purchases = await getPurchases();
  await Purchases.configure({ apiKey, appUserID: userId });
}

export async function getOfferings() {
  const Purchases = await getPurchases();
  return await Purchases.getOfferings();
}

export async function purchasePackage(pkg: { identifier: string; offeringIdentifier: string }) {
  const Purchases = await getPurchases();
  const result = await Purchases.purchasePackage({
    aPackage: {
      identifier: pkg.identifier,
      offeringIdentifier: pkg.offeringIdentifier,
    } as never,
  });
  return result;
}

export async function restorePurchases() {
  const Purchases = await getPurchases();
  const { customerInfo } = await Purchases.restorePurchases();
  return customerInfo;
}
