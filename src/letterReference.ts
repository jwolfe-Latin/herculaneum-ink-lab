import type { Size } from './coordinates'
import {
  MIN_LETTER_REGION_SIZE,
  type LetterRegion,
  type LetterRegionUncertainty,
} from './letterRegions'

export const LETTER_REFERENCE_SCHEMA_VERSION = 1
export const LETTER_REFERENCE_UNCERTAINTIES = [
  'certain',
  'insecure',
  'damaged',
  'unreadable',
] as const satisfies readonly LetterRegionUncertainty[]

export type TranscriptionComparison = {
  lineNumber: number
  expected: string
  actual: string
  matches: boolean
  acknowledged: boolean
}

export type ReferenceValidationIssue = {
  code: string
  message: string
  blocking: boolean
  regionId?: string
  lineNumber?: number
}

export type ReferenceValidationResult = {
  validForFinalExport: boolean
  issues: ReferenceValidationIssue[]
  comparisons: TranscriptionComparison[]
}

export type LetterReferenceExport = {
  schemaVersion: typeof LETTER_REFERENCE_SCHEMA_VERSION
  caseId: string
  sourceImage: Size
  exportedAt: string
  regions: LetterRegion[]
  acknowledgedMismatches: Array<{
    lineNumber: number
    expected: string
    actual: string
  }>
}

export type LetterReferenceDraft = {
  schemaVersion: typeof LETTER_REFERENCE_SCHEMA_VERSION
  caseId: string
  sourceImage: Size
  savedAt: string
  regions: LetterRegion[]
  acknowledgedMismatchLines: number[]
}

export type LetterReferenceContext = {
  caseId: string
  sourceSize: Size
  transcriptionLines: readonly string[]
  validLineNumbers: readonly number[]
}

export const letterReferenceDraftKey = (caseId: string) =>
  `ancient-texts-lab:letter-reference-draft:${caseId}`

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const normalizeExpected = (value: string) => value.replace(/\s+/g, '')

export function orderedRegionsForLine(
  regions: readonly LetterRegion[],
  lineNumber: number,
) {
  return regions
    .filter((region) => region.lineNumber === lineNumber)
    .sort((a, b) => {
      const aManual = a.manualOrder
      const bManual = b.manualOrder
      if (aManual !== undefined || bManual !== undefined) {
        if (aManual === undefined) return 1
        if (bManual === undefined) return -1
        if (aManual !== bManual) return aManual - bManual
      }
      return a.x - b.x || a.y - b.y || a.id.localeCompare(b.id)
    })
}

export function orderedLetterRegions(
  regions: readonly LetterRegion[],
  validLineNumbers: readonly number[],
) {
  const ordered = validLineNumbers.flatMap((lineNumber) =>
    orderedRegionsForLine(regions, lineNumber),
  )
  const assignedIds = new Set(ordered.map((region) => region.id))
  return [
    ...ordered,
    ...regions
      .filter((region) => !assignedIds.has(region.id))
      .sort((a, b) => a.y - b.y || a.x - b.x),
  ]
}

export function compareRegionsWithTranscription(
  regions: readonly LetterRegion[],
  transcriptionLines: readonly string[],
  acknowledgedMismatchLines: ReadonlySet<number> = new Set(),
): TranscriptionComparison[] {
  return transcriptionLines.map((expected, index) => {
    const lineNumber = index + 1
    const actual = orderedRegionsForLine(regions, lineNumber)
      .map((region) => region.label?.trim() ?? '')
      .join('')
    const matches = actual === normalizeExpected(expected)
    return {
      lineNumber,
      expected,
      actual,
      matches,
      acknowledged:
        !matches && acknowledgedMismatchLines.has(lineNumber),
    }
  })
}

