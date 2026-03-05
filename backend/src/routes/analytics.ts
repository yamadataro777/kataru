import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET / - Get analytics
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const allSessions = sessions || [];
    const totalSessions = allSessions.length;
    const totalWords = allSessions.reduce((sum, s) => sum + (s.word_count || 0), 0);
    const totalDuration = allSessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
    const avgDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;

    // Aggregate topics from recent reports
    const recentTopics: string[] = [];
    const topicCountMap: Record<string, number> = {};
    const sentimentCounts: Record<string, number> = {
      positive: 0,
      neutral: 0,
      negative: 0,
    };
    const pendingActions: { action: string; session_id: string; session_date: string; session_title: string }[] = [];

    // Count sessions created this month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    let monthlySessionCount = 0;

    // Recent completed sessions for timeline (already sorted desc by created_at)
    const recentSessions: { id: string; created_at: string; title: string; summary: string; topics: string[] }[] = [];

    for (const session of allSessions) {
      // Count monthly sessions
      if (session.created_at >= monthStart) {
        monthlySessionCount++;
      }

      if (session.report) {
        const report = typeof session.report === 'string'
          ? JSON.parse(session.report)
          : session.report;

        if (report.topics) {
          for (const topic of report.topics) {
            if (!recentTopics.includes(topic)) {
              recentTopics.push(topic);
            }
            topicCountMap[topic] = (topicCountMap[topic] || 0) + 1;
          }
        }

        if (report.sentiment?.overall) {
          const key = report.sentiment.overall;
          if (key in sentimentCounts) {
            sentimentCounts[key]++;
          }
        }

        // Collect action_items
        if (report.action_items && Array.isArray(report.action_items)) {
          for (const action of report.action_items) {
            pendingActions.push({
              action,
              session_id: session.id,
              session_date: session.created_at,
              session_title: report.title || '',
            });
          }
        }

        // Collect recent completed sessions for timeline
        if (session.status === 'completed' && recentSessions.length < 5) {
          recentSessions.push({
            id: session.id,
            created_at: session.created_at,
            title: report.title || '',
            summary: report.summary || '',
            topics: report.topics || [],
          });
        }
      }
    }

    // Build sorted topic_counts
    const topicCounts = Object.entries(topicCountMap)
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count);

    res.json({
      total_sessions: totalSessions,
      total_words: totalWords,
      total_duration: totalDuration,
      avg_duration: Math.round(avgDuration),
      recent_topics: recentTopics.slice(0, 20),
      sentiment_distribution: sentimentCounts,
      // New fields for THINKING MAP
      topic_counts: topicCounts,
      recent_sessions: recentSessions,
      pending_actions: pendingActions,
      monthly_session_count: monthlySessionCount,
    });
  } catch (error) {
    console.error('Error getting analytics:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

export default router;
