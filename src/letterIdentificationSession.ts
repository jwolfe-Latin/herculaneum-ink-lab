import type { LetterIdentificationComparison } from './letterIdentificationComparison'
import type { LetterRegion } from './letterRegions'
import type { TranscriptionComparison } from './transcriptionComparison'

export type LetterIdentificationStageStatus =
  | 'in-progress'
  | 'checked'
  | 'complete'

/**
 * Plain in-memory case-session data for the implemented RIB 785 stages.
 *
 * Letter Identification and Transcription share this object so future stages
 * and reporting can be added without reading component-specific state. No
 * browser storage, accounts, export, or network persistence is used.
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
  studentTranscription: [string, string, string, string, string]
  transcriptionCheckCount: number
  transcriptionComparison: TranscriptionComparison | null
  transcriptionComparisonCurrent: boolean
  transcriptionReferenceRevealed: boolean
  transcriptionStageStatus: LetterIdentificationStageStatus
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
    studentTranscription: ['', '', '', '', ''],
    transcriptionCheckCount: 0,
    transcriptionComparison: null,
    transcriptionComparisonCurrent: false,
    transcriptionReferenceRevealed: false,
    transcriptionStageStatus: 'in-progress',
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
    studentTranscription: [...session.studentTranscription],
    transcriptionComparison: session.transcriptionComparison
      ? {
          ...session.transcriptionComparison,
          lines: session.transcriptionComparison.lines.map((line) => ({
            ...line,
            characters: line.characters.map((character) => ({
              ...character,
            })),
          })),
        }
      : null,
  }
}
