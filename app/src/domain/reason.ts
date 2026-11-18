export const reasonRequirement =
  'Skriv minst to ord og minst ti tegn, inkludert mellomrom. Hvert ord må inneholde en bokstav eller et tall.'

export function validateReason(input: string): { text: string; valid: boolean } {
  const text = input.normalize('NFC').replace(/[\s\p{White_Space}]+/gu, ' ').trim()
  const words = text.split(' ').filter(token => /[\p{L}\p{N}]/u.test(token))
  return { text, valid: words.length >= 2 && Array.from(text).length >= 10 }
}