function validateRegionShape(
  region: LetterRegion,
  sourceSize: Size,
  validLineNumbers: readonly number[],
  requireCompleteMetadata: boolean,
) {
  const issues: ReferenceValidationIssue[] = []
  const numbers = [region.x, region.y, region.width, region.height]
  if (!numbers.every(Number.isFinite)) {
    issues.push({
      code: 'malformed-region',
      message: `${region.id || 'A region'} has non-numeric coordinates.`,
      blocking: true,
      regionId: region.id,
    })
    return issues
  }
  if (
    region.x < 0 ||
    region.y < 0 ||
    region.x + region.width > sourceSize.width ||
    region.y + region.height > sourceSize.height
  ) {
    issues.push({
      code: 'out-of-bounds',
      message: `${region.id} extends outside the source image.`,
      blocking: true,
      regionId: region.id,
    })
  }
  if (
    region.width < MIN_LETTER_REGION_SIZE ||
    region.height < MIN_LETTER_REGION_SIZE
  ) {
    issues.push({
      code: 'minimum-size',
      message: `${region.id} is smaller than ${MIN_LETTER_REGION_SIZE} × ${MIN_LETTER_REGION_SIZE} pixels.`,
      blocking: true,
      regionId: region.id,
    })
  }

  const label = region.label?.trim() ?? ''
  if (requireCompleteMetadata && !label) {
    issues.push({
      code: 'missing-label',
      message: `${region.id} needs a letter label.`,
      blocking: true,
      regionId: region.id,
    })
  } else if (label && !/^[A-Za-z]{1,4}$/.test(label)) {
    issues.push({
      code: 'invalid-label',
      message: `${region.id} must use one to four Latin letters.`,
      blocking: true,
      regionId: region.id,
    })
  }

  if (
    requireCompleteMetadata &&
    !validLineNumbers.includes(region.lineNumber ?? -1)
  ) {
    issues.push({
      code: 'invalid-line',
      message: `${region.id} must be assigned to a visible inscription line.`,
      blocking: true,
      regionId: region.id,
    })
  } else if (
    region.lineNumber !== undefined &&
    !validLineNumbers.includes(region.lineNumber)
  ) {
    issues.push({
      code: 'invalid-line',
      message: `${region.id} has an invalid line number.`,
      blocking: true,
      regionId: region.id,
    })
  }

  const uncertainty = region.uncertainty ?? 'certain'
  if (
    !LETTER_REFERENCE_UNCERTAINTIES.includes(
      uncertainty as LetterRegionUncertainty,
    )
  ) {
    issues.push({
      code: 'invalid-uncertainty',
      message: `${region.id} has an unsupported uncertainty status.`,
      blocking: true,
      regionId: region.id,
    })
  }
  if (
    region.manualOrder !== undefined &&
    (!Number.isInteger(region.manualOrder) || region.manualOrder < 1)
  ) {
    issues.push({
      code: 'invalid-manual-order',
      message: `${region.id} has an invalid manual order.`,
      blocking: true,
      regionId: region.id,
    })
  }
  return issues
}

