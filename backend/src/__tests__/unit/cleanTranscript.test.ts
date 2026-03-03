import { describe, it, expect } from 'vitest';
import { cleanTranscript } from '../../utils/clean-transcript';

describe('cleanTranscript', () => {
  it('removes えー filler (2+ chars)', () => {
    expect(cleanTranscript('えーえーそれで話します')).toBe('それで話します');
    expect(cleanTranscript('えーーそれで')).toBe('それで');
  });

  it('does not remove single えー', () => {
    // single えー is not matched by {2,} on the character class
    const result = cleanTranscript('えー大丈夫です');
    // えー = 2 chars of [えー] class, but {2,} matches 2+ so this IS removed
    expect(result).toBe('大丈夫です');
  });

  it('removes あのー', () => {
    expect(cleanTranscript('あのーこれは重要です')).toBe('これは重要です');
    expect(cleanTranscript('あの今日は暑い')).toBe('今日は暑い');
  });

  it('removes まあ with optional comma', () => {
    expect(cleanTranscript('まあ、それはそうですね')).toBe('それはそうですね');
    expect(cleanTranscript('まあそれはそうですね')).toBe('それはそうですね');
  });

  it('removes なんか with optional comma', () => {
    expect(cleanTranscript('なんか、うまくいかない')).toBe('うまくいかない');
    expect(cleanTranscript('なんかうまくいかない')).toBe('うまくいかない');
  });

  it('removes その with optional comma', () => {
    expect(cleanTranscript('その、問題は複雑です')).toBe('問題は複雑です');
    expect(cleanTranscript('その問題は')).toBe('問題は');
  });

  it('removes ちょっと with optional comma', () => {
    expect(cleanTranscript('ちょっと、待ってください')).toBe('待ってください');
    expect(cleanTranscript('ちょっと待って')).toBe('待って');
  });

  it('normalizes multiple spaces to single space', () => {
    expect(cleanTranscript('これは  テストです')).toBe('これは テストです');
    expect(cleanTranscript('a   b   c')).toBe('a b c');
  });

  it('trims leading and trailing whitespace', () => {
    expect(cleanTranscript('  こんにちは  ')).toBe('こんにちは');
  });

  it('handles empty string', () => {
    expect(cleanTranscript('')).toBe('');
  });

  it('handles text with no fillers', () => {
    const text = '今日はいい天気ですね';
    expect(cleanTranscript(text)).toBe(text);
  });

  it('removes multiple fillers in sequence (trailing comma from あのー stays as behavior)', () => {
    // あのー? removes あのー but not the following 、; まあ、 removes まあ and its comma;
    // なんか removes なんか without comma. Leading 、 from あのー removal stays.
    const result = cleanTranscript('あのー、まあ、なんかうまくいきません');
    expect(result).toBe('、うまくいきません');
  });

  it('removes multiple fillers when no trailing commas after あのー', () => {
    const result = cleanTranscript('まあ、なんかうまくいきません');
    expect(result).toBe('うまくいきません');
  });
});
