import { useState } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { RIB_785_CASE } from './content/curated/RIB 785/case'
import { RIB_785_LETTER_REFERENCE } from './content/curated/RIB 785/letterReference'
import {
  createLetterIdentificationSession,
  type LetterIdentificationSession,
} from './letterIdentificationSession'
import { Rib785Transcription } from './Rib785Transcription'
import { Rib785Translation } from './Rib785Translation'
import { Rib785WordSegmentation } from './Rib785WordSegmentation'

const transcription = [
  'D M',
  'CRESCENTINV',
  'S VIXIT ANNIS',
  'XVIII VIDARIS',
  'PATER POSVIT',
] as LetterIdentificationSession['studentTranscription']

function seededSession(): LetterIdentificationSession {
  return {
    ...createLetterIdentificationSession({
      caseId: 'RIB 785',
      title: RIB_785_CASE.title,
      sourceCredit: RIB_785_CASE.imageSource.creditLine,
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
    segmentationCheckCount: 1,
    segmentationStageStatus: 'complete',
    segmentationVersion: 4,
    translationSourceTranscriptionVersion: 5,
    translationSourceSegmentationVersion: 4,
  }
}

function TranslationHarness({
  initial = seededSession(),
}: {
  initial?: LetterIdentificationSession
}) {
  const [session, setSession] = useState(initial)
  return (
    <>
      <Rib785Translation
        session={session}
        setSession={setSession}
        onReturnToWordSegmentation={() => undefined}
      />
      <output data-testid="translation-session">
        {JSON.stringify(session)}
      </output>
    </>
  )
}

function TranscriptionDependencyHarness() {
  const initial = seededSession()
  initial.studentTranslation = 'A student translation.'
  initial.translationReviewCount = 1
  initial.translationReviewCurrent = true
  initial.translationStageStatus = 'complete'
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

function SegmentationDependencyHarness() {
  const initial = seededSession()
  initial.studentTranslation = 'A student translation.'
  initial.translationReviewCount = 1
  initial.translationReviewCurrent = true
  initial.translationStageStatus = 'complete'
  const [session, setSession] = useState(initial)
  return (
    <>
      <Rib785WordSegmentation
        session={session}
        setSession={setSession}
        onReturnToTranscription={() => undefined}
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

async function completePriorStages() {
  const user = await openRib785()
  const first = RIB_785_LETTER_REFERENCE.regions[0]
  await user.click(
    screen.getByRole('button', { name: 'Select Letter mode' }),
  )
  const layer = screen.getByTestId('letter-region-layer')
  fireEvent.pointerDown(layer, {
    pointerId: 207,
    pointerType: 'pen',
    clientX: first.x,
    clientY: first.y,
  })
  fireEvent.pointerMove(layer, {
    pointerId: 207,
    pointerType: 'pen',
    clientX: first.x + first.width,
    clientY: first.y + first.height,
  })
  fireEvent.pointerUp(layer, {
    pointerId: 207,
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
  await user.click(
    screen.getByRole('button', { name: 'Check Word Segmentation' }),
  )
  await user.click(
    screen.getByRole('button', {
      name: 'Mark Word Segmentation Complete',
    }),
  )
  return user
}

async function enterTranslation(text = 'Crescentinus died at age eighteen.') {
  const user = userEvent.setup()
  await user.type(
    screen.getByRole('textbox', { name: 'Your Translation' }),
    text,
  )
  return user
}

function sessionState(testId = 'translation-session') {
  return JSON.parse(screen.getByTestId(testId).textContent ?? '{}')
}

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  sessionStorage.clear()
  window.history.pushState({}, '', '/')
})

describe('RIB 785 student translation', () => {
  it('keeps Translation locked until Word Segmentation is complete', async () => {
    await openRib785()
    expect(
      screen.queryByRole('button', { name: 'Translation' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('Translation').closest('li')).toHaveTextContent(
      'Locked',
    )
  })

  it('unlocks Translation only after the three earlier stages are complete', async () => {
    const user = await completePriorStages()
    expect(
      screen.getByRole('button', { name: 'Translation' }),
    ).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Translation' }))
    expect(
      screen.getByRole('heading', { name: 'Translation' }),
    ).toBeInTheDocument()
  })

  it('shows the source image and the student transcription and segmentation', () => {
    render(<TranslationHarness />)
    expect(
      screen.getByRole('img', {
        name: 'RIB 785 funerary inscription for translation',
      }),
    ).toHaveAttribute(
      'src',
      '/herculaneum-ink-lab/cases/RIB%20785/source.png',
    )
    expect(
      screen.getByRole('heading', { name: 'My Diplomatic Transcription' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'My Word Segmentation' }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('PATER POSVIT').length).toBeGreaterThan(1)
  })

  it('keeps instructor material hidden and blocks a blank review', () => {
    render(<TranslationHarness />)
    expect(screen.queryByText(RIB_785_CASE.translation)).not.toBeInTheDocument()
    expect(screen.queryByText('D(IS) M(ANIBUS)')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Review Translation' }),
    ).toBeDisabled()
  })

  it('preserves ordinary prose, punctuation, capitalization, and multiple sentences', async () => {
    render(<TranslationHarness />)
    const text =
      'To the spirits, this stone is dedicated. Crescentinus lived eighteen years!'
    await enterTranslation(text)
    expect(
      screen.getByRole('textbox', { name: 'Your Translation' }),
    ).toHaveValue(text)
    expect(sessionState().studentTranslation).toBe(text)
  })

  it('reveals the structured comparison without semantic grading or scores', async () => {
    const user = userEvent.setup()
    render(<TranslationHarness />)
    await enterTranslation('My own stylistically different translation.')
    await user.click(
      screen.getByRole('button', { name: 'Review Translation' }),
    )
    const comparison = screen.getByRole('region', {
      name: 'Review Your Translation',
    })
    expect(
      within(comparison).getByText(RIB_785_CASE.translation),
    ).toBeInTheDocument()
    expect(
      within(comparison).getByText('D(IS) M(ANIBUS)'),
    ).toBeInTheDocument()
    expect(
      within(comparison).getByRole('heading', {
        name: 'My Segmented Latin Text',
      }),
    ).toBeInTheDocument()
    expect(comparison).not.toHaveTextContent('%')
    expect(comparison).not.toHaveTextContent(
      /score|grade|pass|fail|correct answer|ground truth/i,
    )
  })

  it('uses the exact instructor reference wording and normalized reading', async () => {
    const user = userEvent.setup()
    render(<TranslationHarness />)
    await enterTranslation()
    await user.click(
      screen.getByRole('button', { name: 'Review Translation' }),
    )
    expect(screen.getByText(RIB_785_CASE.translation)).toHaveTextContent(
      'To the spirits of the departed; Crescentinus lived eighteen years. Vidaris, his father, set this up.',
    )
    const normalizedPanel = screen
      .getByRole('heading', { name: 'Normalized Instructor Reading' })
      .closest('article')
    expect(normalizedPanel).not.toBeNull()
    for (const line of RIB_785_CASE.normalizedInstructorReading.split('\n')) {
      expect(within(normalizedPanel as HTMLElement).getByText(line)).toBeInTheDocument()
    }
  })

  it('never shows a content checklist or translation-review checkboxes', async () => {
    const user = userEvent.setup()
    render(<TranslationHarness />)
    expect(
      screen.queryByRole('group', { name: 'Content checklist' }),
    ).not.toBeInTheDocument()
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    await enterTranslation()
    await user.click(
      screen.getByRole('button', { name: 'Review Translation' }),
    )
    expect(
      screen.queryByRole('group', { name: 'Content checklist' }),
    ).not.toBeInTheDocument()
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    expect(screen.queryByText(/content items selected/i)).not.toBeInTheDocument()
  })

  it('allows reference controls, revision, re-review, and an optional note', async () => {
    const user = userEvent.setup()
    render(<TranslationHarness />)
    await enterTranslation()
    await user.click(
      screen.getByRole('button', { name: 'Review Translation' }),
    )
    expect(sessionState().translationReviewCount).toBe(1)
    await user.click(
      screen.getByRole('button', {
        name: 'Hide Instructor Reference Translation',
      }),
    )
    await user.click(
      screen.getByRole('button', {
        name: 'Hide Normalized Instructor Reading',
      }),
    )
    expect(screen.queryByText(RIB_785_CASE.translation)).not.toBeInTheDocument()
    expect(screen.queryByText('D(IS) M(ANIBUS)')).not.toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: 'Return to Editing' }),
    )
    await user.type(
      screen.getByRole('textbox', { name: 'Your Translation' }),
      ' Revised.',
    )
    expect(sessionState().translationReviewCurrent).toBe(false)
    expect(
      screen.getByRole('button', {
        name: 'Complete Translation Stage',
      }),
    ).toBeDisabled()
    await user.click(
      screen.getByRole('button', { name: 'Review Translation' }),
    )
    await user.type(
      screen.getByRole('textbox', { name: 'Revision Note' }),
      'I confirmed the age and relationship.',
    )
    expect(sessionState()).toMatchObject({
      translationReviewCount: 2,
      translationRevisionNote: 'I confirmed the age and relationship.',
    })
  })

  it('requires a current review and allows a blank revision note', async () => {
    const user = userEvent.setup()
    render(<TranslationHarness />)
    const complete = screen.getByRole('button', {
      name: 'Complete Translation Stage',
    })
    expect(complete).toBeDisabled()
    await enterTranslation()
    expect(complete).toBeDisabled()
    await user.click(
      screen.getByRole('button', { name: 'Review Translation' }),
    )
    expect(complete).toBeEnabled()
    expect(
      screen.getByRole('textbox', { name: 'Revision Note' }),
    ).toHaveValue('')
    await user.click(complete)
    expect(screen.getByText('Translation Complete')).toBeInTheDocument()
  })

  it('allows stylistically different prose after a current review', async () => {
    const user = userEvent.setup()
    render(<TranslationHarness />)
    await enterTranslation('A student uses different English phrasing here.')
    await user.click(
      screen.getByRole('button', { name: 'Review Translation' }),
    )
    await user.click(
      screen.getByRole('button', {
        name: 'Complete Translation Stage',
      }),
    )
    expect(screen.getByText('Translation Complete')).toBeInTheDocument()
    expect(screen.getByText('RIB 785 Investigation Complete')).toBeInTheDocument()
  })

  it('shows all four non-color-only completion statements', async () => {
    const user = userEvent.setup()
    const initial = seededSession()
    initial.studentTranslation = 'Student translation.'
    initial.translationReviewCount = 1
    initial.translationReviewCurrent = true
    render(<TranslationHarness initial={initial} />)
    await user.click(
      screen.getByRole('button', {
        name: 'Complete Translation Stage',
      }),
    )
    const summary = screen.getByRole('region', {
      name: 'RIB 785 Investigation Complete',
    })
    expect(summary).toHaveTextContent('Letter Identification — Complete')
    expect(summary).toHaveTextContent('Transcription — Complete')
    expect(summary).toHaveTextContent('Word Segmentation — Complete')
    expect(summary).toHaveTextContent('Translation — Complete')
    expect(summary).not.toHaveTextContent(/print|pdf|json|numerical/i)
  })

  it('invalidates review after transcription changes while preserving translation', async () => {
    const user = userEvent.setup()
    render(<TranscriptionDependencyHarness />)
    await user.type(
      screen.getByRole('textbox', { name: 'Line 5 transcription' }),
      'X',
    )
    expect(sessionState('dependency-session')).toMatchObject({
      studentTranslation: 'A student translation.',
      translationReviewCurrent: false,
      translationStageStatus: 'in-progress',
      translationEarlierWorkChanged: true,
    })
  })

  it('invalidates review after segmentation changes while preserving translation', async () => {
    const user = userEvent.setup()
    render(<SegmentationDependencyHarness />)
    await user.type(
      screen.getByRole('textbox', {
        name: 'Line 3 word segmentation',
      }),
      ' ',
    )
    expect(sessionState('dependency-session')).toMatchObject({
      studentTranslation: 'A student translation.',
      translationReviewCurrent: false,
      translationStageStatus: 'in-progress',
      translationEarlierWorkChanged: true,
    })
  })

  it('clears all Translation state through case-level Start Over', async () => {
    const user = await completePriorStages()
    await user.click(screen.getByRole('button', { name: 'Translation' }))
    await user.type(
      screen.getByRole('textbox', { name: 'Your Translation' }),
      'Personal student work.',
    )
    await user.click(
      screen.getByRole('button', { name: 'Review Translation' }),
    )
    await user.type(
      screen.getByRole('textbox', { name: 'Revision Note' }),
      'A note.',
    )
    await user.click(screen.getByRole('button', { name: 'Start Over' }))
    expect(screen.getByText('0 letters selected')).toBeInTheDocument()
    expect(screen.getByText('Translation').closest('li')).toHaveTextContent(
      'Locked',
    )
  })

  it('keeps permanent references unchanged, instructor tools hidden, and storage empty', () => {
    const before = JSON.stringify(RIB_785_CASE)
    render(<TranslationHarness />)
    expect(JSON.stringify(RIB_785_CASE)).toBe(before)
    expect(document.querySelector('a[href*="dev"]')).not.toBeInTheDocument()
    expect(document.body).not.toHaveTextContent(/source-code paths|intake documentation/i)
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
  })

  it('provides responsive structural classes and labeled keyboard controls', async () => {
    const user = userEvent.setup()
    const { container } = render(<TranslationHarness />)
    await enterTranslation()
    await user.click(
      screen.getByRole('button', { name: 'Review Translation' }),
    )
    expect(container.querySelector('.student-translation-evidence')).toBeInTheDocument()
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    expect(
      screen.getByRole('textbox', { name: 'Revision Note' }),
    ).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: 'Return to Editing' }),
    )
    expect(
      screen.getByRole('textbox', { name: 'Your Translation' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', {
      name: 'Hide My Transcription',
    })).toBeInTheDocument()
  })
})
