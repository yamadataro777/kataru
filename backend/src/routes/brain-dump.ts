import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { generateBrainDumpQuestion } from '../services/gemini';
import {
  buildBrainDumpQuestionPrompt,
  buildIntegrationQuestionPrompt,
} from '../prompts/brain-dump-prompt';

const router = Router();

router.post('/question', requireAuth, async (req: Request, res: Response) => {
  try {
    const { transcript, previous_questions = [], elapsed_seconds = 0 } = req.body;

    if (!transcript || transcript.length < 20) {
      res.json({ question: null });
      return;
    }

    const prompt = buildBrainDumpQuestionPrompt(
      transcript,
      previous_questions,
      elapsed_seconds,
    );

    const question = await Promise.race([
      generateBrainDumpQuestion(prompt),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 5000),
      ),
    ]);

    res.json({ question: question || null });
  } catch (error) {
    console.error('Brain dump question error:', error);
    res.json({ question: null });
  }
});

router.post('/integration', requireAuth, async (req: Request, res: Response) => {
  try {
    const { transcript } = req.body;

    if (!transcript || transcript.length < 20) {
      res.json({ question: null });
      return;
    }

    const prompt = buildIntegrationQuestionPrompt(transcript);

    const question = await Promise.race([
      generateBrainDumpQuestion(prompt),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 5000),
      ),
    ]);

    res.json({ question: question || null });
  } catch (error) {
    console.error('Brain dump integration error:', error);
    res.json({ question: null });
  }
});

export default router;
