import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildFreeReportPrompt, buildPaidReportPrompt } from '../prompts/report-prompt';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn('Missing GEMINI_API_KEY environment variable');
}

const genAI = new GoogleGenerativeAI(apiKey || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

export type PlanType = 'free' | 'paid';

export interface Report {
  title: string;
  summary: string;
  key_insights: string[];
  topics: string[];
  sentiment: {
    overall: 'positive' | 'neutral' | 'negative';
    score: number;
    details: string;
  };
  action_items?: string[];
  contradictions?: string[];
  thinking_pattern?: string;
  structure?: {
    sections: Array<{
      heading: string;
      content: string;
    }>;
  };
  exploration_questions?: string[];
  deep_questions?: Array<{
    question: string;
    context: string;
    angle: string;
  }>;
}

export async function generateReport(transcript: string, plan: 'free' | 'paid' = 'free', freeSessionsUsed: number = 0): Promise<Report> {
  const prompt = plan === 'paid'
    ? buildPaidReportPrompt(transcript)
    : buildFreeReportPrompt(transcript, freeSessionsUsed);

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const report: Report = JSON.parse(text);
  return report;
}

export async function generateContent(prompt: string): Promise<string> {
  const result = await model.generateContent(prompt);
  return result.response.text();
}
