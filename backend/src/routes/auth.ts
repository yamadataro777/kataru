import { Router, Request, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { getProfile, updateProfile, deleteAccount } from '../services/profile';
import { supabase } from '../services/supabase';

const router = Router();

// GET /api/auth/profile - Get current user's profile
router.get('/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const profile = await getProfile(userId);
    res.json(profile);
  } catch (error) {
    console.error('Error getting profile:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// POST /api/auth/upgrade - Secret plan upgrade (dev/testing)
router.post('/upgrade', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const profile = await getProfile(userId);
    const newPlan = profile.plan === 'free' ? 'standard' : 'free';
    const updated = await updateProfile(userId, { plan: newPlan as 'free' | 'lite' | 'standard' });
    res.json(updated);
  } catch (error) {
    console.error('Error upgrading plan:', error);
    res.status(500).json({ error: 'Failed to upgrade plan' });
  }
});

// DELETE /api/auth/account - Delete user account and all data
router.delete('/account', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    await deleteAccount(userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// GET /api/auth/trust-memory — Phase 8: ユーザーの傾向記憶を取得
router.get('/trust-memory', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const { data, error } = await supabase
      .from('profiles')
      .select('trust_memory')
      .eq('id', userId)
      .single();
    if (error) { res.status(500).json({ error: 'Failed to get trust memory' }); return; }
    res.json({ trust_memory: data?.trust_memory || null });
  } catch (error) {
    console.error('Error getting trust memory:', error);
    res.status(500).json({ error: 'Failed to get trust memory' });
  }
});

// DELETE /api/auth/trust-memory — Phase 8: 傾向記憶を削除
router.delete('/trust-memory', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const { error } = await supabase
      .from('profiles')
      .update({ trust_memory: null })
      .eq('id', userId);
    if (error) { res.status(500).json({ error: 'Failed to clear trust memory' }); return; }
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing trust memory:', error);
    res.status(500).json({ error: 'Failed to clear trust memory' });
  }
});

export default router;
