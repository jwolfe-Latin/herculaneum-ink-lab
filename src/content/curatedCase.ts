export const ACTIVITY_TYPES = [
  'ink-identification',
  'letter-identification',
  'transcription',
  'word-segmentation',
  'translation',
] as const

export type ActivityType = (typeof ACTIVITY_TYPES)[number]

export const SOURCE_TYPES = [
  'inscription',
  'papyrus',
  'parchment',
  'manuscript',
  'other',
] as const

export type SourceType = (typeof SOURCE_TYPES)[number]

export type InvestigationDifficulty =
  | 'introductory'
  | 'developing'
  | 'advanced'

export type CuratedDevelopmentStatus = 'in-development' | 'available'
export type CuratedStageStatus = 'available' | 'coming-later'

export type CuratedStageAvailability = {
  activity: ActivityType
  label: string
  status: CuratedStageStatus
}

export type CuratedSourceImage = {
  publicPath: string
  width: number
  height: number
  format: 'png'
}

export type CuratedLetterReference = {
  sourcePath: string
  assetUrl: string
  schemaVersion: 1
  regionCount: number
}

export type SimplifiedNotation = {
  missingText: string
  insecureLetter: string
  unreadableCharacter: string
  lineContinuation: string
  hasUncertainLetters: boolean
}

export type PublicDomainImageSource = {
  underlyingSource: string
  digitalScan: string
  digitalRecordUrl: string
  page: number
  imageDescription: string
  provenance: string
  rightsDetermination: string
  creditLine: string
  requiredNotice: string
}

export type ModernCatalogueSource = {
  sourceName: string
  catalogueReference: string
  recordTitle: string
  modernLocation: string
  institutionOrAccessionNumber: string
  recordUrl: string
  textualDataNotice: string
  requiredAttribution: string
}

export type ApprovedStudentContext = {
  text: string
  authorship: 'instructor-authored'
  informedBy: string
  approval: 'approved-for-student-use'
}

/**
 * Permanent, instructor-approved data for a curated investigation.
 *
 * These fields intentionally keep source-image rights, modern textual rights,
 * diplomatic transcription, normalized reading, segmentation, and translation
 * separate. Activity components can consume the field they need without
 * transforming the official case ID or inferring one representation from
 * another.
 */
export type CuratedInvestigation = {
  id: string
  publicFolderName: string
  title: string
  shortDescription: string
  sourceType: SourceType
  objectType: string
  language: string
  stages: ActivityType[]
  stageAvailability: CuratedStageAvailability[]
  difficulty: InvestigationDifficulty
  estimatedMinutes: number
  developmentStatus: CuratedDevelopmentStatus
  statusLabel: string
  sourceImage: CuratedSourceImage
  letterReferenceAvailable: boolean
  letterReference: CuratedLetterReference
  diplomaticTranscription: string
  normalizedInstructorReading: string
  wordSegmentationReference: string
  translation: string
  notation: SimplifiedNotation
  imageSource: PublicDomainImageSource
  catalogueSource: ModernCatalogueSource
  studentContext: ApprovedStudentContext
  enabled: boolean
}

export function isActivityType(value: string): value is ActivityType {
  return (ACTIVITY_TYPES as readonly string[]).includes(value)
}

export function validateCuratedInvestigation(
  investigation: CuratedInvestigation,
) {
  const errors: string[] = []
  const requiredText: Array<[string, string]> = [
    ['official case ID', investigation.id],
    ['public folder name', investigation.publicFolderName],
    ['title', investigation.title],
    ['short description', investigation.shortDescription],
    ['object type', investigation.objectType],
    ['language', investigation.language],
    ['diplomatic transcription', investigation.diplomaticTranscription],
    ['normalized instructor reading', investigation.normalizedInstructorReading],
    ['word-segmentation reference', investigation.wordSegmentationReference],
    ['translation', investigation.translation],
    ['image citation', investigation.imageSource.creditLine],
    ['image rights', investigation.imageSource.rightsDetermination],
    ['textual attribution', investigation.catalogueSource.requiredAttribution],
    ['student-facing context', investigation.studentContext.text],
  ]

  requiredText.forEach(([label, value]) => {
    if (!value.trim()) errors.push(`Missing ${label}.`)
  })

  if (!(SOURCE_TYPES as readonly string[]).includes(investigation.sourceType)) {
    errors.push(`Invalid source type: ${investigation.sourceType}.`)
  }
  if (
    investigation.stages.length === 0 ||
    investigation.stages.some((stage) => !isActivityType(stage))
  ) {
    errors.push('Activity stages must contain only supported activity types.')
  }
  if (
    investigation.stageAvailability.length !==
      investigation.stages.length ||
    investigation.stageAvailability.some(
      (stage, index) =>
        stage.activity !== investigation.stages[index],
    )
  ) {
    errors.push(
      'Stage availability must describe every activity in its approved order.',
    )
  }
  if (
    !Number.isInteger(investigation.sourceImage.width) ||
    !Number.isInteger(investigation.sourceImage.height) ||
    investigation.sourceImage.width <= 0 ||
    investigation.sourceImage.height <= 0
  ) {
    errors.push('Source-image dimensions must be positive whole numbers.')
  }
  if (
    investigation.sourceImage.publicPath !==
    `cases/${investigation.publicFolderName}/source.png`
  ) {
    errors.push(
      'The source-image path must use the exact public folder name and source.png.',
    )
  }
  if (
    investigation.letterReferenceAvailable &&
    investigation.letterReference.regionCount <= 0
  ) {
    errors.push(
      'An available letter reference must contain at least one region.',
    )
  }
  if (
    investigation.diplomaticTranscription ===
    investigation.normalizedInstructorReading
  ) {
    errors.push(
      'Diplomatic transcription and normalized instructor reading must remain distinct.',
    )
  }
  if (investigation.wordSegmentationReference.includes('(')) {
    errors.push(
      'Word segmentation must not require abbreviation expansion.',
    )
  }
  if (
    investigation.imageSource.rightsDetermination ===
    investigation.catalogueSource.textualDataNotice
  ) {
    errors.push('Image rights and textual-data rights must remain distinct.')
  }
  if (
    investigation.developmentStatus === 'in-development' &&
    investigation.enabled
  ) {
    errors.push('An in-development case cannot be enabled.')
  }

  return errors
}

export function assertValidCuratedInvestigation(
  investigation: CuratedInvestigation,
) {
  const errors = validateCuratedInvestigation(investigation)
  if (errors.length > 0) {
    throw new Error(
      `Invalid curated investigation ${investigation.id}: ${errors.join(' ')}`,
    )
  }
  return investigation
}
