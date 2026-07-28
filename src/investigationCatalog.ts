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

export type InstructorComparisonData = {
  kind: 'reference-mask' | 'transcription' | 'word-segmentation' | 'translation'
  value?: string
  asset?: string
}

/**
 * General, permanent case definition for future curated investigations.
 *
 * Most response and comparison fields are optional so a Latin case does not
 * require the reference-mask scoring used by the Herculaneum tutorial.
 * Ordered stages declare future intent only; sequencing is not implemented.
 */
export type CuratedInvestigation = {
  id: string
  title: string
  shortDescription: string
  sourceType: SourceType
  language: string
  stages: ActivityType[]
  difficulty: InvestigationDifficulty
  estimatedMinutes: number
  sourceImage?: string
  instructorComparison?: InstructorComparisonData[]
  normalizedTranscription?: string
  wordSegmentation?: string
  translation?: string
  uncertaintyMarkers?: string[]
  sourceCredit?: string
  license?: string
  enabled: boolean
}

export type TutorialInvestigation = {
  id: string
  title: string
  sourceType: 'papyrus'
  language: 'Greek'
  stages: readonly ['ink-identification']
  assetStorage: 'packaged-with-site'
}

export const HERCULANEUM_TUTORIAL: TutorialInvestigation = {
  id: 'herculaneum-ink-tutorial',
  title: 'Herculaneum Ink Tutorial',
  sourceType: 'papyrus',
  language: 'Greek',
  stages: ['ink-identification'],
  assetStorage: 'packaged-with-site',
}

export type ExperimentalWorkspaceDefinition = {
  enabled: false
  imageStorage: 'browser-memory-only'
  classifierIntegration: 'separate-future-interface'
}

export const EXPERIMENTAL_WORKSPACE: ExperimentalWorkspaceDefinition = {
  enabled: false,
  imageStorage: 'browser-memory-only',
  classifierIntegration: 'separate-future-interface',
}

export function isActivityType(value: string): value is ActivityType {
  return (ACTIVITY_TYPES as readonly string[]).includes(value)
}
