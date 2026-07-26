import type { EvaluationMetrics } from './evaluation'

export type SessionPoint = {
  x: number
  y: number
}

export type SessionStroke = {
  id: number
  tool: 'ink' | 'eraser'
  size: number
  points: SessionPoint[]
}

/**
 * Complete in-memory record used to build a student report.
 *
 * This deliberately contains plain data rather than React component state.
 * A future persistence layer can serialize this structure without changing
 * the report renderer. No persistence is implemented in this milestone.
 */
export type InvestigationSession = {
  studentIdentifier: string
  investigationTitle: string
  completedAt: string
  caseIdentifier: string
  sourceCredit: string
  license: string
  surfaceImageUrl: string
  referenceImageUrl: string
  sourceSize: {
    width: number
    height: number
  }
  strokes: SessionStroke[]
  metrics: EvaluationMetrics
  referenceRevealUnlocked: boolean
  referenceRevealed: boolean
  completionState: 'in-progress' | 'checked' | 'report-ready'
}

export type InvestigationSessionInput = InvestigationSession

export function createInvestigationSession(
  input: InvestigationSessionInput,
): InvestigationSession {
  const studentIdentifier = input.studentIdentifier.trim()
  if (!studentIdentifier) {
    throw new Error('Enter a student name or assigned identifier.')
  }

  return {
    ...input,
    studentIdentifier,
    sourceSize: { ...input.sourceSize },
    strokes: input.strokes.map((stroke) => ({
      ...stroke,
      points: stroke.points.map((point) => ({ ...point })),
    })),
    metrics: { ...input.metrics },
  }
}
