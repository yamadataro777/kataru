import { Router, Request, Response } from 'express';
import { updateProfile } from '../services/profile';

const router = Router();

const PRODUCT_PLAN_MAP: Record<string, 'lite' | 'standard'> = {
  kataru_lite_monthly: 'lite',
  kataru_standard_monthly: 'standard',
};

function getPlanFromProductId(productId: string): 'lite' | 'standard' | null {
  return PRODUCT_PLAN_MAP[productId] ?? null;
}

// POST /api/revenuecat/webhook — RevenueCat webhook handler
router.post('/webhook', async (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  const expectedToken = process.env.REVENUECAT_WEBHOOK_AUTH_TOKEN;

  if (!expectedToken) {
    console.error('Missing REVENUECAT_WEBHOOK_AUTH_TOKEN');
    res.status(500).json({ error: 'Webhook not configured' });
    return;
  }

  if (authHeader !== `Bearer ${expectedToken}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const { event } = req.body;
    if (!event) {
      res.status(400).json({ error: 'Missing event' });
      return;
    }

    const { type, app_user_id, product_id } = event;

    if (!app_user_id) {
      res.status(400).json({ error: 'Missing app_user_id' });
      return;
    }

    switch (type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'UNCANCELLATION': {
        const plan = getPlanFromProductId(product_id);
        if (plan) {
          await updateProfile(app_user_id, { plan });
        }
        break;
      }

      case 'PRODUCT_CHANGE': {
        const newProductId = event.new_product_id || product_id;
        const plan = getPlanFromProductId(newProductId);
        if (plan) {
          await updateProfile(app_user_id, { plan });
        }
        break;
      }

      case 'EXPIRATION':
      case 'BILLING_ISSUE': {
        await updateProfile(app_user_id, { plan: 'free' });
        break;
      }

      case 'CANCELLATION':
        // No action — subscription remains active until EXPIRATION
        break;

      default:
        // Ignore unknown event types
        break;
    }

    res.json({ received: true });
  } catch (error) {
    console.error('RevenueCat webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
