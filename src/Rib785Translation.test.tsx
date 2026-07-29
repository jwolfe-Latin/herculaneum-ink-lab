import { useState } from 'react'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { RIB_785_CASE } from './content/curated/RIB 785/case'
import { RIB_785_LETTER_REFERENCE } from './content/curated/RIB 785/letterReference'
import {
  createLetterIdentificationSession,
  snapshotLetterIdentificationSession,
  type LetterIdentificationSession,
} from './letterIdentificationSession'
import { Rib785Translation } from './Rib785Translation'

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

function sessionState() {
  return JSON.parse(
    screen.getByTestId('translation-session').textContent ?? '{}',
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

async function submitInHarness(
  text = 'Crescentinus lived eighteen years.',
) {
  const user = userEvent.setup()
  fireEvent.change(
    screen.getByRole('textbox', { name: 'Your Translation' }),
    { target: { value: text } },
  )
  await user.click(
    screen.getByRole('button', { name: 'Submit Final Translation' }),
  )
  const dialog = screen.getByRole('dialog', {
    name: 'Submit Final Translation?',
  })
  return { user, dialog }
}

async function finalizeAppTranslation(
  text = 'Crescentinus lived eighteen years.',
) {
  const user = await completePriorStages()
  await user.click(screen.getByRole('button', { name: 'Translation' }))
  fireEvent.change(
    screen.getByRole('textbox', { name: 'Your Translation' }),
    { target: { value: text } },
  )
  await user.click(
    screen.getByRole('button', { name: 'Submit Final Translation' }),
  )
  const dialog = screen.getByRole('dialog', {
    name: 'Submit Final Translation?',
  })
  await user.click(
    within(dialog).getByRole('button', {
      name: 'Submit Final Translation',
    }),
  )
  return user
}

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  sessionStorage.clear()
  window.history.pushState({}, '', '/')
})

