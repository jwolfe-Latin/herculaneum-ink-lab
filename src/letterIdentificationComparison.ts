import type { LetterRegion } from './letterRegions'

/**
 * A 0.35 intersection-over-union threshold allows meaningful variation in
 * hand-drawn boxes while still requiring both rectangles to describe mostly
 * the same visible letter. It is a named value so later classroom review can
 * tune it without changing the matching algorithm.
 */
export const LETTER_REGION_IOU_THRESHOLD = 0.35

export type LetterMismatchReason =
  | 'label'
  | 'line'
  | 'label-and-line'

export type MatchedLetter = {
  studentRegion: LetterRegion
  referenceRegion: LetterRegion
  overlap: number
}

export type MismatchedLetter = MatchedLetter & {
  reason: LetterMismatchReason
}

export type LetterIdentificationComparison = {
  matchedLetters: MatchedLetter[]
  missedReferenceLetters: LetterRegion[]
  studentOnlySelections: LetterRegion[]
  mismatches: MismatchedLetter[]
  counts: {
    matchedLetters: number
    missedReferenceLetters: number
    studentOnlySelections: number
    labelOrLineMismatches: number
  }
}

export function rectangleIntersectionOverUnion(
  first: LetterRegion,
  second: LetterRegion,
) {
  const left = Math.max(first.x, second.x)
  const top = Math.max(first.y, second.y)
  const right = Math.min(
    first.x + first.width,
    second.x + second.width,
  )
  const bottom = Math.min(
    first.y + first.height,
    second.y + second.height,
  )
  const intersection =
    Math.max(0, right - left) * Math.max(0, bottom - top)
  if (intersection === 0) return 0
  const union =
    first.width * first.height +
    second.width * second.height -
    intersection
  return union > 0 ? intersection / union : 0
}

/**
 * Candidate spatial pairs are sorted by strongest overlap and accepted
 * greedily. Once either region is paired it cannot be paired again. Metadata
 * determines whether that spatial pair is a match or a label/line mismatch.
 */
export function compareLetterIdentification(
  studentRegions: readonly LetterRegion[],
  referenceRegions: readonly LetterRegion[],
  threshold = LETTER_REGION_IOU_THRESHOLD,
): LetterIdentificationComparison {
  const candidates = studentRegions.flatMap((studentRegion) =>
    referenceRegions
      .map((referenceRegion) => ({
        studentRegion,
        referenceRegion,
        overlap: rectangleIntersectionOverUnion(
          studentRegion,
          referenceRegion,
        ),
      }))
      .filter((candidate) => candidate.overlap >= threshold),
  )
  candidates.sort(
    (a, b) =>
      b.overlap - a.overlap ||
      a.studentRegion.id.localeCompare(b.studentRegion.id) ||
      a.referenceRegion.id.localeCompare(b.referenceRegion.id),
  )

  const usedStudentIds = new Set<string>()
  const usedReferenceIds = new Set<string>()
  const matchedLetters: MatchedLetter[] = []
  const mismatches: MismatchedLetter[] = []

  for (const candidate of candidates) {
    if (
      usedStudentIds.has(candidate.studentRegion.id) ||
      usedReferenceIds.has(candidate.referenceRegion.id)
    ) {
      continue
    }
    usedStudentIds.add(candidate.studentRegion.id)
    usedReferenceIds.add(candidate.referenceRegion.id)

    const labelMatches =
      candidate.studentRegion.label?.trim().toUpperCase() ===
      candidate.referenceRegion.label?.trim().toUpperCase()
    const lineMatches =
      candidate.studentRegion.lineNumber ===
      candidate.referenceRegion.lineNumber

    if (labelMatches && lineMatches) {
      matchedLetters.push(candidate)
    } else {
      mismatches.push({
        ...candidate,
        reason:
          !labelMatches && !lineMatches
            ? 'label-and-line'
            : labelMatches
              ? 'line'
              : 'label',
      })
    }
  }

  const missedReferenceLetters = referenceRegions.filter(
    (region) => !usedReferenceIds.has(region.id),
  )
  const studentOnlySelections = studentRegions.filter(
    (region) => !usedStudentIds.has(region.id),
  )

  return {
    matchedLetters,
    missedReferenceLetters,
    studentOnlySelections,
    mismatches,
    counts: {
      matchedLetters: matchedLetters.length,
      missedReferenceLetters: missedReferenceLetters.length,
      studentOnlySelections: studentOnlySelections.length,
      labelOrLineMismatches: mismatches.length,
    },
  }
}

