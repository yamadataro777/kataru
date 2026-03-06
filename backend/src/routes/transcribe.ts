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

    // Always prefer Whisper when audio is available (higher accuracy for specialized terms)
    const session = await getSession(session_id);
    if (session?.audio_url) {
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
        model: 'gpt-4o-transcribe',
        file,
        language: 'ja',
        prompt: '哲学的な思考や自己分析の録音。虚無主義、ニヒリズム、実存主義、形而上学、認識論、弁証法、現象学、構造主義、ポスト構造主義、脱構築、存在論、アイデンティティ、自己実現、内省、メタ認知。',
      });

      finalTranscript = whisperResponse.text;
    } else if (!finalTranscript) {
      res.status(400).json({ error: 'No audio URL found for this session' });
      return;
    }

    // Whisperが生成するハルシネーション定型文を除去
    const hallucinations = [
      /ご視聴ありがとうございました。?/g,
      /ご視聴いただきありがとうございました。?/g,
      /ご視聴ありがとうございます。?/g,
      /ご視聴いただきありがとうございます。?/g,
      /最後までご覧いただきありがとうございました。?/g,
      /最後までご視聴いただきありがとうございました。?/g,
      /チャンネル登録お願いします。?/g,
      /チャンネル登録よろしくお願いします。?/g,
      /高評価お願いします。?/g,
      /いいねとチャンネル登録をお願いします。?/g,
      /グッドボタン.*お願いします。?/g,
      /字幕は自動生成されています。?/g,
      /字幕提供.*$/g,
      /サブタイトル.*$/g,
      /お疲れ様でした。?/g,
      /おやすみなさい。?/g,
      /ではまた。?/g,
      /また次の動画でお会いしましょう。?/g,
      /次回もお楽しみに。?/g,
      /ありがとうございました。?$/g,
    ];
    for (const pattern of hallucinations) {
      finalTranscript = finalTranscript.replace(pattern, '');
    }
    finalTranscript = finalTranscript.trim();
    finalTranscript = cleanTranscript(finalTranscript);

    const wordCount = finalTranscript.length;

    const updated = await updateSession(session_id, {
      transcript: finalTranscript,
      word_count: wordCount,
      status: 'generating',
    });

    res.json({ transcript: finalTranscript, word_count: wordCount, session: updated });
  } catch (error) {
    console.error('Error transcribing:', error);
    res.status(500).json({ error: 'Failed to transcribe audio' });
  }
});

export default router;
