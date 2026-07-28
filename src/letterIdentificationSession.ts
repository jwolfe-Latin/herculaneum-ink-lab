import type { LetterIdentificationComparison } from './letterIdentificationComparison'
import type { LetterRegion } from './letterRegions'

export type LetterIdentificationStageStatus =
  | 'in-progress'
  | 'checked'
  | 'complete'

/**
 * Plain in-memory data for the RIB 785 letter-identification stage.
 *
 * The UI may be replaced later without changing the future reporting input.
 * No browser storage, accounts, export, or network persistence is used.
 */
export type LetterIdentificationSession = {
  caseId: string
  caseMetadata: {
    title: string
    sourceCredit: string
  }
  studentRegions: LetterRegion[]
  comparisonCounts: LetterIdentificationComparison['counts'] | null
  checkedAtLeastOnce: boolean
  comparisonCurrent: boolean
  instructorReferenceRevealed: boolean
  stageStatus: LetterIdentificationStageStatus
}

export function createLetterIdentificationSession(
  caseMetadata: {
    caseId: string
    title: string
    sourceCredit: string
  },
): LetterIdentificationSession {
  return {
    caseId: caseMetadata.caseId,
    caseMetadata: {
      title: caseMetadata.title,
      sourceCredit: caseMetadata.sourceCredit,
    },
    studentRegions: [],
    comparisonCounts: null,
    checkedAtLeastOnce: false,
    comparisonCurrent: false,
    instructorReferenceRevealed: false,
    stageStatus: 'in-progress',
  }
}

export function snapshotLetterIdentificationSession(
  session: LetterIdentificationSession,
): LetterIdentificationSession {
  return {
    ...session,
    caseMetadata: { ...session.caseMetadata },
    studentRegions: session.studentRegions.map((region) => ({ ...region })),
    comparisonCounts: session.comparisonCounts
      ? { ...session.comparisonCounts }
      : null,
  }
}
