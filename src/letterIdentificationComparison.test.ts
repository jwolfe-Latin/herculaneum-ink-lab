import { describe, expect, it } from 'vitest'
import {
  LETTER_REGION_IOU_THRESHOLD,
  compareLetterIdentification,
  rectangleIntersectionOverUnion,
} from './letterIdentificationComparison'
import type { LetterRegion } from './letterRegions'

const region = (
  id: string,
  x: number,
  y: number,
  label = 'A',
  lineNumber = 1,
  width = 20,
  height = 20,
): LetterRegion => ({
  id,
  x,
  y,
  width,
  height,
  label,
  lineNumber,
})

describe('student letter-identification comparison', () => {
  it('documents a tunable 0.35 overlap threshold', () => {
    expect(LETTER_REGION_IOU_THRESHOLD).toBe(0.35)
  })

  it('calculates rectangle intersection over union in source coordinates', () => {
    expect(
      rectangleIntersectionOverUnion(
        region('a', 0, 0),
        region('b', 0, 0),
      ),
    ).toBe(1)
    expect(
      rectangleIntersectionOverUnion(
        region('a', 0, 0),
        region('b', 10, 0),
      ),
    ).toBeCloseTo(1 / 3)
    expect(
      rectangleIntersectionOverUnion(
        region('a', 0, 0),
        region('b', 30, 30),
      ),
    ).toBe(0)
  })

  it('matches overlapping regions with the same label and line', () => {
    const result = compareLetterIdentification(
      [region('student', 2, 2, 'D', 1)],
      [region('reference', 0, 0, 'D', 1)],
    )

    expect(result.counts).toEqual({
      matchedLetters: 1,
      missedReferenceLetters: 0,
      studentOnlySelections: 0,
      labelOrLineMismatches: 0,
    })
  })

  it('does not require exact rectangle equality', () => {
    const result = compareLetterIdentification(
      [region('student', 4, 4, 'D', 1, 24, 24)],
      [region('reference', 0, 0, 'D', 1, 25, 25)],
    )

    expect(result.matchedLetters).toHaveLength(1)
    expect(result.matchedLetters[0].overlap).toBeLessThan(1)
    expect(result.matchedLetters[0].overlap).toBeGreaterThan(
      LETTER_REGION_IOU_THRESHOLD,
    )
  })

  it('classifies a label mismatch for a spatial pair', () => {
    const result = compareLetterIdentification(
      [region('student', 0, 0, 'M', 1)],
      [region('reference', 0, 0, 'D', 1)],
    )

    expect(result.mismatches).toHaveLength(1)
    expect(result.mismatches[0].reason).toBe('label')
    expect(result.counts.labelOrLineMismatches).toBe(1)
  })

  it('classifies a line-number mismatch for a spatial pair', () => {
    const result = compareLetterIdentification(
      [region('student', 0, 0, 'D', 2)],
      [region('reference', 0, 0, 'D', 1)],
    )

    expect(result.mismatches[0].reason).toBe('line')
  })

  it('classifies a combined label and line mismatch', () => {
    const result = compareLetterIdentification(
      [region('student', 0, 0, 'M', 2)],
      [region('reference', 0, 0, 'D', 1)],
    )

    expect(result.mismatches[0].reason).toBe('label-and-line')
  })

  it('classifies unmatched reference regions as missed', () => {
    const result = compareLetterIdentification(
      [],
      [region('reference', 0, 0, 'D', 1)],
    )

    expect(result.missedReferenceLetters).toHaveLength(1)
    expect(result.counts.missedReferenceLetters).toBe(1)
  })

  it('classifies unmatched student regions as student-only', () => {
    const result = compareLetterIdentification(
      [region('student', 60, 60, 'D', 1)],
      [region('reference', 0, 0, 'D', 1)],
    )

    expect(result.studentOnlySelections).toHaveLength(1)
    expect(result.missedReferenceLetters).toHaveLength(1)
  })

  it('does not treat overlap below the threshold as a spatial pair', () => {
    const result = compareLetterIdentification(
      [region('student', 10, 0, 'D', 1)],
      [region('reference', 0, 0, 'D', 1)],
    )

    expect(result.matchedLetters).toHaveLength(0)
    expect(result.mismatches).toHaveLength(0)
    expect(result.studentOnlySelections).toHaveLength(1)
    expect(result.missedReferenceLetters).toHaveLength(1)
  })

  it('supports later threshold adjustment through the named parameter', () => {
    const student = region('student', 10, 0, 'D', 1)
    const reference = region('reference', 0, 0, 'D', 1)

    expect(
      compareLetterIdentification([student], [reference], 0.3)
        .matchedLetters,
    ).toHaveLength(1)
  })

  it('uses one-to-one matching when student boxes duplicate one reference', () => {
    const result = compareLetterIdentification(
      [
        region('student-1', 0, 0, 'D', 1),
        region('student-2', 1, 1, 'D', 1),
      ],
      [region('reference', 0, 0, 'D', 1)],
    )

    expect(result.matchedLetters).toHaveLength(1)
    expect(result.studentOnlySelections).toHaveLength(1)
    expect(result.missedReferenceLetters).toHaveLength(0)
  })

  it('never pairs one student box with multiple reference boxes', () => {
    const result = compareLetterIdentification(
      [region('student', 0, 0, 'D', 1, 30, 20)],
      [
        region('reference-1', 0, 0, 'D', 1),
        region('reference-2', 10, 0, 'D', 1),
      ],
      0.25,
    )

    expect(result.matchedLetters).toHaveLength(1)
    expect(result.missedReferenceLetters).toHaveLength(1)
  })
})

