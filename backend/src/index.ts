import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import sessionsRouter from './routes/sessions';
import transcribeRouter from './routes/transcribe';
import reportRouter from './routes/report';
import analyticsRouter from './routes/analytics';
import conversationsRouter from './routes/conversations';
import feedbackRouter from './routes/feedback';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use('/api/sessions', sessionsRouter);
app.use('/api/transcribe', transcribeRouter);
app.use('/api/report', reportRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/feedback', feedbackRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Kataru API running on port ${PORT}`);
});
