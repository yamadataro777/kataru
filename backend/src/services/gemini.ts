import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildFreeReportPrompt, buildPaidReportPrompt } from '../prompts/report-prompt';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn('Missing GEMINI_API_KEY environment variable');
}

const genAI = new GoogleGenerativeAI(apiKey || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

const fastModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: {
    maxOutputTokens: 100,
    temperature: 0.9,
  },
});

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

export async function generateBrainDumpQuestion(prompt: string): Promise<string> {
  const result = await fastModel.generateContent(prompt);
  return result.response.text().trim();
}

const roundModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 2048,
    // @ts-expect-error — thinkingConfig is supported by Gemini 2.5 but not yet in SDK types
    thinkingConfig: { thinkingBudget: 1024 },
  },
});

export interface GeminiRoundResult {
  text: string;
  usage?: {
    promptTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

export async function generateRoundContent(prompt: string): Promise<string> {
  const result = await roundModel.generateContent(prompt);
  return result.response.text();
}

export async function generateRoundContentWithUsage(prompt: string): Promise<GeminiRoundResult> {
  const result = await roundModel.generateContent(prompt);
  const response = result.response;
  const usage = response.usageMetadata;
  return {
    text: response.text(),
    usage: usage ? {
      promptTokens: usage.promptTokenCount,
      outputTokens: usage.candidatesTokenCount,
      totalTokens: usage.totalTokenCount,
    } : undefined,
  };
}

const marketingModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 1200,
    // @ts-expect-error — thinkingConfig is supported by Gemini 2.5 but not yet in SDK types
    thinkingConfig: { thinkingBudget: 2048 },
  },
});

export interface GeminiMarketingResult {
  text: string;
  usage?: {
    promptTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

export async function generateMarketingContent(prompt: string): Promise<GeminiMarketingResult> {
  const result = await marketingModel.generateContent(prompt);
  const response = result.response;
  const usage = response.usageMetadata;
  return {
    text: response.text(),
    usage: usage ? {
      promptTokens: usage.promptTokenCount,
      outputTokens: usage.candidatesTokenCount,
      totalTokens: usage.totalTokenCount,
    } : undefined,
  };
}
