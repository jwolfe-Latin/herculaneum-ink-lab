import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { RIB_785_LETTER_REFERENCE } from './content/curated/RIB 785/letterReference'

const diplomaticLines = [
  'D M',
  'CRESCENTINV',
  'S VIXIT ANNIS',
  'XVIII VIDARIS',
  'PATER POSVIT',
]

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
  const reference = RIB_785_LETTER_REFERENCE.regions[0]
  await user.click(
    screen.getByRole('button', { name: 'Select Letter mode' }),
  )
  const layer = screen.getByTestId('letter-region-layer')
  fireEvent.pointerDown(layer, {
    pointerId: 91,
    pointerType: 'pen',
    clientX: reference.x,
    clientY: reference.y,
  })
  fireEvent.pointerMove(layer, {
    pointerId: 91,
    pointerType: 'pen',
    clientX: reference.x + reference.width,
    clientY: reference.y + reference.height,
  })
  fireEvent.pointerUp(layer, {
    pointerId: 91,
    pointerType: 'pen',
    clientX: reference.x + reference.width,
    clientY: reference.y + reference.height,
  })
  await user.type(
    screen.getByRole('textbox', { name: 'Letter label' }),
    'd',
  )
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Line number' }),
    '1',
  )
  await user.click(
    screen.getByRole('button', {
      name: 'Check Letter Identification',
    }),
  )
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  await user.click(
    screen.getByRole('button', {
      name: 'Mark Letter Identification Complete',
    }),
  )
  return user
}

async function openTranscription() {
  const user = await completeLetterIdentification()
  await user.click(screen.getByRole('button', { name: 'Transcription' }))
  return user
}

async function fillLines(
  user: ReturnType<typeof userEvent.setup>,
  lines = diplomaticLines,
) {
  for (const [index, line] of lines.entries()) {
    await user.type(
      screen.getByRole('textbox', {
        name: `Line ${index + 1} transcription`,
      }),
      line,
    )
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  sessionStorage.clear()
  window.history.pushState({}, '', '/')
})

