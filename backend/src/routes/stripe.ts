import { Router, Request, Response } from 'express';
import { stripe, PRICE_IDS, getPlanFromPriceId } from '../services/stripe';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { getProfile, updateProfile } from '../services/profile';
import { supabase } from '../services/supabase';

const router = Router();

// POST /api/stripe/checkout - Create Stripe Checkout session
router.post('/checkout', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const { plan } = req.body as { plan: 'lite' | 'standard' };

    if (!plan || !['lite', 'standard'].includes(plan)) {
      res.status(400).json({ error: 'Invalid plan. Must be "lite" or "standard".' });
      return;
    }

    const priceId = PRICE_IDS[plan];
    if (!priceId) {
      res.status(500).json({ error: 'Stripe price not configured for this plan' });
      return;
    }

    const profile = await getProfile(userId);

    // Get or create Stripe customer
    let customerId = profile.stripe_customer_id;
    if (!customerId) {
      // Fetch user email from Supabase Auth
      const { data: { user } } = await supabase.auth.admin.getUserById(userId);
      const customer = await stripe.customers.create({
        email: user?.email || undefined,
        metadata: { supabase_user_id: userId },
      });
      customerId = customer.id;
      await updateProfile(userId, { stripe_customer_id: customerId });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${frontendUrl}/?checkout=success`,
      cancel_url: `${frontendUrl}/?checkout=cancel`,
      metadata: { supabase_user_id: userId, plan },
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// POST /api/stripe/portal - Create Stripe Customer Portal session
router.post('/portal', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const profile = await getProfile(userId);

    if (!profile.stripe_customer_id) {
      res.status(400).json({ error: 'No subscription found' });
      return;
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${frontendUrl}/`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe portal error:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// POST /api/stripe/webhook - Handle Stripe webhook events
router.post('/webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('Missing STRIPE_WEBHOOK_SECRET');
    res.status(500).json({ error: 'Webhook secret not configured' });
    return;
  }

  let event;
  try {
    // req.body needs to be the raw buffer for signature verification
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    res.status(400).json({ error: 'Webhook signature verification failed' });
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.supabase_user_id;
        const plan = session.metadata?.plan as 'lite' | 'standard';
        const subscriptionId = session.subscription as string;

        if (userId && plan) {
          await updateProfile(userId, {
            plan,
            stripe_subscription_id: subscriptionId,
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;

        // Find user by stripe_customer_id
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .limit(1);

        if (profiles && profiles.length > 0) {
          const priceId = subscription.items.data[0]?.price?.id;
          const newPlan = priceId ? getPlanFromPriceId(priceId) : null;

          if (newPlan) {
            await updateProfile(profiles[0].id, { plan: newPlan });
          }

          // Handle cancellation
          if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
            await updateProfile(profiles[0].id, {
              plan: 'free',
              stripe_subscription_id: null,
            });
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .limit(1);

        if (profiles && profiles.length > 0) {
          await updateProfile(profiles[0].id, {
            plan: 'free',
            stripe_subscription_id: null,
          });
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
