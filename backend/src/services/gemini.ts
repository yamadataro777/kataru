import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildFreeReportPrompt, buildPaidReportPrompt } from '../prompts/report-prompt';
import { BrainDumpPhase, buildBrainDumpQuestionPrompt, buildIntegrationQuestionPrompt } from '../prompts/brain-dump-prompt';

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
  blockage?: string;
  discussion_points?: string[];
  next_step?: string;
}

export async function generateReport(transcript: string, plan: 'free' | 'paid' = 'free', freeSessionsUsed: number = 0): Promise<Report> {
  const prompt = plan === 'paid'
    ? buildPaidReportPrompt(transcript)
    : buildFreeReportPrompt(transcript, freeSessionsUsed);

  const result = await model.generateContent(prompt);
  let text = result.response.text();

  // Strip markdown code blocks if Gemini wraps the JSON
  text = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

  // Extract JSON object even if surrounded by extra text
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('Gemini response did not contain valid JSON:', text.substring(0, 500));
    throw new Error('Gemini response did not contain valid JSON');
  }

  try {
    const report: Report = JSON.parse(jsonMatch[0]);
    return report;
  } catch (parseError) {
    console.error('Failed to parse Gemini JSON response:', text.substring(0, 500));
    throw parseError;
  }
}

export async function generateContent(prompt: string): Promise<string> {
  const result = await model.generateContent(prompt);
  return result.response.text();
}

export async function generateBrainDumpQuestion(
  transcript: string,
  phase: BrainDumpPhase,
  questionsShown: string[],
): Promise<string | null> {
  try {
    const prompt = buildBrainDumpQuestionPrompt(transcript, phase, questionsShown);
    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000)),
    ]);

    let text = result.response.text().trim();
    // Remove quotes if wrapped
    text = text.replace(/^[「『""]|[」』""]$/g, '');

    // Validation: 5-40 chars, ends with ？
    if (text.length < 5 || text.length > 40) return null;
    if (!text.endsWith('？') && !text.endsWith('?')) return null;
    // Reject AI boilerplate
    if (/^(はい|もちろん|かしこまりました|承知しました)/.test(text)) return null;

    return text;
  } catch (err) {
    console.error('Brain dump question generation failed:', err);
    return null;
  }
}

export async function generateIntegrationQuestion(transcript: string): Promise<string | null> {
  try {
    const prompt = buildIntegrationQuestionPrompt(transcript);
    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000)),
    ]);

    let text = result.response.text().trim();
    text = text.replace(/^[「『""]|[」』""]$/g, '');

    if (text.length < 5 || text.length > 50) return null;
    if (!text.endsWith('？') && !text.endsWith('?')) return null;

    return text;
  } catch (err) {
    console.error('Integration question generation failed:', err);
    return null;
  }
}
