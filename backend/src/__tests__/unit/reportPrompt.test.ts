import { describe, it, expect } from 'vitest';
import { buildFreeReportPrompt, buildPaidReportPrompt } from '../../prompts/report-prompt';

describe('buildFreeReportPrompt', () => {
  const transcript = 'テスト用のトランスクリプトです。';

  it('includes deep_questions schema for trial period (freeSessionsUsed < 3)', () => {
    const prompt0 = buildFreeReportPrompt(transcript, 0);
    const prompt1 = buildFreeReportPrompt(transcript, 1);
    const prompt2 = buildFreeReportPrompt(transcript, 2);

    for (const prompt of [prompt0, prompt1, prompt2]) {
      expect(prompt).toContain('"deep_questions"');
      expect(prompt).toContain('"question"');
      expect(prompt).toContain('"context"');
      expect(prompt).toContain('"angle"');
      expect(prompt).not.toContain('"exploration_questions"');
    }
  });

  it('includes deep_questions rules for trial period', () => {
    const prompt = buildFreeReportPrompt(transcript, 0);
    expect(prompt).toContain('前提転覆型');
    expect(prompt).toContain('構造発見型');
    expect(prompt).toContain('クライマックス構造');
  });

  it('includes exploration_questions schema for post-trial (freeSessionsUsed >= 3)', () => {
    const prompt3 = buildFreeReportPrompt(transcript, 3);
    const prompt10 = buildFreeReportPrompt(transcript, 10);

    for (const prompt of [prompt3, prompt10]) {
      expect(prompt).toContain('"exploration_questions"');
      expect(prompt).not.toContain('"deep_questions"');
    }
  });

  it('includes exploration_questions rules for post-trial', () => {
    const prompt = buildFreeReportPrompt(transcript, 5);
    expect(prompt).toContain('暗黙の前提を問う');
    expect(prompt).toContain('対立する視点を提示する');
    expect(prompt).toContain('フラッタリー禁止');
    expect(prompt).not.toContain('前提転覆型');
  });

  it('defaults to trial period when freeSessionsUsed is omitted', () => {
    const prompt = buildFreeReportPrompt(transcript);
    expect(prompt).toContain('"deep_questions"');
    expect(prompt).not.toContain('"exploration_questions"');
  });

  it('includes transcript in output', () => {
    const prompt = buildFreeReportPrompt(transcript, 0);
    expect(prompt).toContain(transcript);
  });

  it('includes JSON-only instruction', () => {
    const prompt = buildFreeReportPrompt(transcript, 0);
    expect(prompt).toContain('JSONのみを出力してください');
  });
});

describe('buildPaidReportPrompt', () => {
  const transcript = 'テスト用のトランスクリプトです。';

  it('includes deep_questions schema', () => {
    const prompt = buildPaidReportPrompt(transcript);
    expect(prompt).toContain('"deep_questions"');
    expect(prompt).toContain('"question"');
    expect(prompt).toContain('"context"');
    expect(prompt).toContain('"angle"');
  });

  it('includes deep_questions rules before JSON schema', () => {
    const prompt = buildPaidReportPrompt(transcript);
    const rulesIndex = prompt.indexOf('深い問いの生成ルール');
    const jsonSchemaIndex = prompt.indexOf('出力形式 (JSON)');
    expect(rulesIndex).toBeGreaterThan(-1);
    expect(jsonSchemaIndex).toBeGreaterThan(-1);
    expect(rulesIndex).toBeLessThan(jsonSchemaIndex);
  });

  it('includes all question type rules', () => {
    const prompt = buildPaidReportPrompt(transcript);
    expect(prompt).toContain('前提転覆型');
    expect(prompt).toContain('構造発見型');
    expect(prompt).toContain('越境接続型');
    expect(prompt).toContain('逆説提示型');
    expect(prompt).toContain('時間軸転換型');
  });

  it('does not include exploration_questions', () => {
    const prompt = buildPaidReportPrompt(transcript);
    expect(prompt).not.toContain('"exploration_questions"');
  });

  it('includes transcript in output', () => {
    const prompt = buildPaidReportPrompt(transcript);
    expect(prompt).toContain(transcript);
  });

  it('ends with JSON-only instruction', () => {
    const prompt = buildPaidReportPrompt(transcript);
    const lastLine = prompt.trim().split('\n').pop()!.trim();
    expect(lastLine).toContain('マークダウンのコードブロックは使わないでください');
  });
});
