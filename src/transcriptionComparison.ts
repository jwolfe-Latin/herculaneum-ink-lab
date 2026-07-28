export const TRANSCRIPTION_LINE_COUNT = 5

export type TranscriptionLineStatus =
  | 'matches'
  | 'missing-character'
  | 'extra-character'
  | 'different-character'
  | 'character-order-difference'

export type TranscriptionCharacterComparison = {
  position: number
  studentCharacter: string | null
  referenceCharacter: string | null
  matches: boolean
}

export type TranscriptionLineComparison = {
  lineNumber: number
  studentText: string
  referenceText: string
  normalizedStudentText: string
  normalizedReferenceText: string
  comparableStudentText: string
  comparableReferenceText: string
  status: TranscriptionLineStatus
  characters: TranscriptionCharacterComparison[]
}

export type TranscriptionComparison = {
  lines: TranscriptionLineComparison[]
  hasDifferences: boolean
}

/**
 * Normalizes display text without changing its diplomatic content.
 *
 * Letters are uppercased, outside whitespace is trimmed, and repeated ordinary
 * spaces are collapsed. V and U, punctuation, brackets, question marks,
 * hyphens, em dashes, character order, and line boundaries remain distinct.
 */
export function normalizeTranscriptionDisplay(text: string) {
  return text.toUpperCase().trim().replace(/ +/g, ' ')
}

/**
 * Ordinary spaces are optional for the main letter-sequence comparison.
 * No other character is removed or normalized.
 */
export function normalizeTranscriptionForComparison(text: string) {
  return normalizeTranscriptionDisplay(text).replace(/ /g, '')
}

function sortedCharacters(text: string) {
  return Array.from(text).sort().join('')
}

function classifyLine(
  studentText: string,
  referenceText: string,
): TranscriptionLineStatus {
  if (studentText === referenceText) return 'matches'
  if (studentText.length < referenceText.length) return 'missing-character'
  if (studentText.length > referenceText.length) return 'extra-character'
  if (sortedCharacters(studentText) === sortedCharacters(referenceText)) {
    return 'character-order-difference'
  }
  return 'different-character'
}

export function compareTranscriptionLine(
  studentText: string,
  referenceText: string,
  lineNumber = 1,
): TranscriptionLineComparison {
  const normalizedStudentText = normalizeTranscriptionDisplay(studentText)
  const normalizedReferenceText = normalizeTranscriptionDisplay(referenceText)
  const comparableStudentText =
    normalizeTranscriptionForComparison(studentText)
  const comparableReferenceText =
    normalizeTranscriptionForComparison(referenceText)
  const characterCount = Math.max(
    comparableStudentText.length,
    comparableReferenceText.length,
  )

  return {
    lineNumber,
    studentText,
    referenceText,
    normalizedStudentText,
    normalizedReferenceText,
    comparableStudentText,
    comparableReferenceText,
    status: classifyLine(comparableStudentText, comparableReferenceText),
    characters: Array.from({ length: characterCount }, (_, index) => {
      const studentCharacter = comparableStudentText[index] ?? null
      const referenceCharacter = comparableReferenceText[index] ?? null
      return {
        position: index + 1,
        studentCharacter,
        referenceCharacter,
        matches:
          studentCharacter !== null &&
          studentCharacter === referenceCharacter,
      }
    }),
  }
}

export function compareTranscription(
  studentLines: readonly string[],
  referenceLines: readonly string[],
): TranscriptionComparison {
  if (
    studentLines.length !== TRANSCRIPTION_LINE_COUNT ||
    referenceLines.length !== TRANSCRIPTION_LINE_COUNT
  ) {
    throw new Error(
      `Transcription comparison requires exactly ${TRANSCRIPTION_LINE_COUNT} lines.`,
    )
  }

  const lines = studentLines.map((studentText, index) =>
    compareTranscriptionLine(
      studentText,
      referenceLines[index],
      index + 1,
    ),
  )

  return {
    lines,
    hasDifferences: lines.some((line) => line.status !== 'matches'),
  }
}
