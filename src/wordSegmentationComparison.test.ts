import { describe, expect, it } from 'vitest'
import {
  compareWordSegmentation,
  compareWordSegmentationLine,
  normalizeSegmentationDisplay,
  segmentationCharacterSequence,
  wordBoundaryPositions,
} from './wordSegmentationComparison'

const source = [
  'D M',
  'CRESCENTINV',
  'S VIXIT ANNIS',
  'XVIII VIDARIS',
  'PATER POSVIT',
]
const reference = [
  'D M',
  'CRESCENTINVS',
  'S VIXIT ANNIS',
  'XVIII VIDARIS',
  'PATER POSVIT',
]

describe('word segmentation comparison', () => {
  it('normalizes repeated, leading, and trailing ordinary spaces', () => {
    expect(normalizeSegmentationDisplay('  S   VIXIT  ANNIS ')).toBe(
      'S VIXIT ANNIS',
    )
  })

  it('preserves non-space characters while creating a sequence', () => {
    expect(segmentationCharacterSequence(' D  M ')).toBe('DM')
    expect(segmentationCharacterSequence('POSVIT')).not.toBe('POSUIT')
  })

  it('represents boundaries by positions between visible letters', () => {
    expect(wordBoundaryPositions('S VIXIT ANNIS')).toEqual([1, 6])
    expect(wordBoundaryPositions('CRESCENTINVS')).toEqual([])
  })

  it('ignores repeated spaces when finding boundaries', () => {
    expect(wordBoundaryPositions(' S   VIXIT  ANNIS ')).toEqual([1, 6])
  })

  it('treats the visible D M space as a boundary without expansion', () => {
    const result = compareWordSegmentationLine('D M', 'D M', 'D M')
    expect(result.studentBoundaries).toEqual([1])
    expect(result.matchingBoundaries).toEqual([1])
    expect(result.studentCharacterSequence).toBe('DM')
  })

  it('recognizes matching boundaries', () => {
    const result = compareWordSegmentationLine(
      'S VIXIT ANNIS',
      'S VIXIT ANNIS',
      'S VIXIT ANNIS',
    )
    expect(result.matchingBoundaries).toEqual([1, 6])
    expect(result.missingBoundaries).toEqual([])
    expect(result.extraBoundaries).toEqual([])
  })

  it('detects a missing boundary', () => {
    const result = compareWordSegmentationLine(
      'SVIXIT ANNIS',
      'S VIXIT ANNIS',
      'S VIXIT ANNIS',
    )
    expect(result.missingBoundaries).toEqual([1])
  })

  it('detects an extra boundary', () => {
    const result = compareWordSegmentationLine(
      'S VIX IT ANNIS',
      'S VIXIT ANNIS',
      'S VIXIT ANNIS',
    )
    expect(result.extraBoundaries).toEqual([4])
  })

  it('classifies changed letters separately', () => {
    const result = compareWordSegmentationLine(
      'S VIXIT ANNIU',
      'S VIXIT ANNIS',
      'S VIXIT ANNIS',
    )
    expect(result.changedLetters).toBe(true)
    expect(result.matchingBoundaries).toEqual([])
  })

  it('keeps V and U distinct', () => {
    expect(
      compareWordSegmentationLine('POSUIT', 'POSVIT', 'POSVIT')
        .changedLetters,
    ).toBe(true)
  })

  it('does not ignore inserted punctuation or reordered letters', () => {
    expect(
      compareWordSegmentationLine('PATER, POSVIT', 'PATER POSVIT', 'PATER POSVIT')
        .changedLetters,
    ).toBe(true)
    expect(
      compareWordSegmentationLine('PATER POVSIT', 'PATER POSVIT', 'PATER POSVIT')
        .changedLetters,
    ).toBe(true)
  })

  it('preserves line boundaries', () => {
    const result = compareWordSegmentation(
      ['DM', 'CRESCENTINV S', 'VIXIT ANNIS', 'XVIII VIDARIS', 'PATER POSVIT'],
      source,
      reference,
    )
    expect(result.lines[1].changedLetters).toBe(true)
    expect(result.lines[2].changedLetters).toBe(true)
  })

  it('summarizes boundary differences without a numerical score', () => {
    const result = compareWordSegmentation(
      ['DM', 'CRESCENTINV', 'SVIXIT ANNIS', 'XVIII VIDARIS', 'PATER POSVIT'],
      source,
      reference,
    )
    expect(result.hasBoundaryDifferences).toBe(true)
    expect(result.hasChangedLetters).toBe(false)
    expect(result).not.toHaveProperty('score')
  })

  it('requires exactly five lines', () => {
    expect(() => compareWordSegmentation(['DM'], source, reference)).toThrow(
      'exactly 5 lines',
    )
  })
})
