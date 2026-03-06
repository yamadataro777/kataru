import { Router, Request, Response } from 'express';
import multer from 'multer';
import { getSessions, getSession, updateSession, deleteSession, supabase } from '../services/supabase';
import { uploadAudio, deleteAudio } from '../services/storage';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { canCreateSession, incrementSessionCount } from '../services/profile';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST / - Create new session
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;

    // Check session limits
    const { allowed, reason } = await canCreateSession(userId);
    if (!allowed) {
      res.status(403).json({ error: reason });
      return;
    }

    const { data, error } = await supabase
      .from('sessions')
      .insert({ status: 'recording', user_id: userId })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// GET / - List user's sessions
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error listing sessions:', error);
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

// GET /:id - Get session by ID
router.get('/:id', requireAuth, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { userId } = req as unknown as AuthenticatedRequest;
    const session = await getSession(req.params.id);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    // Verify ownership
    if (session.user_id && session.user_id !== userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    res.json(session);
  } catch (error) {
    console.error('Error getting session:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

// DELETE /:id - Delete session
router.delete('/:id', requireAuth, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { userId } = req as unknown as AuthenticatedRequest;
    const session = await getSession(req.params.id);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    if (session.user_id && session.user_id !== userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    if (session.audio_file_path) {
      await deleteAudio(session.audio_file_path);
    }
    await deleteSession(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// POST /:id/audio - Upload audio file
router.post('/:id/audio', requireAuth, upload.single('audio'), async (req: Request<{ id: string }>, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No audio file provided' });
      return;
    }

    const sessionId = req.params.id;
    const { buffer, mimetype } = req.file;

    await updateSession(sessionId, { status: 'uploading' });

    const { publicUrl, filePath } = await uploadAudio(sessionId, buffer, mimetype);

    const session = await updateSession(sessionId, {
      audio_url: publicUrl,
      audio_file_path: filePath,
      status: 'transcribing',
    });

    res.json(session);
  } catch (error) {
    console.error('Error uploading audio:', error);
    res.status(500).json({ error: 'Failed to upload audio' });
  }
});

export default router;