export function validateLetterReference(
  input: {
    caseId: string
    sourceSize: Size
    regions: readonly LetterRegion[]
    acknowledgedMismatchLines?: ReadonlySet<number>
  },
  context: LetterReferenceContext,
  requireCompleteMetadata = true,
): ReferenceValidationResult {
  const issues: ReferenceValidationIssue[] = []
  if (input.caseId !== context.caseId) {
    issues.push({
      code: 'wrong-case-id',
      message: `Case ID must be exactly ${context.caseId}.`,
      blocking: true,
    })
  }
  if (
    input.sourceSize.width !== context.sourceSize.width ||
    input.sourceSize.height !== context.sourceSize.height
  ) {
    issues.push({
      code: 'wrong-dimensions',
      message: `Source dimensions must be ${context.sourceSize.width} × ${context.sourceSize.height}.`,
      blocking: true,
    })
  }

  const seenIds = new Set<string>()
  const seenRectangles = new Set<string>()
  const manualOrders = new Map<number, Set<number>>()
  for (const region of input.regions) {
    if (!region.id?.trim()) {
      issues.push({
        code: 'missing-region-id',
        message: 'Every region needs a stable ID.',
        blocking: true,
      })
    } else if (seenIds.has(region.id)) {
      issues.push({
        code: 'duplicate-region-id',
        message: `Duplicate region ID: ${region.id}.`,
        blocking: true,
        regionId: region.id,
      })
    }
    seenIds.add(region.id)

    const rectangleKey = [region.x, region.y, region.width, region.height]
      .map((value) => value.toFixed(6))
      .join(':')
    if (seenRectangles.has(rectangleKey)) {
      issues.push({
        code: 'duplicate-rectangle',
        message: `${region.id} exactly duplicates another rectangle.`,
        blocking: true,
        regionId: region.id,
      })
    }
    seenRectangles.add(rectangleKey)
    issues.push(
      ...validateRegionShape(
        region,
        context.sourceSize,
        context.validLineNumbers,
        requireCompleteMetadata,
      ),
    )

    if (
      region.lineNumber !== undefined &&
      region.manualOrder !== undefined
    ) {
      const lineOrders =
        manualOrders.get(region.lineNumber) ?? new Set<number>()
      if (lineOrders.has(region.manualOrder)) {
        issues.push({
          code: 'duplicate-manual-order',
          message: `Line ${region.lineNumber} contains duplicate manual order ${region.manualOrder}.`,
          blocking: true,
          lineNumber: region.lineNumber,
        })
      }
      lineOrders.add(region.manualOrder)
      manualOrders.set(region.lineNumber, lineOrders)
    }
  }

  const comparisons = compareRegionsWithTranscription(
    input.regions,
    context.transcriptionLines,
    input.acknowledgedMismatchLines,
  )
  if (requireCompleteMetadata) {
    for (const comparison of comparisons) {
      if (!comparison.matches) {
        issues.push({
          code: 'transcription-mismatch',
          message: `Line ${comparison.lineNumber} does not match the diplomatic transcription${
            comparison.acknowledged ? ' (acknowledged)' : ''
          }.`,
          blocking: !comparison.acknowledged,
          lineNumber: comparison.lineNumber,
        })
      }
    }
  }

  return {
    validForFinalExport: !issues.some((issue) => issue.blocking),
    issues,
    comparisons,
  }
}

export function createLetterReferenceExport(
  input: {
    caseId: string
    sourceSize: Size
    regions: readonly LetterRegion[]
    acknowledgedMismatchLines: ReadonlySet<number>
  },
  context: LetterReferenceContext,
  exportedAt = new Date().toISOString(),
): LetterReferenceExport {
  const validation = validateLetterReference(input, context)
  if (!validation.validForFinalExport) {
    throw new Error(
      validation.issues
        .filter((issue) => issue.blocking)
        .map((issue) => issue.message)
        .join(' '),
    )
  }
  return {
    schemaVersion: LETTER_REFERENCE_SCHEMA_VERSION,
    caseId: input.caseId,
    sourceImage: { ...input.sourceSize },
    exportedAt,
    regions: orderedLetterRegions(
      input.regions,
      context.validLineNumbers,
    ).map((region) => ({
      ...region,
      label: region.label?.trim(),
      uncertainty: region.uncertainty ?? 'certain',
    })),
    acknowledgedMismatches: validation.comparisons
      .filter((comparison) => comparison.acknowledged)
      .map(({ lineNumber, expected, actual }) => ({
        lineNumber,
        expected,
        actual,
      })),
  }
}

function parseRegion(value: unknown): LetterRegion | null {
  if (!isRecord(value)) return null
  if (
    typeof value.id !== 'string' ||
    !isFiniteNumber(value.x) ||
    !isFiniteNumber(value.y) ||
    !isFiniteNumber(value.width) ||
    !isFiniteNumber(value.height)
  ) {
    return null
  }
  return {
    id: value.id,
    x: value.x,
    y: value.y,
    width: value.width,
    height: value.height,
    label: typeof value.label === 'string' ? value.label : undefined,
    lineNumber:
      typeof value.lineNumber === 'number' ? value.lineNumber : undefined,
    uncertainty:
      typeof value.uncertainty === 'string'
        ? (value.uncertainty as LetterRegionUncertainty)
        : undefined,
    note: typeof value.note === 'string' ? value.note : undefined,
    manualOrder:
      typeof value.manualOrder === 'number'
        ? value.manualOrder
        : undefined,
  }
}