describe('RIB 785 student transcription', () => {
  it('keeps Transcription locked before Letter Identification completion', async () => {
    await openRib785()
    expect(
      screen.queryByRole('button', { name: 'Transcription' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('Transcription').closest('li')).toHaveTextContent(
      'Locked',
    )
  })

  it('unlocks only Transcription after Letter Identification completion', async () => {
    await completeLetterIdentification()
    expect(
      screen.getByRole('button', { name: 'Transcription' }),
    ).toBeEnabled()
    expect(screen.getAllByText('Coming Later')).toHaveLength(2)
  })

  it('shows five labeled fields and keeps checking disabled for blank lines', async () => {
    await openTranscription()
    expect(
      screen.getAllByRole('textbox', { name: /Line \d transcription/ }),
    ).toHaveLength(5)
    expect(
      screen.getByRole('button', { name: 'Check Transcription' }),
    ).toBeDisabled()
    expect(
      screen.getByRole('region', { name: 'Transcription summary' }),
    ).toHaveTextContent('Lines completed0Lines still blank5')
  })

  it('preserves uppercase V, spaces, and abbreviations without autofill', async () => {
    const user = await openTranscription()
    const firstLine = screen.getByRole('textbox', {
      name: 'Line 1 transcription',
    })
    const fifthLine = screen.getByRole('textbox', {
      name: 'Line 5 transcription',
    })
    expect(firstLine).toHaveValue('')
    expect(
      screen.getByRole('complementary', {
        name: 'My Letter Identification review',
      }),
    ).toHaveTextContent('Line 1D')
    await user.type(firstLine, 'd  m')
    await user.type(fifthLine, 'posvit')
    expect(firstLine).toHaveValue('D  M')
    expect(fifthLine).toHaveValue('POSVIT')
  })

  it('reuses the zoomable viewer and hides instructor regions before checking', async () => {
    await openTranscription()
    expect(
      screen.getByRole('img', {
        name: 'RIB 785 funerary inscription for transcription',
      }),
    ).toHaveAttribute(
      'src',
      '/herculaneum-ink-lab/cases/RIB%20785/source.png',
    )
    expect(screen.getByRole('button', { name: 'Zoom In' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Reset View' })).toBeEnabled()
    expect(
      screen.getByRole('button', {
        name: 'Hide My Letter Selections',
      }),
    ).toBeEnabled()
    expect(
      screen.queryByText('Instructor Reference comparison'),
    ).not.toBeInTheDocument()
    expect(
      document.querySelector('[data-reference-region-id]'),
    ).not.toBeInTheDocument()
  })

  it('recognizes exact lines and optional ordinary spacing without a score', async () => {
    const user = await openTranscription()
    await fillLines(user, [
      'D  M',
      'CRESCENTINV',
      'S  VIXIT ANNIS',
      'XVIII VIDARIS',
      'PATER POSVIT',
    ])
    await user.click(
      screen.getByRole('button', { name: 'Check Transcription' }),
    )
    const comparison = screen.getByRole('region', {
      name: 'Your Transcription and Instructor Reference',
    })
    expect(
      within(comparison).getAllByText(/Matches Instructor Reference/),
    ).toHaveLength(5)
    expect(comparison).not.toHaveTextContent('%')
    expect(comparison).not.toHaveTextContent(/grade|score|pass|fail/i)
  })

  it('keeps the instructor transcription hidden until explicitly revealed after checking', async () => {
    const user = await openTranscription()
    await fillLines(user)
    await user.click(
      screen.getByRole('button', { name: 'Check Transcription' }),
    )
    expect(
      screen.getAllByText('Hidden until you choose to show it'),
    ).toHaveLength(5)
    await user.click(
      screen.getByRole('button', { name: 'Show Instructor Reference' }),
    )
    expect(screen.getAllByText('CRESCENTINV')).toHaveLength(2)
    await user.click(
      screen.getByRole('button', { name: 'Hide Instructor Reference' }),
    )
    expect(screen.getAllByText('CRESCENTINV')).toHaveLength(1)
  })

  it('classifies missing, extra, different, and reordered characters by line', async () => {
    const user = await openTranscription()
    await fillLines(user, [
      'D',
      'CRESCENTINVX',
      'S VIXIT ANNIU',
      'XVIII VIDARSI',
      'PATER POSVIT',
    ])
    await user.click(
      screen.getByRole('button', { name: 'Check Transcription' }),
    )
    expect(screen.getByText(/Line 1: Missing Character/)).toBeInTheDocument()
    expect(screen.getByText(/Line 2: Extra Character/)).toBeInTheDocument()
    expect(screen.getByText(/Line 3: Different Character/)).toBeInTheDocument()
    expect(
      screen.getByText(/Line 4: Character Order Difference/),
    ).toBeInTheDocument()
  })

  it('keeps V and U distinct and does not expand D M', async () => {
    const user = await openTranscription()
    await fillLines(user, [
      'DIS MANIBUS',
      'CRESCENTINU',
      'S VIXIT ANNIS',
      'XVIII VIDARIS',
      'PATER POSUIT',
    ])
    await user.click(
      screen.getByRole('button', { name: 'Check Transcription' }),
    )
    expect(screen.getByText(/Line 1: Extra Character/)).toBeInTheDocument()
    expect(screen.getByText(/Line 2: Different Character/)).toBeInTheDocument()
    expect(screen.getByText(/Line 5: Different Character/)).toBeInTheDocument()
  })

  it('allows revision and rechecking to update the comparison', async () => {
    const user = await openTranscription()
    await fillLines(user, [
      ...diplomaticLines.slice(0, 4),
      'PATER POSUIT',
    ])
    await user.click(
      screen.getByRole('button', { name: 'Check Transcription' }),
    )
    expect(screen.getByText(/Line 5: Different Character/)).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: 'Return to Editing' }),
    )
    const lineFive = screen.getByRole('textbox', {
      name: 'Line 5 transcription',
    })
    await user.clear(lineFive)
    await user.type(lineFive, 'PATER POSVIT')
    expect(screen.getByText(/transcription changed/i)).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: 'Check Transcription' }),
    )
    expect(
      screen.getByText(/Line 5: Matches Instructor Reference/),
    ).toBeInTheDocument()
  })

  it('requires a current check and confirms completion with unresolved differences', async () => {
    const user = await openTranscription()
    const finish = screen.getByRole('button', {
      name: 'Mark Transcription Complete',
    })
    expect(finish).toBeDisabled()
    await fillLines(user, [
      ...diplomaticLines.slice(0, 4),
      'PATER POSUIT',
    ])
    await user.click(
      screen.getByRole('button', { name: 'Check Transcription' }),
    )
    expect(finish).toBeEnabled()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await user.click(finish)
    expect(confirm).toHaveBeenCalledWith(
      'Finish this stage with remaining differences?',
    )
    expect(screen.queryByText('Transcription Complete')).not.toBeInTheDocument()
    confirm.mockReturnValue(true)
    await user.click(finish)
    expect(screen.getAllByText('Transcription Complete').length).toBeGreaterThan(
      0,
    )
    expect(screen.getAllByText('Coming Later')).toHaveLength(2)
  })

  it('clears letter and transcription work with case-level Start Over', async () => {
    const user = await openTranscription()
    await fillLines(user)
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    await user.click(screen.getByRole('button', { name: 'Start Over' }))
    expect(confirm).toHaveBeenCalledWith(
      'Start over? This clears all of your RIB 785 investigation work.',
    )
    expect(screen.getByText('0 letters selected')).toBeInTheDocument()
    expect(screen.getByText('Transcription').closest('li')).toHaveTextContent(
      'Locked',
    )
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
  })

  it('keeps developer tools absent and the permanent reference unchanged', async () => {
    const referenceBefore = JSON.stringify(RIB_785_LETTER_REFERENCE)
    await openTranscription()
    expect(document.querySelector('a[href*="dev"]')).not.toBeInTheDocument()
    expect(JSON.stringify(RIB_785_LETTER_REFERENCE)).toBe(referenceBefore)
  })
})
