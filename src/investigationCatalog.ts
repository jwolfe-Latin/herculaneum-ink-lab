import { RIB_785_CASE } from './content/curated/RIB 785/case'
import type {
  ActivityType,
  CuratedInvestigation,
} from './content/curatedCase'

export {
  ACTIVITY_TYPES,
  SOURCE_TYPES,
  isActivityType,
  type ActivityType,
  type CuratedInvestigation,
  type InvestigationDifficulty,
  type SourceType,
} from './content/curatedCase'

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

export const LATIN_TEXT_INVESTIGATIONS: readonly CuratedInvestigation[] = [
  RIB_785_CASE,
]

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

export function hasActivity(
  investigation: CuratedInvestigation,
  activity: ActivityType,
) {
  return investigation.stages.includes(activity)
}
