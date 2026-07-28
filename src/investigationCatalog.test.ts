import { describe, expect, it } from 'vitest'
import {
  ACTIVITY_TYPES,
  HERCULANEUM_TUTORIAL,
  isActivityType,
  type CuratedInvestigation,
} from './investigationCatalog'

describe('investigation catalog architecture', () => {
  it('accepts only the five approved activity types', () => {
    expect(ACTIVITY_TYPES).toEqual([
      'ink-identification',
      'letter-identification',
      'transcription',
      'word-segmentation',
      'translation',
    ])
    ACTIVITY_TYPES.forEach((activity) => {
      expect(isActivityType(activity)).toBe(true)
    })
    ;[
      'transliteration',
      'combined',
      'interpretation',
      'restoration',
      'manuscript-analysis',
      'epigraphic-analysis',
      'automated-translation',
    ].forEach((activity) => {
      expect(isActivityType(activity)).toBe(false)
    })
  })

  it('declares only ink-identification for the Herculaneum tutorial', () => {
    expect(HERCULANEUM_TUTORIAL.stages).toEqual(['ink-identification'])
    expect(HERCULANEUM_TUTORIAL.language).toBe('Greek')
    expect(HERCULANEUM_TUTORIAL.assetStorage).toBe('packaged-with-site')
  })

  it('allows a curated Latin case without mask-based scoring', () => {
    const futureCase = {
      id: 'future-case',
      title: 'Future case',
      shortDescription: 'Not yet populated',
      sourceType: 'inscription',
      language: 'Latin',
      stages: [
        'letter-identification',
        'transcription',
        'word-segmentation',
        'translation',
      ],
      difficulty: 'introductory',
      estimatedMinutes: 30,
      enabled: false,
    } satisfies CuratedInvestigation

    expect(futureCase).not.toHaveProperty('instructorComparison')
    expect(futureCase.stages).toHaveLength(4)
  })
})
