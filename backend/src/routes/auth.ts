import { Router, Request, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { getProfile, updateProfile, deleteAccount } from '../services/profile';

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

export default router;
