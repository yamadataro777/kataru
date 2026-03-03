import type { CoachingContext, Stage4Data } from '../types/conversation';

export interface Stage4Handler {
  name: string;
  buildPrompt(transcript: string, context: CoachingContext, stage3Data: unknown): string;
  validateCompletion(data: Stage4Data): boolean;
  getInitialMessage(): string;
}
