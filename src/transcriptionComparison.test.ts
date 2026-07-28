import { describe, expect, it } from 'vitest'
import {
  compareTranscription,
  compareTranscriptionLine,
  normalizeTranscriptionDisplay,
  normalizeTranscriptionForComparison,
} from './transcriptionComparison'

const reference = [
  'D M',
  'CRESCENTINV',
  'S VIXIT ANNIS',
  'XVIII VIDARIS',
  'PATER POSVIT',
]

describe('transcription comparison', () => {
  it('uppercases and trims without changing diplomatic characters', () => {
    expect(normalizeTranscriptionDisplay('  posvit? — [x]  ')).toBe(
      'POSVIT? — [X]',
    )
  })

  it('collapses repeated spaces for display', () => {
    expect(normalizeTranscriptionDisplay('D   M')).toBe('D M')
  })

  it('removes only ordinary spaces for letter comparison', () => {
    expect(normalizeTranscriptionForComparison(' D  M ')).toBe('DM')
    expect(normalizeTranscriptionForComparison('[D] — M?')).toBe('[D]—M?')
  })

  it.each(['DM', 'D M', 'D  M'])(
    'treats %s as the same letter sequence as D M',
    (student) => {
      expect(compareTranscriptionLine(student, 'D M').status).toBe('matches')
    },
  )

  it('keeps V and U distinct', () => {
    expect(compareTranscriptionLine('POSUIT', 'POSVIT').status).toBe(
      'different-character',
    )
  })

  it('does not expand D M', () => {
    expect(
      compareTranscriptionLine('DIS MANIBUS', 'D M').status,
    ).toBe('extra-character')
  })

  it('detects a missing character', () => {
    expect(compareTranscriptionLine('POSVI', 'POSVIT').status).toBe(
      'missing-character',
    )
  })

  it('detects an extra character', () => {
    expect(compareTranscriptionLine('POSVITT', 'POSVIT').status).toBe(
      'extra-character',
    )
  })

  it('detects a different character', () => {
    expect(compareTranscriptionLine('POSVIX', 'POSVIT').status).toBe(
      'different-character',
    )
  })

  it('detects a character order difference', () => {
    expect(compareTranscriptionLine('POSVTI', 'POSVIT').status).toBe(
      'character-order-difference',
    )
  })

  it('provides character-level comparisons', () => {
    const result = compareTranscriptionLine('POSVI', 'POSVIT')
    expect(result.characters).toHaveLength(6)
    expect(result.characters[5]).toMatchObject({
      studentCharacter: null,
      referenceCharacter: 'T',
      matches: false,
    })
  })

  it('keeps line boundaries distinct', () => {
    const result = compareTranscription(
      ['DM', 'CRESCENTINVS', 'VIXIT ANNIS', 'XVIII VIDARIS', 'PATER POSVIT'],
      reference,
    )
    expect(result.lines[1].status).not.toBe('matches')
    expect(result.lines[2].status).not.toBe('matches')
  })

  it('recognizes the five exact diplomatic lines', () => {
    const result = compareTranscription(reference, reference)
    expect(result.hasDifferences).toBe(false)
    expect(result.lines.every((line) => line.status === 'matches')).toBe(true)
  })

  it('requires exactly five student and reference lines', () => {
    expect(() => compareTranscription(['D M'], reference)).toThrow(
      'exactly 5 lines',
    )
  })
})
