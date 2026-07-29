import type { LetterIdentificationComparison } from './letterIdentificationComparison'
import type { LetterRegion } from './letterRegions'
import type { TranscriptionComparison } from './transcriptionComparison'
import type { WordSegmentationComparison } from './wordSegmentationComparison'

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
  transcriptionVersion: number
  studentSegmentation: [string, string, string, string, string]
  segmentationSourceTranscription: [
    string,
    string,
    string,
    string,
    string,
  ]
  segmentationSourceVersion: number | null
  segmentationCheckCount: number
  segmentationComparison: WordSegmentationComparison | null
  segmentationComparisonCurrent: boolean
  segmentationReferenceRevealed: boolean
  segmentationStageStatus: LetterIdentificationStageStatus
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
    transcriptionVersion: 0,
    studentSegmentation: ['', '', '', '', ''],
    segmentationSourceTranscription: ['', '', '', '', ''],
    segmentationSourceVersion: null,
    segmentationCheckCount: 0,
    segmentationComparison: null,
    segmentationComparisonCurrent: false,
    segmentationReferenceRevealed: false,
    segmentationStageStatus: 'in-progress',
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
    studentSegmentation: [...session.studentSegmentation],
    segmentationSourceTranscription: [
      ...session.segmentationSourceTranscription,
    ],
    segmentationComparison: session.segmentationComparison
      ? {
          ...session.segmentationComparison,
          lines: session.segmentationComparison.lines.map((line) => ({
            ...line,
            studentBoundaries: [...line.studentBoundaries],
            referenceBoundaries: [...line.referenceBoundaries],
            matchingBoundaries: [...line.matchingBoundaries],
            missingBoundaries: [...line.missingBoundaries],
            extraBoundaries: [...line.extraBoundaries],
          })),
        }
      : null,
  }
}
