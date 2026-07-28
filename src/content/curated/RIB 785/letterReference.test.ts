import permanentReferenceJson from './letter-reference.json?raw'
import { describe, expect, it } from 'vitest'
import {
  LETTER_REFERENCE_UNCERTAINTIES,
  orderedRegionsForLine,
} from '../../../letterReference'
import {
  RIB_785_LETTER_REFERENCE,
  RIB_785_LETTER_REFERENCE_ASSET_URL,
  RIB_785_LETTER_REFERENCE_CONTEXT,
  RIB_785_LETTER_REFERENCE_REGION_COUNT,
  RIB_785_LETTER_REFERENCE_SKIPPED_IDS,
  parsePermanentRib785LetterReference,
} from './letterReference'

const modifyPermanentJson = (
  update: (value: Record<string, any>) => void,
) => {
  const value = JSON.parse(permanentReferenceJson)
  update(value)
  return JSON.stringify(value)
}

describe('RIB 785 permanent letter reference', () => {
  it('loads schema 1 for the exact case and source dimensions', () => {
    expect(RIB_785_LETTER_REFERENCE).toMatchObject({
      schemaVersion: 1,
      caseId: 'RIB 785',
      sourceImage: { width: 832, height: 1084 },
      exportedAt: '2026-07-28T18:34:00.683Z',
    })
  })

  it('contains exactly the 47 instructor-authored regions', () => {
    expect(RIB_785_LETTER_REFERENCE_REGION_COUNT).toBe(47)
    expect(RIB_785_LETTER_REFERENCE.regions).toHaveLength(47)
  })

  it('has unique stable region IDs', () => {
    const ids = RIB_785_LETTER_REFERENCE.regions.map(
      (region) => region.id,
    )
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every(Boolean)).toBe(true)
  })

  it('accepts intentionally skipped IDs without renumbering', () => {
    expect(RIB_785_LETTER_REFERENCE_SKIPPED_IDS).toEqual([
      'letter-region-25',
      'letter-region-26',
      'letter-region-27',
    ])
    expect(RIB_785_LETTER_REFERENCE.regions[24].id).toBe(
      'letter-region-28',
    )
  })

  it('keeps every rectangle positive and within the 832 by 1084 image', () => {
    for (const region of RIB_785_LETTER_REFERENCE.regions) {
      expect(region.x).toBeGreaterThanOrEqual(0)
      expect(region.y).toBeGreaterThanOrEqual(0)
      expect(region.width).toBeGreaterThan(0)
      expect(region.height).toBeGreaterThan(0)
      expect(region.x + region.width).toBeLessThanOrEqual(832)
      expect(region.y + region.height).toBeLessThanOrEqual(1084)
    }
  })

  it('keeps complete label, line, and uncertainty metadata', () => {
    for (const region of RIB_785_LETTER_REFERENCE.regions) {
      expect(region.label).toMatch(/^[A-Z]+$/)
      expect(region.lineNumber).toBeGreaterThanOrEqual(1)
      expect(region.lineNumber).toBeLessThanOrEqual(5)
      expect(LETTER_REFERENCE_UNCERTAINTIES).toContain(
        region.uncertainty,
      )
    }
  })

  it.each([
    [1, 'DM', 2],
    [2, 'CRESCENTINV', 11],
    [3, 'SVIXITANNIS', 11],
    [4, 'XVIIIVIDARIS', 12],
    [5, 'PATERPOSVIT', 11],
  ])(
    'matches the approved line %i reading %s with %i regions',
    (lineNumber, expected, count) => {
      const regions = orderedRegionsForLine(
        RIB_785_LETTER_REFERENCE.regions,
        lineNumber,
      )
      expect(regions).toHaveLength(count)
      expect(regions.map((region) => region.label).join('')).toBe(
        expected,
      )
    },
  )

  it('contains no acknowledged transcription mismatch', () => {
    expect(
      RIB_785_LETTER_REFERENCE.acknowledgedMismatches,
    ).toEqual([])
  })

  it('preserves exact instructor coordinates for the first and last regions', () => {
    expect(RIB_785_LETTER_REFERENCE.regions[0]).toMatchObject({
      id: 'letter-region-1',
      x: 255.41945623037475,
      y: 193.00154930795344,
      width: 89.76248991510505,
      height: 117.08150858491962,
      label: 'D',
      lineNumber: 1,
      uncertainty: 'certain',
    })
    expect(RIB_785_LETTER_REFERENCE.regions.at(-1)).toMatchObject({
      id: 'letter-region-50',
      x: 633.9830006549482,
      y: 736.7801511028478,
      width: 62.44347124529054,
      height: 81.9570560094437,
      label: 'T',
      lineNumber: 5,
      uncertainty: 'certain',
    })
  })

  it('emits the permanent JSON as a base-path-aware production asset', () => {
    expect(RIB_785_LETTER_REFERENCE_ASSET_URL).toMatch(
      /^\/herculaneum-ink-lab\/.*letter-reference.*\.json$/,
    )
  })

  it('rejects the wrong case ID', () => {
    expect(() =>
      parsePermanentRib785LetterReference(
        modifyPermanentJson((value) => {
          value.caseId = 'rib-785'
        }),
      ),
    ).toThrow('must belong to RIB 785')
  })

  it('rejects obsolete source dimensions', () => {
    expect(() =>
      parsePermanentRib785LetterReference(
        modifyPermanentJson((value) => {
          value.sourceImage = { width: 1030, height: 1392 }
        }),
      ),
    ).toThrow('must use 832')
  })

  it('rejects a duplicate region ID', () => {
    expect(() =>
      parsePermanentRib785LetterReference(
        modifyPermanentJson((value) => {
          value.regions[1].id = value.regions[0].id
        }),
      ),
    ).toThrow('Duplicate region ID')
  })

  it('rejects an out-of-bounds rectangle', () => {
    expect(() =>
      parsePermanentRib785LetterReference(
        modifyPermanentJson((value) => {
          value.regions[0].x = 831
        }),
      ),
    ).toThrow('outside the source image')
  })

  it('rejects a missing permanent uncertainty field', () => {
    expect(() =>
      parsePermanentRib785LetterReference(
        modifyPermanentJson((value) => {
          delete value.regions[0].uncertainty
        }),
      ),
    ).toThrow('must include coordinates')
  })

  it('rejects an unsupported uncertainty value', () => {
    expect(() =>
      parsePermanentRib785LetterReference(
        modifyPermanentJson((value) => {
          value.regions[0].uncertainty = 'maybe'
        }),
      ),
    ).toThrow('unsupported uncertainty status')
  })

  it('rejects a transcription mismatch instead of correcting it', () => {
    expect(() =>
      parsePermanentRib785LetterReference(
        modifyPermanentJson((value) => {
          value.regions[0].label = 'X'
        }),
      ),
    ).toThrow('does not match the diplomatic transcription')
  })

  it('rejects acknowledged mismatches in the permanent file', () => {
    expect(() =>
      parsePermanentRib785LetterReference(
        modifyPermanentJson((value) => {
          value.acknowledgedMismatches = [
            { lineNumber: 1, expected: 'DM', actual: 'XM' },
          ]
        }),
      ),
    ).toThrow('cannot contain acknowledged mismatches')
  })

  it('rejects fewer or more than 47 regions', () => {
    expect(() =>
      parsePermanentRib785LetterReference(
        modifyPermanentJson((value) => {
          value.regions.pop()
        }),
      ),
    ).toThrow()
  })

  it('uses the documented five-line validation context', () => {
    expect(RIB_785_LETTER_REFERENCE_CONTEXT).toEqual({
      caseId: 'RIB 785',
      sourceSize: { width: 832, height: 1084 },
      transcriptionLines: [
        'D M',
        'CRESCENTINV',
        'S VIXIT ANNIS',
        'XVIII VIDARIS',
        'PATER POSVIT',
      ],
      validLineNumbers: [1, 2, 3, 4, 5],
    })
  })
})
