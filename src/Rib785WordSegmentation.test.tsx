import { useState } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { RIB_785_LETTER_REFERENCE } from './content/curated/RIB 785/letterReference'
import {
  createLetterIdentificationSession,
  type LetterIdentificationSession,
} from './letterIdentificationSession'
import { Rib785Transcription } from './Rib785Transcription'
import { Rib785WordSegmentation } from './Rib785WordSegmentation'
import { compareWordSegmentation } from './wordSegmentationComparison'

const transcription = [
  'D M',
  'CRESCENTINV',
  'S VIXIT ANNIS',
  'XVIII VIDARIS',
  'PATER POSVIT',
] as LetterIdentificationSession['studentTranscription']
const reference = [
  'D M',
  'CRESCENTINVS',
  'S VIXIT ANNIS',
  'XVIII VIDARIS',
  'PATER POSVIT',
]

function seededSession(): LetterIdentificationSession {
  return {
    ...createLetterIdentificationSession({
      caseId: 'RIB 785',
      title: 'RIB 785 title',
      sourceCredit: 'Source credit',
    }),
    studentRegions: [
      {
        id: 'student-1',
        x: 10,
        y: 10,
        width: 20,
        height: 20,
        label: 'D',
        lineNumber: 1,
      },
    ],
    stageStatus: 'complete',
    studentTranscription: [...transcription],
    transcriptionStageStatus: 'complete',
    transcriptionVersion: 5,
    studentSegmentation: [...transcription],
    segmentationSourceTranscription: [...transcription],
    segmentationSourceVersion: 5,
  }
}

function SegmentationHarness({
  initial = seededSession(),
}: {
  initial?: LetterIdentificationSession
}) {
  const [session, setSession] = useState(initial)
  return (
    <>
      <Rib785WordSegmentation
        session={session}
        setSession={setSession}
        onReturnToTranscription={() => undefined}
      />
      <output data-testid="segmentation-session">
        {JSON.stringify(session)}
      </output>
    </>
  )
}

function TranscriptionDependencyHarness() {
  const initial = seededSession()
  initial.segmentationCheckCount = 1
  initial.segmentationComparison = compareWordSegmentation(
    initial.studentSegmentation,
    initial.segmentationSourceTranscription,
    reference,
  )
  initial.segmentationComparisonCurrent = true
  initial.segmentationStageStatus = 'complete'
  const [session, setSession] = useState(initial)
  return (
    <>
      <Rib785Transcription
        session={session}
        setSession={setSession}
        onReturnToLetterIdentification={() => undefined}
      />
      <output data-testid="dependency-session">{JSON.stringify(session)}</output>
    </>
  )
}

async function openRib785() {
  const user = userEvent.setup()
  render(<App />)
  await user.click(
    screen.getByRole('button', {
      name: 'RIB 785: Funerary Inscription for Crescentinus: Begin Investigation',
    }),
  )
  return user
}

async function completeLetterIdentification() {
  const user = await openRib785()
  const first = RIB_785_LETTER_REFERENCE.regions[0]
  await user.click(
    screen.getByRole('button', { name: 'Select Letter mode' }),
  )
  const layer = screen.getByTestId('letter-region-layer')
  fireEvent.pointerDown(layer, {
    pointerId: 113,
    pointerType: 'pen',
    clientX: first.x,
    clientY: first.y,
  })
  fireEvent.pointerMove(layer, {
    pointerId: 113,
    pointerType: 'pen',
    clientX: first.x + first.width,
    clientY: first.y + first.height,
  })
  fireEvent.pointerUp(layer, {
    pointerId: 113,
    pointerType: 'pen',
    clientX: first.x + first.width,
    clientY: first.y + first.height,
  })
  await user.type(
    screen.getByRole('textbox', { name: 'Letter label' }),
    'D',
  )
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Line number' }),
    '1',
  )
  await user.click(
    screen.getByRole('button', { name: 'Check Letter Identification' }),
  )
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  await user.click(
    screen.getByRole('button', {
      name: 'Mark Letter Identification Complete',
    }),
  )
  return user
}

