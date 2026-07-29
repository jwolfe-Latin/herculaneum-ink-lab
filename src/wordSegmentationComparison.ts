import { normalizeTranscriptionDisplay } from './transcriptionComparison'

export type WordBoundaryPosition = number

export type WordSegmentationLineComparison = {
  lineNumber: number
  studentText: string
  sourceTranscription: string
  referenceText: string
  normalizedStudentText: string
  normalizedReferenceText: string
  studentCharacterSequence: string
  sourceCharacterSequence: string
  changedLetters: boolean
  studentBoundaries: WordBoundaryPosition[]
  referenceBoundaries: WordBoundaryPosition[]
  matchingBoundaries: WordBoundaryPosition[]
  missingBoundaries: WordBoundaryPosition[]
  extraBoundaries: WordBoundaryPosition[]
}

export type WordSegmentationComparison = {
  lines: WordSegmentationLineComparison[]
  hasChangedLetters: boolean
  hasBoundaryDifferences: boolean
}

export function normalizeSegmentationDisplay(text: string) {
  return normalizeTranscriptionDisplay(text)
}

export function segmentationCharacterSequence(text: string) {
  return normalizeSegmentationDisplay(text).replace(/ /g, '')
}

/**
 * Represents every ordinary-space boundary by the number of non-space
 * characters before it. Leading, trailing, and repeated spaces are ignored.
 */
export function wordBoundaryPositions(text: string): WordBoundaryPosition[] {
  const normalized = normalizeSegmentationDisplay(text)
  if (!normalized) return []

  const tokens = normalized.split(' ')
  let charactersSeen = 0
  return tokens.slice(0, -1).map((token) => {
    charactersSeen += Array.from(token).length
    return charactersSeen
  })
}

function intersection(left: readonly number[], right: readonly number[]) {
  const rightSet = new Set(right)
  return left.filter((value) => rightSet.has(value))
}

function difference(left: readonly number[], right: readonly number[]) {
  const rightSet = new Set(right)
  return left.filter((value) => !rightSet.has(value))
}

export function compareWordSegmentationLine(
  studentText: string,
  sourceTranscription: string,
  referenceText: string,
  lineNumber = 1,
): WordSegmentationLineComparison {
  const normalizedStudentText = normalizeSegmentationDisplay(studentText)
  const normalizedReferenceText = normalizeSegmentationDisplay(referenceText)
  const studentCharacterSequence =
    segmentationCharacterSequence(studentText)
  const sourceCharacterSequence =
    segmentationCharacterSequence(sourceTranscription)
  const changedLetters = studentCharacterSequence !== sourceCharacterSequence
  const studentBoundaries = wordBoundaryPositions(studentText)
  const referenceBoundaries = wordBoundaryPositions(referenceText)

  return {
    lineNumber,
    studentText,
    sourceTranscription,
    referenceText,
    normalizedStudentText,
    normalizedReferenceText,
    studentCharacterSequence,
    sourceCharacterSequence,
    changedLetters,
    studentBoundaries,
    referenceBoundaries,
    matchingBoundaries: changedLetters
      ? []
      : intersection(studentBoundaries, referenceBoundaries),
    missingBoundaries: changedLetters
      ? [...referenceBoundaries]
      : difference(referenceBoundaries, studentBoundaries),
    extraBoundaries: changedLetters
      ? [...studentBoundaries]
      : difference(studentBoundaries, referenceBoundaries),
  }
}

export function compareWordSegmentation(
  studentLines: readonly string[],
  sourceLines: readonly string[],
  referenceLines: readonly string[],
): WordSegmentationComparison {
  if (
    studentLines.length !== 5 ||
    sourceLines.length !== 5 ||
    referenceLines.length !== 5
  ) {
    throw new Error('Word segmentation comparison requires exactly 5 lines.')
  }

  const lines = studentLines.map((studentText, index) =>
    compareWordSegmentationLine(
      studentText,
      sourceLines[index],
      referenceLines[index],
      index + 1,
    ),
  )

  return {
    lines,
    hasChangedLetters: lines.some((line) => line.changedLetters),
    hasBoundaryDifferences: lines.some(
      (line) =>
        line.missingBoundaries.length > 0 ||
        line.extraBoundaries.length > 0,
    ),
  }
}
