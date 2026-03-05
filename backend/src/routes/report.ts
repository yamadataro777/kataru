import { Router, Request, Response } from 'express';
import { getSession, updateSession } from '../services/supabase';
import { generateReport } from '../services/gemini';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { getReportPlan, incrementSessionCount, getProfile } from '../services/profile';

const router = Router();

// POST / - Generate report
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId, userPlan } = req as AuthenticatedRequest;
    const { session_id } = req.body;

    if (!session_id) {
      res.status(400).json({ error: 'session_id is required' });
      return;
    }

    const session = await getSession(session_id);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Verify ownership
    if (session.user_id && session.user_id !== userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    if (!session.transcript) {
      res.status(400).json({ error: 'Session has no transcript' });
      return;
    }

    await updateSession(session_id, { status: 'generating' });

    // Determine report plan from user's actual plan + session count (gradual unlock)
    const profile = await getProfile(userId);
    const reportPlan = getReportPlan(userPlan, profile.free_sessions_used);
    const report = await generateReport(session.transcript, reportPlan);

    await updateSession(session_id, {
      report,
      status: 'completed',
    });

    // Increment session count after successful report generation
    await incrementSessionCount(userId);

    res.json(report);
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

export default router;
