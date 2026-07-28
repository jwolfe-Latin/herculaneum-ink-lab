import permanentReferenceJson from './letter-reference.json?raw'
import permanentReferenceUrl from './letter-reference.json?url'
import {
  parseLetterReferenceJson,
  type LetterReferenceContext,
} from '../../../letterReference'

export const RIB_785_LETTER_REFERENCE_SOURCE_PATH =
  'src/content/curated/RIB 785/letter-reference.json'
export const RIB_785_LETTER_REFERENCE_REGION_COUNT = 47
export const RIB_785_LETTER_REFERENCE_LINE_NUMBERS = [1, 2, 3, 4, 5] as const

export const RIB_785_LETTER_REFERENCE_CONTEXT: LetterReferenceContext = {
  caseId: 'RIB 785',
  sourceSize: { width: 832, height: 1084 },
  transcriptionLines: [
    'D M',
    'CRESCENTINV',
    'S VIXIT ANNIS',
    'XVIII VIDARIS',
    'PATER POSVIT',
  ],
  validLineNumbers: RIB_785_LETTER_REFERENCE_LINE_NUMBERS,
}

type RawReferenceDocument = {
  regions?: Array<Record<string, unknown>>
  acknowledgedMismatches?: unknown[]
}

/**
 * Parses and validates the permanent instructor reference at module load.
 * This is deliberately stricter than draft validation: every permanent region
 * must carry complete metadata, there must be exactly 47 regions, and the
 * reviewed export must not contain acknowledged transcription mismatches.
 */
export function parsePermanentRib785LetterReference(json: string) {
  const raw = JSON.parse(json) as RawReferenceDocument
  const reference = parseLetterReferenceJson(
    json,
    RIB_785_LETTER_REFERENCE_CONTEXT,
  )

  if (reference.regions.length !== RIB_785_LETTER_REFERENCE_REGION_COUNT) {
    throw new Error(
      `RIB 785 permanent letter reference must contain exactly ${RIB_785_LETTER_REFERENCE_REGION_COUNT} regions.`,
    )
  }
  if (
    !Array.isArray(raw.acknowledgedMismatches) ||
    raw.acknowledgedMismatches.length !== 0
  ) {
    throw new Error(
      'RIB 785 permanent letter reference cannot contain acknowledged mismatches.',
    )
  }
  if (
    !Array.isArray(raw.regions) ||
    raw.regions.some(
      (region) =>
        typeof region.id !== 'string' ||
        typeof region.x !== 'number' ||
        typeof region.y !== 'number' ||
        typeof region.width !== 'number' ||
        typeof region.height !== 'number' ||
        typeof region.label !== 'string' ||
        typeof region.lineNumber !== 'number' ||
        typeof region.uncertainty !== 'string',
    )
  ) {
    throw new Error(
      'Every permanent RIB 785 region must include coordinates, a label, a line number, and uncertainty metadata.',
    )
  }

  return reference
}

export const RIB_785_LETTER_REFERENCE =
  parsePermanentRib785LetterReference(permanentReferenceJson)

export const RIB_785_LETTER_REFERENCE_ASSET_URL = permanentReferenceUrl

export const RIB_785_LETTER_REFERENCE_SKIPPED_IDS = [25, 26, 27]
  .map((number) => `letter-region-${number}`)
  .filter(
    (id) =>
      !RIB_785_LETTER_REFERENCE.regions.some((region) => region.id === id),
  )

