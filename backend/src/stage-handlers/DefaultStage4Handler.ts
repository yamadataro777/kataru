import type { Stage4Handler } from './Stage4Handler.interface';
import type { CoachingContext, Stage4Data } from '../types/conversation';
import { buildStage4Prompt } from '../prompts/coaching-prompts';

export class DefaultStage4Handler implements Stage4Handler {
  name = 'default';

  buildPrompt(transcript: string, context: CoachingContext, stage3Data: unknown): string {
    return buildStage4Prompt(transcript, context, stage3Data as Parameters<typeof buildStage4Prompt>[2]);
  }

  validateCompletion(data: Stage4Data): boolean {
    return (
      !!data.commitment_statement?.trim() &&
      data.self_efficacy_level !== null &&
      data.self_efficacy_level >= 6
    );
  }

  getInitialMessage(): string {
    return '行動計画が決まりました。今決めた行動、10段階で自信は何点くらいありますか？（1が全く自信なし、10が完全に自信あり）';
  }
}
