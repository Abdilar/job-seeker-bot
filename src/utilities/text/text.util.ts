export function normalizeText(value?: string | null): string {
  return (value ?? '')
    .replace(/ي|ى/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/\u200c/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
