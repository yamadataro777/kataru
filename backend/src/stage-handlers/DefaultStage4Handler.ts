import type { Stage4Handler } from './Stage4Handler.interface';
import type { CoachingContext, Stage2Data, Stage4Data } from '../types/conversation';
import { buildStage4Prompt } from '../prompts/coaching-prompts';

export class DefaultStage4Handler implements Stage4Handler {
  name = 'default';

  buildPrompt(transcript: string, context: CoachingContext, stage3Data: unknown, stage2Data?: Stage2Data): string {
    return buildStage4Prompt(transcript, context, stage3Data as Parameters<typeof buildStage4Prompt>[2], stage2Data);
  }

  validateCompletion(data: Stage4Data): boolean {
    // Recovery regression: need resize hint
    if (data.should_return_to_stage3) {
      return !!data.stage3_resize_hint?.trim();
    }

    // soft_complete パス: efficacy 閾値不要、requires_priority_followup 必須
    if (data.soft_complete === true) {
      return (
        !!data.requires_priority_followup &&
        !!data.commitment_statement?.trim() &&
        !!data.next_check_in_point?.trim() &&
        Array.isArray(data.review_axes) &&
        data.review_axes.length >= 2
      );
    }

    // 初期・最終 efficacy 必須
    if (data.self_efficacy_level_initial == null) return false;
    if (data.self_efficacy_level_final == null) return false;

    // delta < 0 で原因未記録
    if (data.self_efficacy_delta != null && data.self_efficacy_delta < 0 && !data.negative_delta_cause) {
      return false;
    }

    const finalEfficacy = data.self_efficacy_level_final ?? data.self_efficacy_level;
    let efficacyThreshold: number;
    if (data.recovery_subpath === 'light_commit') {
      efficacyThreshold = 4;
    } else if (data.stage4_path === 'recovery') {
      efficacyThreshold = 4;
    } else {
      efficacyThreshold = 6;
    }

    return (
      !!data.commitment_statement?.trim() &&
      finalEfficacy !== null &&
      finalEfficacy >= efficacyThreshold &&
      !!data.next_check_in_point?.trim() &&
      Array.isArray(data.review_axes) &&
      data.review_axes.length >= 2
    );
  }

  getInitialMessage(): string {
    return '行動計画が決まりました。今決めた行動、10段階で自信は何点くらいありますか？（1が全く自信なし、10が完全に自信あり）';
  }
}
