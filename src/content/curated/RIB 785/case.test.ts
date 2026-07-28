import { describe, expect, it } from 'vitest'
import { publicAssetUrl } from '../../../assetPaths'
import {
  RIB_785_CASE,
  RIB_785_OFFICIAL_ID,
  RIB_785_PUBLIC_FOLDER,
  validateRib785Case,
} from './case'

describe('RIB 785 curated case data', () => {
  it('loads valid metadata with the exact official ID and public folder', () => {
    expect(validateRib785Case()).toEqual([])
    expect(RIB_785_OFFICIAL_ID).toBe('RIB 785')
    expect(RIB_785_PUBLIC_FOLDER).toBe('RIB 785')
    expect(RIB_785_CASE.id).toBe('RIB 785')
    expect(RIB_785_CASE.publicFolderName).toBe('RIB 785')
  })

  it('rejects automatic slugification of the official ID or public folder', () => {
    const changedId = { ...RIB_785_CASE, id: 'rib-785' }
    const changedFolder = {
      ...RIB_785_CASE,
      publicFolderName: 'rib-785',
    }

    expect(validateRib785Case(changedId)).toContain(
      'The official case ID must remain exactly RIB 785.',
    )
    expect(validateRib785Case(changedFolder)).toContain(
      'The public folder name must remain exactly RIB 785.',
    )
  })

  it('uses the authoritative image dimensions and no obsolete dimensions', () => {
    expect(RIB_785_CASE.sourceImage).toEqual({
      publicPath: 'cases/RIB 785/source.png',
      width: 832,
      height: 1084,
      format: 'png',
    })
    expect(JSON.stringify(RIB_785_CASE)).not.toContain('1030')
    expect(JSON.stringify(RIB_785_CASE)).not.toContain('1392')
  })

  it('creates a base-path-aware URL for the folder containing a space', () => {
    expect(publicAssetUrl(RIB_785_CASE.sourceImage.publicPath)).toBe(
      '/herculaneum-ink-lab/cases/RIB%20785/source.png',
    )
  })

  it('stores the four activity stages in the approved order', () => {
    expect(RIB_785_CASE.stages).toEqual([
      'letter-identification',
      'transcription',
      'word-segmentation',
      'translation',
    ])
  })

  it('keeps diplomatic, normalized, segmentation, and translation fields separate', () => {
    expect(RIB_785_CASE.diplomaticTranscription).toContain('CRESCENTINV')
    expect(RIB_785_CASE.diplomaticTranscription).toContain('PATER POSVIT')
    expect(RIB_785_CASE.normalizedInstructorReading).toContain(
      'CRESCENTINUS',
    )
    expect(RIB_785_CASE.normalizedInstructorReading).toContain(
      'D(IS) M(ANIBUS)',
    )
    expect(RIB_785_CASE.wordSegmentationReference).toContain('CRESCENTINVS')
    expect(RIB_785_CASE.wordSegmentationReference).not.toContain('D(IS)')
    expect(RIB_785_CASE.translation).toContain('lived eighteen years')
  })

  it('stores the introductory notation without inventing uncertainty', () => {
    expect(RIB_785_CASE.notation).toEqual({
      missingText: '[missing text]',
      insecureLetter: 'letter?',
      unreadableCharacter: '—',
      lineContinuation:
        'Use the hyphen only when a word continues across a line.',
      hasUncertainLetters: false,
    })
  })

  it('stores Bruce image rights separately from modern RIB attribution', () => {
    expect(RIB_785_CASE.imageSource.page).toBe(414)
    expect(RIB_785_CASE.imageSource.creditLine).toContain(
      'Lapidarium Septentrionale (1875)',
    )
    expect(RIB_785_CASE.imageSource.rightsDetermination).toContain(
      'public domain in the United States',
    )
    expect(RIB_785_CASE.catalogueSource.sourceName).toBe(
      'Roman Inscriptions of Britain Online',
    )
    expect(RIB_785_CASE.catalogueSource.requiredAttribution).toContain(
      'under CC BY 4.0',
    )
    expect(RIB_785_CASE.imageSource.creditLine).not.toContain('RIB Online')
  })

  it('opens only the completed letter-identification stage', () => {
    expect(RIB_785_CASE.developmentStatus).toBe('available')
    expect(RIB_785_CASE.statusLabel).toBe('Begin Investigation')
    expect(RIB_785_CASE.enabled).toBe(true)
    expect(RIB_785_CASE.stageAvailability[0]).toMatchObject({
      activity: 'letter-identification',
      status: 'available',
    })
    expect(
      RIB_785_CASE.stageAvailability
        .slice(1)
        .every((stage) => stage.status === 'coming-later'),
    ).toBe(true)
  })

  it('advertises the reviewed permanent letter-reference capability', () => {
    expect(RIB_785_CASE.letterReferenceAvailable).toBe(true)
    expect(RIB_785_CASE.letterReference).toMatchObject({
      sourcePath:
        'src/content/curated/RIB 785/letter-reference.json',
      schemaVersion: 1,
      regionCount: 47,
    })
    expect(RIB_785_CASE.letterReference.assetUrl).toMatch(
      /letter-reference.*\.json$/,
    )
  })
})
