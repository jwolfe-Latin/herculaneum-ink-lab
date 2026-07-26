import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  METHODOLOGICAL_STATEMENT,
  StudentReport,
} from './StudentReport'
import {
  createInvestigationSession,
  type InvestigationSessionInput,
} from './investigationSession'

function sampleSessionInput(): InvestigationSessionInput {
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
        points: [{ x: 20, y: 20 }],
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

describe('student report', () => {
  it('shows all required report information', () => {
    render(
      <StudentReport
        session={createInvestigationSession(sampleSessionInput())}
        onReturn={vi.fn()}
        onStartOver={vi.fn()}
      />,
    )

    expect(screen.getByText('Student 12')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        name: 'Herculaneum Ink Lab — Investigation Report',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('sample-001')).toBeInTheDocument()
    expect(screen.getByText(/Sample source credit/)).toBeInTheDocument()
    expect(screen.getByText(/Educational use/)).toBeInTheDocument()
    expect(screen.getByText(METHODOLOGICAL_STATEMENT)).toBeInTheDocument()
    expect(screen.getByText(/2026/)).toBeInTheDocument()
  })

  it('shows the correct metrics from the session', () => {
    render(
      <StudentReport
        session={createInvestigationSession(sampleSessionInput())}
        onReturn={vi.fn()}
        onStartOver={vi.fn()}
      />,
    )

    expect(screen.getByText('63%')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
    expect(screen.getByText('13%')).toBeInTheDocument()
  })

  it('renders the student and expert-comparison images from session data', () => {
    render(
      <StudentReport
        session={createInvestigationSession(sampleSessionInput())}
        onReturn={vi.fn()}
        onStartOver={vi.fn()}
      />,
    )

    const student = screen.getByTestId('report-student-image')
    const comparison = screen.getByTestId('report-comparison-image')
    expect(student.querySelector('img')).toHaveAttribute('src', '/surface.png')
    expect(student.querySelector('svg')).toHaveAttribute(
      'viewBox',
      '0 0 1746 1164',
    )
    expect(comparison.querySelectorAll('img')).toHaveLength(2)
    expect(
      comparison.querySelector('.report-reference-layer'),
    ).toHaveAttribute('src', '/reference-mask.png')
  })

  it('keeps report controls in the print-hidden control container', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined)
    render(
      <StudentReport
        session={createInvestigationSession(sampleSessionInput())}
        onReturn={vi.fn()}
        onStartOver={vi.fn()}
      />,
    )

    const controls = screen.getByRole('navigation', {
      name: 'Report controls',
    })
    expect(controls).toHaveClass('report-controls')

    fireEvent.click(screen.getByRole('button', { name: 'Print Report' }))
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Save as PDF through the browser print dialog',
      }),
    )
    expect(print).toHaveBeenCalledTimes(2)
  })
})
