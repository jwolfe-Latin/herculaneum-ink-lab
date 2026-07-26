import { describe, expect, it } from 'vitest'
import {
  createInvestigationSession,
  type InvestigationSessionInput,
} from './investigationSession'

export function sampleSessionInput(): InvestigationSessionInput {
  return {
    studentIdentifier: 'Student 12',
    investigationTitle: 'Herculaneum Ink Lab — Investigation Report',
    completedAt: '2026-07-26T16:00:00.000Z',
    caseIdentifier: 'sample-001',
    sourceCredit: 'Sample source credit',
    license: 'Educational use',
    surfaceImageUrl: '/surface.png',
    referenceImageUrl: '/reference-mask.png',
    sourceSize: { width: 1746, height: 1164 },
    strokes: [
      {
        id: 1,
        tool: 'ink',
        size: 8,
        points: [
          { x: 0, y: 0 },
          { x: 1746, y: 1164 },
        ],
      },
    ],
    metrics: {
      inkRecovered: 0.625,
      labelPrecision: 0.75,
      extraSurfaceMarked: 0.125,
      overlapPixels: 5,
      referenceInkPixels: 8,
      studentPaintedPixels: 7,
      studentNonReferencePixels: 2,
      nonReferencePixels: 16,
    },
    referenceRevealUnlocked: true,
    referenceRevealed: true,
    completionState: 'report-ready',
  }
}

describe('investigation session', () => {
  it('creates a report-ready session from the documented data object', () => {
    const input = sampleSessionInput()
    const session = createInvestigationSession(input)

    expect(session).toEqual(input)
    expect(session).not.toBe(input)
    expect(session.strokes).not.toBe(input.strokes)
    expect(session.metrics).not.toBe(input.metrics)
    expect(session.referenceRevealed).toBe(true)
    expect(session.completionState).toBe('report-ready')
  })

  it('rejects a missing student identifier', () => {
    expect(() =>
      createInvestigationSession({
        ...sampleSessionInput(),
        studentIdentifier: '   ',
      }),
    ).toThrow('Enter a student name or assigned identifier.')
  })
})
