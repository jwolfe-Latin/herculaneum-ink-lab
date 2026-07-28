import { describe, expect, it } from 'vitest'
import {
  ACTIVITY_TYPES,
  HERCULANEUM_TUTORIAL,
  LATIN_TEXT_INVESTIGATIONS,
  isActivityType,
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

  it('registers RIB 785 with only letter identification available', () => {
    expect(LATIN_TEXT_INVESTIGATIONS).toHaveLength(1)
    expect(LATIN_TEXT_INVESTIGATIONS[0]).toMatchObject({
      id: 'RIB 785',
      language: 'Latin',
      sourceType: 'inscription',
      developmentStatus: 'available',
      enabled: true,
    })
    expect(LATIN_TEXT_INVESTIGATIONS[0].stageAvailability).toEqual([
      {
        activity: 'letter-identification',
        label: 'Letter Identification',
        status: 'available',
      },
      {
        activity: 'transcription',
        label: 'Transcription',
        status: 'coming-later',
      },
      {
        activity: 'word-segmentation',
        label: 'Word Segmentation',
        status: 'coming-later',
      },
      {
        activity: 'translation',
        label: 'Translation',
        status: 'coming-later',
      },
    ])
  })
})
