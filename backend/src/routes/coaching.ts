import { Router, Request, Response } from 'express';
import multer from 'multer';
import { coachingService } from '../services/coaching';
import { getConversationWithTurns } from '../services/conversation';
import { supabase } from '../services/supabase';
import type { CoachingStage, StageMode } from '../types/conversation';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/coaching - Create new coaching session
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const conversation = await coachingService.createSession(userId);
    res.status(201).json(conversation);
  } catch (err) {
    console.error('Create coaching session error:', err);
    res.status(500).json({ error: 'セッションの作成に失敗しました' });
  }
});

// GET /api/coaching - List sessions
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const { data, error } = await supabase
      .from('coaching_conversations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('List coaching sessions error:', err);
    res.status(500).json({ error: 'セッション一覧の取得に失敗しました' });
  }
});

// GET /api/coaching/:id - Get session with turns
router.get('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const data = await getConversationWithTurns(req.params.id);
    if (!data) {
      res.status(404).json({ error: 'セッションが見つかりません' });
      return;
    }
    res.json(data);
  } catch (err) {
    console.error('Get coaching session error:', err);
    res.status(500).json({ error: 'セッションの取得に失敗しました' });
  }
});

// POST /api/coaching/:id/initial - Get initial message for a stage
router.post('/:id/initial', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { stage, mode } = req.body as { stage: string; mode?: string };
    if (!stage) {
      res.status(400).json({ error: 'stage is required' });
      return;
    }
    const response = await coachingService.getInitialMessage(
      req.params.id,
      Number(stage) as CoachingStage,
      (mode as StageMode) || null
    );
    res.json(response);
  } catch (err) {
    console.error('Get initial message error:', err);
    res.status(500).json({ error: '初期メッセージの取得に失敗しました' });
  }
});

// POST /api/coaching/transcribe - Transcribe audio only (no AI analysis)
router.post('/transcribe', upload.single('audio'), async (req: Request, res: Response) => {
  try {
    const audioBuffer = req.file?.buffer;
    const mimeType = req.file?.mimetype;

    if (!audioBuffer || !mimeType) {
      res.status(400).json({ error: '音声ファイルが必要です' });
      return;
    }

    const OpenAI = (await import('openai')).default;
    const { toFile } = await import('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('wav') ? 'wav' : 'webm';
    const file = await toFile(audioBuffer, `recording.${ext}`, { type: mimeType });
    const whisperRes = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'ja',
    });

    const transcript = whisperRes.text.trim();
    res.json({ transcript });
  } catch (err) {
    console.error('Coaching transcribe error:', err);
    res.status(500).json({ error: '文字起こしに失敗しました' });
  }
});

// POST /api/coaching/:id/turns - Submit a turn
router.post('/:id/turns', upload.single('audio'), async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { transcript, stage, mode } = req.body as { transcript?: string; stage?: string; mode?: string };

    if (!stage) {
      res.status(400).json({ error: 'stage is required' });
      return;
    }
    if (stage === '1' && !mode) {
      res.status(400).json({ error: 'mode is required for stage 1' });
      return;
    }

    const audioBuffer = req.file?.buffer;
    const mimeType = req.file?.mimetype;

    const { turn, response } = await coachingService.processCoachingTurn(
      req.params.id,
      Number(stage) as CoachingStage,
      (mode as StageMode) || null,
      audioBuffer,
      mimeType,
      transcript
    );

    res.json({ turn, response });
  } catch (err) {
    console.error('Submit coaching turn error:', err);
    const message = err instanceof Error ? err.message : 'ターンの送信に失敗しました';
    res.status(500).json({ error: message });
  }
});

// POST /api/coaching/:id/advance - Advance to next stage
router.post('/:id/advance', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { nextStage, extractedData } = req.body as { nextStage?: string; extractedData?: unknown };
    if (!nextStage) {
      res.status(400).json({ error: 'nextStage is required' });
      return;
    }
    const response = await coachingService.advanceStage(
      req.params.id,
      Number(nextStage) as CoachingStage,
      extractedData as import('../types/conversation').StageExtractedData
    );
    res.json(response);
  } catch (err) {
    console.error('Advance stage error:', err);
    res.status(500).json({ error: '段階の遷移に失敗しました' });
  }
});

// POST /api/coaching/:id/end - End session and generate report
router.post('/:id/end', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const report = await coachingService.generateCoachingReport(req.params.id);
    res.json({ report });
  } catch (err) {
    console.error('End coaching session error:', err);
    res.status(500).json({ error: 'セッションの終了に失敗しました' });
  }
});

export default router;