async function openWordSegmentation() {
  const user = await completeLetterIdentification()
  await user.click(screen.getByRole('button', { name: 'Transcription' }))
  for (const [index, line] of transcription.entries()) {
    await user.type(
      screen.getByRole('textbox', {
        name: `Line ${index + 1} transcription`,
      }),
      line,
    )
  }
  await user.click(
    screen.getByRole('button', { name: 'Check Transcription' }),
  )
  await user.click(
    screen.getByRole('button', { name: 'Mark Transcription Complete' }),
  )
  await user.click(
    screen.getByRole('button', { name: 'Word Segmentation' }),
  )
  return user
}

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  sessionStorage.clear()
  window.history.pushState({}, '', '/')
})

describe('RIB 785 student word segmentation', () => {
  it('keeps Word Segmentation locked before Transcription completion', async () => {
    await openRib785()
    expect(
      screen.queryByRole('button', { name: 'Word Segmentation' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByText('Word Segmentation').closest('li'),
    ).toHaveTextContent('Locked')
  })

  it('unlocks after Transcription completion and prepopulates student text', async () => {
    await openWordSegmentation()
    for (const [index, line] of transcription.entries()) {
      expect(
        screen.getByRole('textbox', {
          name: `Line ${index + 1} word segmentation`,
        }),
      ).toHaveValue(line)
    }
    expect(screen.getAllByText('Coming Later')).toHaveLength(1)
  })

  it('keeps the instructor segmentation hidden initially', () => {
    render(<SegmentationHarness />)
    expect(
      screen.queryByRole('button', { name: 'Show Instructor Reference' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('CRESCENTINVS')).not.toBeInTheDocument()
  })

  it('allows spacing edits but blocks checking after a letter change', async () => {
    const user = userEvent.setup()
    render(<SegmentationHarness />)
    const lineThree = screen.getByRole('textbox', {
      name: 'Line 3 word segmentation',
    })
    await user.clear(lineThree)
    await user.type(lineThree, 'S  VIXIT  ANNIS')
    expect(
      screen.getByRole('button', { name: 'Check Word Segmentation' }),
    ).toBeEnabled()
    const lineFive = screen.getByRole('textbox', {
      name: 'Line 5 word segmentation',
    })
    await user.clear(lineFive)
    await user.type(lineFive, 'PATER POSUIT')
    expect(lineFive).toHaveAttribute('aria-invalid', 'true')
    expect(
      screen.getByText(/change spacing only/i),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Check Word Segmentation' }),
    ).toBeDisabled()
  })

  it('recognizes matching boundaries and normalizes repeated outside spaces', async () => {
    const user = userEvent.setup()
    render(<SegmentationHarness />)
    const lineOne = screen.getByRole('textbox', {
      name: 'Line 1 word segmentation',
    })
    await user.clear(lineOne)
    await user.type(lineOne, '  D   M  ')
    await user.click(
      screen.getByRole('button', { name: 'Check Word Segmentation' }),
    )
    const lineOneResults = screen.getByRole('list', {
      name: 'Boundary results for line 1',
    })
    expect(lineOneResults).toHaveTextContent('Matching Word Boundaries: 1')
    expect(lineOneResults).toHaveTextContent('Missing Word Boundaries: 0')
    expect(lineOneResults).toHaveTextContent('Extra Word Boundaries: 0')
    expect(lineOneResults).toHaveTextContent('Changed Letters: No')
  })

  it('detects missing and extra boundaries line by line', async () => {
    const user = userEvent.setup()
    render(<SegmentationHarness />)
    const lineThree = screen.getByRole('textbox', {
      name: 'Line 3 word segmentation',
    })
    await user.clear(lineThree)
    await user.type(lineThree, 'SVIX IT ANNIS')
    await user.click(
      screen.getByRole('button', { name: 'Check Word Segmentation' }),
    )
    const results = screen.getByRole('list', {
      name: 'Boundary results for line 3',
    })
    expect(results).toHaveTextContent('Missing Word Boundaries: 1')
    expect(results).toHaveTextContent('Extra Word Boundaries: 1')
  })

  it('reveals and hides the instructor reference only after checking', async () => {
    const user = userEvent.setup()
    render(<SegmentationHarness />)
    await user.click(
      screen.getByRole('button', { name: 'Check Word Segmentation' }),
    )
    expect(
      screen.getAllByText('Hidden until you choose to show it'),
    ).toHaveLength(5)
    await user.click(
      screen.getByRole('button', { name: 'Show Instructor Reference' }),
    )
    expect(screen.getByText('CRESCENTINVS')).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: 'Hide Instructor Reference' }),
    )
    expect(screen.queryByText('CRESCENTINVS')).not.toBeInTheDocument()
  })

  it('allows revision and updates boundary results after rechecking', async () => {
    const user = userEvent.setup()
    render(<SegmentationHarness />)
    const lineThree = screen.getByRole('textbox', {
      name: 'Line 3 word segmentation',
    })
    await user.clear(lineThree)
    await user.type(lineThree, 'SVIXIT ANNIS')
    await user.click(
      screen.getByRole('button', { name: 'Check Word Segmentation' }),
    )
    expect(
      screen.getByRole('list', {
        name: 'Boundary results for line 3',
      }),
    ).toHaveTextContent('Missing Word Boundaries: 1')
    await user.click(
      screen.getByRole('button', { name: 'Return to Editing' }),
    )
    const editableLine = screen.getByRole('textbox', {
      name: 'Line 3 word segmentation',
    })
    await user.clear(editableLine)
    await user.type(editableLine, 'S VIXIT ANNIS')
    expect(screen.getByText(/spacing changed/i)).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: 'Check Word Segmentation' }),
    )
    expect(
      screen.getByRole('list', {
        name: 'Boundary results for line 3',
      }),
    ).toHaveTextContent('Missing Word Boundaries: 0')
  })

  it('uses visible, non-color-only boundary markers and no numerical score', async () => {
    const user = userEvent.setup()
    render(<SegmentationHarness />)
    await user.click(
      screen.getByRole('button', { name: 'Check Word Segmentation' }),
    )
    await user.click(
      screen.getByRole('button', { name: 'Show Instructor Reference' }),
    )
    const comparison = screen.getByRole('region', {
      name: 'Your Segmentation and Instructor Reference',
    })
    expect(comparison).toHaveTextContent('│')
    expect(comparison).not.toHaveTextContent('%')
    expect(comparison).not.toHaveTextContent(/grade|score|pass|fail/i)
  })

  it('requires a check and confirms remaining boundary differences', async () => {
    const user = userEvent.setup()
    render(<SegmentationHarness />)
    const complete = screen.getByRole('button', {
      name: 'Mark Word Segmentation Complete',
    })
    expect(complete).toBeDisabled()
    const lineThree = screen.getByRole('textbox', {
      name: 'Line 3 word segmentation',
    })
    await user.clear(lineThree)
    await user.type(lineThree, 'SVIXIT ANNIS')
    await user.click(
      screen.getByRole('button', { name: 'Check Word Segmentation' }),
    )
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await user.click(complete)
    expect(confirm).toHaveBeenCalledWith(
      'Finish this stage with remaining boundary differences?',
    )
    expect(
      screen.queryByText('Word Segmentation Complete'),
    ).not.toBeInTheDocument()
    confirm.mockReturnValue(true)
    await user.click(complete)
    expect(
      screen.getByText('Word Segmentation Complete'),
    ).toBeInTheDocument()
  })

  it('invalidates segmentation when the completed transcription changes', async () => {
    const user = userEvent.setup()
    render(<TranscriptionDependencyHarness />)
    const lineFive = screen.getByRole('textbox', {
      name: 'Line 5 transcription',
    })
    await user.clear(lineFive)
    await user.type(lineFive, 'PATER POSUIT')
    const state = JSON.parse(
      screen.getByTestId('dependency-session').textContent ?? '{}',
    )
    expect(state.transcriptionStageStatus).toBe('in-progress')
    expect(state.segmentationComparisonCurrent).toBe(false)
    expect(state.segmentationStageStatus).toBe('in-progress')
  })

  it('keeps Translation locked, developer tools hidden, and session storage empty', async () => {
    await openWordSegmentation()
    expect(screen.getByText('Translation').closest('li')).toHaveTextContent(
      'Coming Later',
    )
    expect(document.querySelector('a[href*="dev"]')).not.toBeInTheDocument()
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
  })

  it('clears segmentation with case-level Start Over', async () => {
    const user = await openWordSegmentation()
    await user.click(screen.getByRole('button', { name: 'Start Over' }))
    expect(screen.getByText('0 letters selected')).toBeInTheDocument()
    expect(
      screen.getByText('Word Segmentation').closest('li'),
    ).toHaveTextContent('Locked')
  })

  it('keeps the permanent instructor letter reference unchanged', () => {
    const before = JSON.stringify(RIB_785_LETTER_REFERENCE)
    render(<SegmentationHarness />)
    expect(JSON.stringify(RIB_785_LETTER_REFERENCE)).toBe(before)
  })
})
