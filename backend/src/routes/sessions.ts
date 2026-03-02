import { Router, Request, Response } from 'express';
import multer from 'multer';
import { createSession, getSessions, getSession, updateSession, deleteSession } from '../services/supabase';
import { uploadAudio, deleteAudio } from '../services/storage';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST / - Create new session
router.post('/', async (_req: Request, res: Response) => {
  try {
    const session = await createSession();
    res.status(201).json(session);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// GET / - List all sessions
router.get('/', async (_req: Request, res: Response) => {
  try {
    const sessions = await getSessions();
    res.json(sessions);
  } catch (error) {
    console.error('Error listing sessions:', error);
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

// GET /:id - Get session by ID
router.get('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const session = await getSession(req.params.id);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json(session);
  } catch (error) {
    console.error('Error getting session:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

// DELETE /:id - Delete session
router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const session = await getSession(req.params.id);
    if (session?.audio_file_path) {
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
router.post('/:id/audio', upload.single('audio'), async (req: Request<{ id: string }>, res: Response) => {
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
      status: 'uploaded',
    });

    res.json(session);
  } catch (error) {
    console.error('Error uploading audio:', error);
    res.status(500).json({ error: 'Failed to upload audio' });
  }
});

export default router;