describe('RIB 785 final student translation', () => {
  it('keeps Translation locked before Word Segmentation and unlocks it afterward', async () => {
    await openRib785()
    expect(
      screen.queryByRole('button', { name: 'Translation' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('Translation').closest('li')).toHaveTextContent(
      'Locked',
    )

    vi.restoreAllMocks()
    cleanup()
    const user = await completePriorStages()
    expect(
      screen.getByRole('button', { name: 'Translation' }),
    ).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Translation' }))
    expect(
      screen.getByRole('textbox', { name: 'Your Translation' }),
    ).toBeEnabled()
  }, 20_000)

  it('keeps the source image and prior student evidence available', () => {
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

  it('blocks blank and whitespace-only submissions', () => {
    render(<TranslationHarness />)
    const submit = screen.getByRole('button', {
      name: 'Submit Final Translation',
    })
    expect(submit).toBeDisabled()
    fireEvent.change(
      screen.getByRole('textbox', { name: 'Your Translation' }),
      { target: { value: '  \n\t ' } },
    )
    expect(submit).toBeDisabled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('allows free editing and preserves spelling, capitalization, punctuation, and paragraphs', () => {
    render(<TranslationHarness />)
    const response =
      'To the Spirits, Crescentinus lived 18 years!\n\nHis father sett this up.'
    const textbox = screen.getByRole('textbox', {
      name: 'Your Translation',
    })
    fireEvent.change(textbox, { target: { value: response } })
    expect(textbox).toHaveValue(response)
    fireEvent.change(textbox, {
      target: { value: `${response}\nA final sentence?` },
    })
    expect(sessionState().studentTranslation).toBe(
      `${response}\nA final sentence?`,
    )
  })

  it('opens one accessible dialog and Cancel preserves the editable response and focus', async () => {
    render(<TranslationHarness />)
    const response = 'My editable response.'
    const { user, dialog } = await submitInHarness(response)
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveTextContent(
      'You will not be able to revise it afterward during this investigation.',
    )
    expect(document.activeElement).toBe(
      within(dialog).getByRole('button', { name: 'Cancel' }),
    )
    await user.click(
      within(dialog).getByRole('button', { name: 'Cancel' }),
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(
      screen.getByRole('textbox', { name: 'Your Translation' }),
    ).toHaveValue(response)
    expect(document.activeElement).toBe(
      screen.getByRole('button', {
        name: 'Submit Final Translation',
      }),
    )
    expect(sessionState().translationFinallySubmitted).toBe(false)
  })

  it('submits once, locks the exact response, and records report-ready session data', async () => {
    render(<TranslationHarness />)
    const response =
      'Exact Capitalization, punctuation & speling.\n\nSecond paragraph.'
    const { user, dialog } = await submitInHarness(response)
    const confirm = within(dialog).getByRole('button', {
      name: 'Submit Final Translation',
    })
    await user.dblClick(confirm)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('textbox', { name: 'Your Translation' }),
    ).not.toBeInTheDocument()
    const submittedResponse =
      screen.getByRole('heading', {
        name: 'Your Submitted Translation',
      }).nextElementSibling
    expect(submittedResponse?.textContent).toBe(response)
    expect(screen.getAllByText('Translation Submitted').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Translation Complete').length).toBeGreaterThan(0)
    expect(sessionState()).toMatchObject({
      studentTranslation: response,
      translationFinallySubmitted: true,
      translationStageStatus: 'complete',
    })
    expect(sessionState().translationSubmittedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T/,
    )

    const reportSnapshot = snapshotLetterIdentificationSession(
      sessionState() as LetterIdentificationSession,
    )
    expect(reportSnapshot.studentTranslation).toBe(response)
    expect(reportSnapshot.translationFinallySubmitted).toBe(true)
    expect(reportSnapshot.translationStageStatus).toBe('complete')
  })

  it('removes editing, comparison, instructor material, checklists, notes, and grading after submission', async () => {
    render(<TranslationHarness />)
    const { user, dialog } = await submitInHarness(
      'A stylistically independent response.',
    )
    await user.click(
      within(dialog).getByRole('button', {
        name: 'Submit Final Translation',
      }),
    )
    expect(
      screen.queryByRole('button', { name: /edit|revise/i }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText(RIB_785_CASE.translation)).not.toBeInTheDocument()
    expect(screen.queryByText('D(IS) M(ANIBUS)')).not.toBeInTheDocument()
    expect(document.body).not.toHaveTextContent(
      /Instructor Reference Translation|Normalized Instructor Reading|Review Translation|Revision Note|content checklist|semantic|score|percentage|pass|fail/i,
    )
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  })

  it('immediately displays all four complete stages and the completed investigation', async () => {
    render(<TranslationHarness />)
    const { user, dialog } = await submitInHarness()
    await user.click(
      within(dialog).getByRole('button', {
        name: 'Submit Final Translation',
      }),
    )
    const summary = screen.getByRole('region', {
      name: 'RIB 785 Investigation Complete',
    })
    expect(summary).toHaveTextContent('Letter Identification — Complete')
    expect(summary).toHaveTextContent('Transcription — Complete')
    expect(summary).toHaveTextContent('Word Segmentation — Complete')
    expect(summary).toHaveTextContent('Translation — Complete')
  })

  it('makes every earlier stage review-only after final submission', async () => {
    const user = await finalizeAppTranslation()
    expect(screen.getByText(/This investigation has been finalized/)).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Letter Identification' }),
    )
    expect(
      screen.getByRole('heading', { name: 'Letter Identification Review' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Select Letter mode' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('textbox', { name: 'Letter label' }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Transcription' }))
    expect(
      screen.getByRole('heading', { name: 'Transcription Review' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('textbox', { name: /transcription/i }),
    ).not.toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Word Segmentation' }),
    )
    expect(
      screen.getByRole('heading', { name: 'Word Segmentation Review' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('textbox', { name: /word segmentation/i }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Translation' }))
    expect(
      screen.getByRole('heading', {
        name: 'Your Submitted Translation',
      }),
    ).toBeInTheDocument()
  }, 20_000)

  it('uses the stronger completed Start Over dialog and Cancel preserves all work', async () => {
    const response = 'Preserve this final response.'
    const user = await finalizeAppTranslation(response)
    await user.click(screen.getByRole('button', { name: 'Start Over' }))
    const dialog = screen.getByRole('dialog', {
      name: 'Start Investigation Over?',
    })
    expect(dialog).toHaveTextContent(
      'permanently clear your submitted translation and all work from this browser session',
    )
    await user.click(
      within(dialog).getByRole('button', { name: 'Cancel' }),
    )
    expect(screen.getByText(response)).toBeInTheDocument()
    expect(
      screen.getByText('RIB 785 Investigation Complete'),
    ).toBeInTheDocument()
  }, 20_000)

  it('confirmed completed Start Over clears every student stage and returns to the beginning', async () => {
    const user = await finalizeAppTranslation('Erase this final response.')
    await user.click(screen.getByRole('button', { name: 'Start Over' }))
    const dialog = screen.getByRole('dialog', {
      name: 'Start Investigation Over?',
    })
    await user.click(
      within(dialog).getByRole('button', {
        name: 'Start Investigation Over',
      }),
    )
    expect(screen.getByText('0 letters selected')).toBeInTheDocument()
    expect(screen.getByText('Translation').closest('li')).toHaveTextContent(
      'Locked',
    )
    expect(
      screen.queryByText('Erase this final response.'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('RIB 785 Investigation Complete'),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start Over' })).toBeDisabled()
  }, 20_000)

  it('keeps pre-submission earlier stages functional and preserves existing Start Over behavior', async () => {
    const user = await completePriorStages()
    expect(
      screen.getByRole('button', { name: 'Check Word Segmentation' }),
    ).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Transcription' }))
    expect(
      screen.getByRole('textbox', { name: 'Line 1 transcription' }),
    ).toBeEnabled()
    expect(window.confirm).toHaveBeenCalled()
  }, 20_000)

  it('keeps permanent instructor data unchanged, tools hidden, and browser storage empty', () => {
    const before = JSON.stringify(RIB_785_CASE)
    render(<TranslationHarness />)
    expect(JSON.stringify(RIB_785_CASE)).toBe(before)
    expect(document.querySelector('a[href*="dev"]')).not.toBeInTheDocument()
    expect(document.body).not.toHaveTextContent(
      /source-code paths|intake documentation/i,
    )
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
  })

  it('provides responsive structures and preserves the GitHub Pages asset base', async () => {
    const { container } = render(<TranslationHarness />)
    expect(
      container.querySelector('.student-translation-evidence'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('img', {
        name: 'RIB 785 funerary inscription for translation',
      }),
    ).toHaveAttribute(
      'src',
      '/herculaneum-ink-lab/cases/RIB%20785/source.png',
    )
    fireEvent.change(
      screen.getByRole('textbox', { name: 'Your Translation' }),
      { target: { value: 'Keyboard response.' } },
    )
    const submit = screen.getByRole('button', {
      name: 'Submit Final Translation',
    })
    submit.focus()
    fireEvent.keyDown(submit, { key: 'Enter' })
    fireEvent.click(submit)
    expect(
      screen.getByRole('dialog', { name: 'Submit Final Translation?' }),
    ).toBeInTheDocument()
  })
})
