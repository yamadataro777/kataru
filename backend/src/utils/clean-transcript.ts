export function cleanTranscript(text: string): string {
  return text
    .replace(/[えー]{2,}/g, '')
    .replace(/あのー?/g, '')
    .replace(/まあ、?/g, '')
    .replace(/なんか、?/g, '')
    .replace(/その、?/g, '')
    .replace(/ちょっと、?/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
