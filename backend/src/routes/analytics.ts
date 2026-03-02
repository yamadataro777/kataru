import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase';

const router = Router();

// GET / - Get analytics
router.get('/', async (_req: Request, res: Response) => {
  try {
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const allSessions = sessions || [];
    const totalSessions = allSessions.length;
    const totalWords = allSessions.reduce((sum, s) => sum + (s.word_count || 0), 0);
    const totalDuration = allSessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
    const avgDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;

    // Aggregate topics from recent reports
    const recentTopics: string[] = [];
    const sentimentCounts: Record<string, number> = {
      positive: 0,
      neutral: 0,
      negative: 0,
    };

    for (const session of allSessions) {
      if (session.report) {
        const report = typeof session.report === 'string'
          ? JSON.parse(session.report)
          : session.report;

        if (report.topics) {
          for (const topic of report.topics) {
            if (!recentTopics.includes(topic)) {
              recentTopics.push(topic);
            }
          }
        }

        if (report.sentiment?.overall) {
          const key = report.sentiment.overall;
          if (key in sentimentCounts) {
            sentimentCounts[key]++;
          }
        }
      }
    }

    res.json({
      total_sessions: totalSessions,
      total_words: totalWords,
      total_duration: totalDuration,
      avg_duration: Math.round(avgDuration),
      recent_topics: recentTopics.slice(0, 20),
      sentiment_distribution: sentimentCounts,
    });
  } catch (error) {
    console.error('Error getting analytics:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

export default router;
