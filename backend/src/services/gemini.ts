import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildReportPrompt } from '../prompts/report-prompt';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn('Missing GEMINI_API_KEY environment variable');
}

const genAI = new GoogleGenerativeAI(apiKey || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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
  action_items: string[];
  structure: {
    sections: Array<{
      heading: string;
      content: string;
    }>;
  };
}

export async function generateReport(transcript: string): Promise<Report> {
  const prompt = buildReportPrompt(transcript);

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const report: Report = JSON.parse(text);
  return report;
}

export async function generateContent(prompt: string): Promise<string> {
  const result = await model.generateContent(prompt);
  return result.response.text();
}
