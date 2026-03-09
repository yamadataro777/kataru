import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { generateBrainDumpQuestion, generateIntegrationQuestion } from '../services/gemini';
import { BrainDumpPhase } from '../prompts/brain-dump-prompt';

const router = Router();

router.post('/question', requireAuth, async (req: Request, res: Response) => {
  try {
    const { transcript, duration, questionsShown, phase } = req.body;

    if (!transcript || typeof transcript !== 'string') {
      return res.status(400).json({ error: 'transcript is required' });
    }

    const validPhases: BrainDumpPhase[] = ['expansion', 'connection', 'confrontation'];
    const safePhase = validPhases.includes(phase) ? phase : 'expansion';

    const question = await generateBrainDumpQuestion(
      transcript,
      safePhase,
      questionsShown || [],
    );

    return res.json({ question });
  } catch (err) {
    console.error('Brain dump question error:', err);
    return res.json({ question: null });
  }
});

router.post('/integration', requireAuth, async (req: Request, res: Response) => {
  try {
    const { transcript } = req.body;

    if (!transcript || typeof transcript !== 'string') {
      return res.status(400).json({ error: 'transcript is required' });
    }

    const question = await generateIntegrationQuestion(transcript);
    return res.json({ question: question || '今の自分を一文で表すと？' });
  } catch (err) {
    console.error('Integration question error:', err);
    return res.json({ question: '今の自分を一文で表すと？' });
  }
});

export default router;