function parseBaseDocument(
  json: string,
  context: LetterReferenceContext,
) {
  let value: unknown
  try {
    value = JSON.parse(json)
  } catch {
    throw new Error('The selected file is not valid JSON.')
  }
  if (!isRecord(value)) throw new Error('The reference file is malformed.')
  if (value.schemaVersion !== LETTER_REFERENCE_SCHEMA_VERSION) {
    throw new Error('The reference file uses an unsupported schema version.')
  }
  if (value.caseId !== context.caseId) {
    throw new Error(`The reference file must belong to ${context.caseId}.`)
  }
  if (
    !isRecord(value.sourceImage) ||
    value.sourceImage.width !== context.sourceSize.width ||
    value.sourceImage.height !== context.sourceSize.height
  ) {
    throw new Error(
      `The reference file must use ${context.sourceSize.width} × ${context.sourceSize.height} source dimensions.`,
    )
  }
  if (!Array.isArray(value.regions)) {
    throw new Error('The reference file does not contain a region list.')
  }
  const regions = value.regions.map(parseRegion)
  if (regions.some((region) => region === null)) {
    throw new Error('The reference file contains a malformed region.')
  }
  return {
    value,
    regions: regions as LetterRegion[],
  }
}

export function parseLetterReferenceJson(
  json: string,
  context: LetterReferenceContext,
): LetterReferenceExport {
  const { value, regions } = parseBaseDocument(json, context)
  const acknowledgedMismatches = Array.isArray(
    value.acknowledgedMismatches,
  )
    ? value.acknowledgedMismatches
        .filter(isRecord)
        .filter((item) => typeof item.lineNumber === 'number')
        .map((item) => item.lineNumber as number)
    : []
  const validation = validateLetterReference(
    {
      caseId: context.caseId,
      sourceSize: context.sourceSize,
      regions,
      acknowledgedMismatchLines: new Set(acknowledgedMismatches),
    },
    context,
  )
  if (!validation.validForFinalExport) {
    throw new Error(
      validation.issues
        .filter((issue) => issue.blocking)
        .map((issue) => issue.message)
        .join(' '),
    )
  }
  return {
    schemaVersion: LETTER_REFERENCE_SCHEMA_VERSION,
    caseId: context.caseId,
    sourceImage: { ...context.sourceSize },
    exportedAt:
      typeof value.exportedAt === 'string'
        ? value.exportedAt
        : new Date(0).toISOString(),
    regions,
    acknowledgedMismatches: validation.comparisons
      .filter((comparison) => comparison.acknowledged)
      .map(({ lineNumber, expected, actual }) => ({
        lineNumber,
        expected,
        actual,
      })),
  }
}

export function createLetterReferenceDraft(
  input: {
    caseId: string
    sourceSize: Size
    regions: readonly LetterRegion[]
    acknowledgedMismatchLines: ReadonlySet<number>
  },
  savedAt = new Date().toISOString(),
): LetterReferenceDraft {
  return {
    schemaVersion: LETTER_REFERENCE_SCHEMA_VERSION,
    caseId: input.caseId,
    sourceImage: { ...input.sourceSize },
    savedAt,
    regions: input.regions.map((region) => ({ ...region })),
    acknowledgedMismatchLines: [...input.acknowledgedMismatchLines].sort(
      (a, b) => a - b,
    ),
  }
}

export function parseLetterReferenceDraft(
  json: string,
  context: LetterReferenceContext,
): LetterReferenceDraft {
  const { value, regions } = parseBaseDocument(json, context)
  const validation = validateLetterReference(
    {
      caseId: context.caseId,
      sourceSize: context.sourceSize,
      regions,
    },
    context,
    false,
  )
  if (validation.issues.some((issue) => issue.blocking)) {
    throw new Error(
      validation.issues
        .filter((issue) => issue.blocking)
        .map((issue) => issue.message)
        .join(' '),
    )
  }
  return {
    schemaVersion: LETTER_REFERENCE_SCHEMA_VERSION,
    caseId: context.caseId,
    sourceImage: { ...context.sourceSize },
    savedAt:
      typeof value.savedAt === 'string'
        ? value.savedAt
        : new Date(0).toISOString(),
    regions,
    acknowledgedMismatchLines: Array.isArray(
      value.acknowledgedMismatchLines,
    )
      ? value.acknowledgedMismatchLines.filter(
          (line): line is number =>
            typeof line === 'number' &&
            context.validLineNumbers.includes(line),
        )
      : [],
  }
}
