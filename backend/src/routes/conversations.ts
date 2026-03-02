import { Router, Request, Response } from 'express';
import multer from 'multer';
import { createConversation, getConversations, getConversationWithTurns, deleteConversation } from '../services/conversation';
import { processTurn, generateFinalReport, createInitialTurn } from '../services/dialogue';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST / - Create new conversation
router.post('/', async (_req: Request, res: Response) => {
  try {
    const conversation = await createConversation();
    const { turn } = await createInitialTurn(conversation.id);
    res.status(201).json({ conversation, turn });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// GET / - List conversations
router.get('/', async (_req: Request, res: Response) => {
  try {
    const conversations = await getConversations();
    res.json(conversations);
  } catch (error) {
    console.error('Error listing conversations:', error);
    res.status(500).json({ error: 'Failed to list conversations' });
  }
});

// GET /:id - Get conversation with turns
router.get('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const conversation = await getConversationWithTurns(req.params.id);
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    res.json(conversation);
  } catch (error) {
    console.error('Error getting conversation:', error);
    res.status(500).json({ error: 'Failed to get conversation' });
  }
});

// DELETE /:id - Delete conversation
router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    await deleteConversation(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// POST /:id/turns - Send a turn
router.post('/:id/turns', upload.single('audio'), async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { transcript } = req.body;
    const audioBuffer = req.file?.buffer;
    const mimeType = req.file?.mimetype;

    const result = await processTurn(
      req.params.id,
      audioBuffer,
      mimeType,
      transcript
    );

    res.json(result);
  } catch (error) {
    console.error('Error processing turn:', error);
    const message = error instanceof Error ? error.message : 'Failed to process turn';
    res.status(500).json({ error: message, message });
  }
});

// POST /:id/end - End conversation
router.post('/:id/end', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const result = await generateFinalReport(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Error ending conversation:', error);
    res.status(500).json({ error: 'Failed to end conversation' });
  }
});

export default router;
