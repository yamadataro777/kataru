import type { CoachingContext, Stage2Data, Stage4Data } from '../types/conversation';

export interface Stage4Handler {
  name: string;
  buildPrompt(transcript: string, context: CoachingContext, stage3Data: unknown, stage2Data?: Stage2Data): string;
  validateCompletion(data: Stage4Data): boolean;
  getInitialMessage(): string;
}
