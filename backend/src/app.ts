import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import sessionsRouter from './routes/sessions';
import transcribeRouter from './routes/transcribe';
import reportRouter from './routes/report';
import analyticsRouter from './routes/analytics';
import conversationsRouter from './routes/conversations';
import feedbackRouter from './routes/feedback';
import coachingRouter from './routes/coaching';
import authRouter from './routes/auth';
import revenuecatRouter from './routes/revenuecat';

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use('/api/auth', authRouter);
app.use('/api/revenuecat', revenuecatRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/transcribe', transcribeRouter);
app.use('/api/report', reportRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/coaching', coachingRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

export default app;
