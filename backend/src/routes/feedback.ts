import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase';

const router = Router();

// POST / - Submit feedback
router.post('/', async (req: Request, res: Response) => {
  try {
    const { score, comment, suggestion, device_id } = req.body;

    if (!score || score < 1 || score > 5) {
      res.status(400).json({ error: 'Score must be between 1 and 5' });
      return;
    }

    const { error } = await supabase
      .from('feedback')
      .insert({
        score,
        comment: comment || null,
        suggestion: suggestion || null,
        device_id: device_id || null,
        user_agent: req.headers['user-agent'] || null,
      });

    if (error) throw error;

    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error saving feedback:', error);
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

export default router;
