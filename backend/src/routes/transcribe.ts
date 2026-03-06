import { Router, Request, Response } from 'express';
import OpenAI, { toFile } from 'openai';
import { getSession, updateSession } from '../services/supabase';
import { cleanTranscript } from '../utils/clean-transcript';
import { requireAuth } from '../middleware/auth';

const router = Router();

// POST / - Transcribe audio
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { session_id, transcript } = req.body;

    if (!session_id) {
      res.status(400).json({ error: 'session_id is required' });
      return;
    }

    let finalTranscript = transcript;

    // If no transcript from Web Speech API, use Whisper
    if (!finalTranscript) {
      const session = await getSession(session_id);
      if (!session?.audio_url) {
        res.status(400).json({ error: 'No audio URL found for this session' });
        return;
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // Fetch audio file from Supabase Storage
      const audioResponse = await fetch(session.audio_url);
      const arrayBuffer = await audioResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Derive format from the stored audio URL
      const audioExt = session.audio_url.match(/\.(mp4|wav|webm|m4a)(?:\?|$)/)?.[1] || 'webm';
      const audioMime = audioExt === 'mp4' ? 'audio/mp4' : audioExt === 'wav' ? 'audio/wav' : audioExt === 'm4a' ? 'audio/m4a' : 'audio/webm';
      const file = await toFile(buffer, `recording.${audioExt}`, { type: audioMime });

      const whisperResponse = await openai.audio.transcriptions.create({
        model: 'whisper-1',
        file,
        language: 'ja',
      });

      finalTranscript = whisperResponse.text;
    }

    // Whisperが生成するハルシネーション定型文を除去
    const hallucinations = [
      /ご視聴ありがとうございました。?/g,
      /ご視聴いただきありがとうございました。?/g,
      /ご視聴ありがとうございます。?/g,
      /ご視聴いただきありがとうございます。?/g,
      /チャンネル登録お願いします。?/g,
      /チャンネル登録よろしくお願いします。?/g,
      /高評価お願いします。?/g,
      /いいねとチャンネル登録をお願いします。?/g,
      /ありがとうございました。?$/g,
    ];
    for (const pattern of hallucinations) {
      finalTranscript = finalTranscript.replace(pattern, '');
    }
    finalTranscript = finalTranscript.trim();
    finalTranscript = cleanTranscript(finalTranscript);

    const wordCount = finalTranscript.length;

    const session = await updateSession(session_id, {
      transcript: finalTranscript,
      word_count: wordCount,
      status: 'generating',
    });

    res.json({ transcript: finalTranscript, word_count: wordCount, session });
  } catch (error) {
    console.error('Error transcribing:', error);
    res.status(500).json({ error: 'Failed to transcribe audio' });
  }
});

export default router;
