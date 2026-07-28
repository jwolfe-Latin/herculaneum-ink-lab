import { describe, expect, it } from 'vitest'
import {
  createLetterIdentificationSession,
  snapshotLetterIdentificationSession,
} from './letterIdentificationSession'

const metadata = {
  caseId: 'RIB 785',
  title: 'RIB 785 title',
  sourceCredit: 'Source credit',
}

describe('letter-identification session data', () => {
  it('starts as an empty browser-memory session', () => {
    expect(createLetterIdentificationSession(metadata)).toEqual({
      caseId: 'RIB 785',
      caseMetadata: {
        title: 'RIB 785 title',
        sourceCredit: 'Source credit',
      },
      studentRegions: [],
      comparisonCounts: null,
      checkedAtLeastOnce: false,
      comparisonCurrent: false,
      instructorReferenceRevealed: false,
      stageStatus: 'in-progress',
    })
  })

  it('prepares plain data for a future report without calculating comparison', () => {
    const session = createLetterIdentificationSession(metadata)
    session.studentRegions = [
      {
        id: 'student-1',
        x: 10,
        y: 20,
        width: 30,
        height: 40,
        label: 'V',
        lineNumber: 2,
      },
    ]
    session.comparisonCounts = {
      matchedLetters: 1,
      missedReferenceLetters: 2,
      studentOnlySelections: 0,
      labelOrLineMismatches: 0,
    }
    session.stageStatus = 'checked'

    const snapshot = snapshotLetterIdentificationSession(session)
    expect(snapshot).toMatchObject({
      caseId: 'RIB 785',
      studentRegions: [{ label: 'V', lineNumber: 2 }],
      comparisonCounts: { matchedLetters: 1 },
      stageStatus: 'checked',
    })
    expect(snapshot.studentRegions[0]).not.toBe(session.studentRegions[0])
    expect(snapshot.comparisonCounts).not.toBe(session.comparisonCounts)
  })
})
