import {
  LETTER_REFERENCE_SCHEMA_VERSION,
  compareRegionsWithTranscription,
  createLetterReferenceDraft,
  createLetterReferenceExport,
  orderedRegionsForLine,
  parseLetterReferenceDraft,
  parseLetterReferenceJson,
  validateLetterReference,
  type LetterReferenceContext,
} from './letterReference'
import type { LetterRegion } from './letterRegions'

const context: LetterReferenceContext = {
  caseId: 'RIB 785',
  sourceSize: { width: 832, height: 1084 },
  transcriptionLines: ['D M', 'V'],
  validLineNumbers: [1, 2],
}

const completeRegions: LetterRegion[] = [
  {
    id: 'r-d',
    x: 10,
    y: 10,
    width: 8,
    height: 10,
    label: 'D',
    lineNumber: 1,
    uncertainty: 'certain',
  },
  {
    id: 'r-m',
    x: 30,
    y: 10,
    width: 8,
    height: 10,
    label: 'M',
    lineNumber: 1,
    uncertainty: 'certain',
  },
  {
    id: 'r-v',
    x: 10,
    y: 30,
    width: 8,
    height: 10,
    label: 'V',
    lineNumber: 2,
    uncertainty: 'damaged',
    note: 'Visible V',
  },
]

describe('letter-reference architecture', () => {
  it('orders a line left to right by default', () => {
    expect(
      orderedRegionsForLine(
        [completeRegions[1], completeRegions[0]],
        1,
      ).map((region) => region.id),
    ).toEqual(['r-d', 'r-m'])
  })

  it('preserves an explicit manual order', () => {
    const manual = completeRegions.slice(0, 2).map((region, index) => ({
      ...region,
      manualOrder: index === 0 ? 2 : 1,
    }))
    expect(
      orderedRegionsForLine(manual, 1).map((region) => region.id),
    ).toEqual(['r-m', 'r-d'])
  })

  it('compares labels without spaces and preserves visible V', () => {
    const comparisons = compareRegionsWithTranscription(
      completeRegions,
      context.transcriptionLines,
    )
    expect(comparisons).toMatchObject([
      { expected: 'D M', actual: 'DM', matches: true },
      { expected: 'V', actual: 'V', matches: true },
    ])
  })

  it('shows mismatches without altering labels', () => {
    const comparisons = compareRegionsWithTranscription(
      [{ ...completeRegions[2], label: 'U' }],
      context.transcriptionLines,
    )
    expect(comparisons[1]).toMatchObject({
      expected: 'V',
      actual: 'U',
      matches: false,
    })
  })

  it('validates complete reference data and blocks malformed data', () => {
    expect(
      validateLetterReference(
        {
          caseId: context.caseId,
          sourceSize: context.sourceSize,
          regions: completeRegions,
        },
        context,
      ).validForFinalExport,
    ).toBe(true)

    const invalid = validateLetterReference(
      {
        caseId: 'wrong',
        sourceSize: { width: 1, height: 1 },
        regions: [
          { ...completeRegions[0], id: 'duplicate', label: '' },
          {
            ...completeRegions[0],
            id: 'duplicate',
            x: 830,
            width: 8,
          },
        ],
      },
      context,
    )
    expect(invalid.validForFinalExport).toBe(false)
    expect(invalid.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'wrong-case-id',
        'wrong-dimensions',
        'missing-label',
        'duplicate-region-id',
        'out-of-bounds',
      ]),
    )
  })

  it('allows an acknowledged transcription discrepancy and records it', () => {
    const mismatched = completeRegions.filter(
      (region) => region.id !== 'r-v',
    )
    const exported = createLetterReferenceExport(
      {
        caseId: context.caseId,
        sourceSize: context.sourceSize,
        regions: mismatched,
        acknowledgedMismatchLines: new Set([2]),
      },
      context,
      '2026-07-28T12:00:00.000Z',
    )
    expect(exported.acknowledgedMismatches).toEqual([
      { lineNumber: 2, expected: 'V', actual: '' },
    ])
    expect(exported.schemaVersion).toBe(LETTER_REFERENCE_SCHEMA_VERSION)
  })

  it('exports ordered metadata and imports valid JSON', () => {
    const exported = createLetterReferenceExport(
      {
        caseId: context.caseId,
        sourceSize: context.sourceSize,
        regions: [completeRegions[1], completeRegions[0], completeRegions[2]],
        acknowledgedMismatchLines: new Set(),
      },
      context,
      '2026-07-28T12:00:00.000Z',
    )
    const imported = parseLetterReferenceJson(
      JSON.stringify(exported),
      context,
    )
    expect(imported.regions.map((region) => region.id)).toEqual([
      'r-d',
      'r-m',
      'r-v',
    ])
    expect(imported.regions[2]).toMatchObject({
      uncertainty: 'damaged',
      note: 'Visible V',
    })
  })

  it('rejects wrong case IDs, dimensions, boundaries, and duplicate IDs', () => {
    const base = createLetterReferenceExport(
      {
        caseId: context.caseId,
        sourceSize: context.sourceSize,
        regions: completeRegions,
        acknowledgedMismatchLines: new Set(),
      },
      context,
    )
    expect(() =>
      parseLetterReferenceJson(
        JSON.stringify({ ...base, caseId: 'RIB 999' }),
        context,
      ),
    ).toThrow('must belong to RIB 785')
    expect(() =>
      parseLetterReferenceJson(
        JSON.stringify({
          ...base,
          sourceImage: { width: 1030, height: 1392 },
        }),
        context,
      ),
    ).toThrow('832 × 1084')
    expect(() =>
      parseLetterReferenceJson(
        JSON.stringify({
          ...base,
          regions: [{ ...base.regions[0], x: 900 }],
        }),
        context,
      ),
    ).toThrow('outside the source image')
    expect(() =>
      parseLetterReferenceJson(
        JSON.stringify({
          ...base,
          regions: [
            base.regions[0],
            { ...base.regions[1], id: base.regions[0].id },
            base.regions[2],
          ],
        }),
        context,
      ),
    ).toThrow('Duplicate region ID')
  })

  it('round-trips an incomplete local draft without requiring labels', () => {
    const draft = createLetterReferenceDraft(
      {
        caseId: context.caseId,
        sourceSize: context.sourceSize,
        regions: [
          {
            id: 'draft-1',
            x: 0,
            y: 0,
            width: 8,
            height: 8,
            uncertainty: 'certain',
          },
        ],
        acknowledgedMismatchLines: new Set([2]),
      },
      '2026-07-28T12:00:00.000Z',
    )
    expect(
      parseLetterReferenceDraft(JSON.stringify(draft), context),
    ).toEqual(draft)
  })
})
