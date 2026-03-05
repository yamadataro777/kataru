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
import stripeRouter from './routes/stripe';

const app = express();

app.use(cors());

// Stripe webhook needs raw body for signature verification
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '50mb' }));

app.use('/api/auth', authRouter);
app.use('/api/stripe', stripeRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/transcribe', transcribeRouter);
app.use('/api/report', reportRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/coaching', coachingRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

export default app;
